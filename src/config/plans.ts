import type { PlanTier } from "@/lib/auth/session";

/**
 * Csomagok és funkciójogosultságok — központi konfiguráció (spec 4/2, 8. fejezet).
 * A 0. fázisban csak a funkciólista és a csomag→funkció leképezés él; a FeatureGate,
 * a requireFeature() és a limitek a 2. fázisban épülnek erre.
 */
export const FEATURES = [
  "ai.listing_writer",
  "ai.buyer_matching",
  "ai.buyer_matching_reasons",
  "ai.valuation_report",
  "ai.listing_presentation",
  "ai.lead_scoring",
  "ai.call_list",
  "ai.voice_notes",
  "ai.followup_sequences",
  "ai.assistant",
  "office.analytics",
  "office.commission_rules",
  "office.lead_routing",
  "office.pmt",
  "branding.custom",
] as const;

export type Feature = (typeof FEATURES)[number];

const AI_PRO: Feature[] = [
  "ai.listing_writer",
  "ai.buyer_matching",
  "ai.buyer_matching_reasons",
  "ai.valuation_report",
  "ai.listing_presentation",
  "ai.lead_scoring",
  "ai.call_list",
  "ai.voice_notes",
  "ai.followup_sequences",
  "ai.assistant",
  "branding.custom",
];

export const PLAN_FEATURES: Record<PlanTier, readonly Feature[]> = {
  start: ["ai.listing_writer"],
  pro: ["ai.listing_writer", "ai.buyer_matching", "branding.custom"],
  pro_ai: AI_PRO,
  office: [...AI_PRO, "office.analytics", "office.commission_rules", "office.lead_routing", "office.pmt"],
};

export const PLAN_LIMITS: Record<PlanTier, { activeListings: number | null; aiCreditsMonthly: number }> = {
  start: { activeListings: 15, aiCreditsMonthly: 10 },
  pro: { activeListings: null, aiCreditsMonthly: 50 },
  pro_ai: { activeListings: null, aiCreditsMonthly: 400 },
  office: { activeListings: null, aiCreditsMonthly: 300 },
};

export function planHasFeature(plan: PlanTier, feature: Feature): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

// ---------------------------------------------------------------------------
// Árazás (spec 8. fejezet). Az árak nettó Ft/hó-ban értendők; ide kell nyúlni, ha változnak.
// ---------------------------------------------------------------------------

export type BillingInterval = "month" | "year";

/** Fizethető csomagok (a Start ingyenes). */
export const PAID_PLANS = ["pro", "pro_ai", "office"] as const satisfies readonly PlanTier[];
export type PaidPlan = (typeof PAID_PLANS)[number];

export const PLAN_ORDER: readonly PlanTier[] = ["start", "pro", "pro_ai", "office"];

/** Magyar általános forgalmi adó (D-037: a felületen nettó + ÁFA = bruttó). */
export const VAT_RATE = 0.27;

/** Éves fizetésnél a havi díjra adott kedvezmény. */
export const YEARLY_DISCOUNT = 0.2;

/** Nettó havi árak. Az Iroda csomag: platformdíj + fejenként. */
export const PLAN_PRICING: Record<PlanTier, { monthly: number; perSeat: number | null }> = {
  start: { monthly: 0, perSeat: null },
  pro: { monthly: 7_900, perSeat: null },
  pro_ai: { monthly: 24_900, perSeat: null },
  office: { monthly: 9_900, perSeat: 14_900 },
};

/** Vásárolható kreditcsomagok (nettó Ft). A vásárolt kredit nem jár le (D-038). */
export const CREDIT_PACKS = [
  { id: "credits_200", credits: 200, netPrice: 4_900 },
  { id: "credits_600", credits: 600, netPrice: 12_900 },
] as const;
export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

export const MIN_OFFICE_SEATS = 1;
export const MAX_OFFICE_SEATS = 200;

export function isPaidPlan(plan: PlanTier): plan is PaidPlan {
  return (PAID_PLANS as readonly PlanTier[]).includes(plan);
}

export function normalizeSeats(plan: PlanTier, seats: number | null | undefined): number {
  if (plan !== "office") return 1;
  const n = Math.trunc(Number(seats));
  if (!Number.isFinite(n)) return MIN_OFFICE_SEATS;
  return Math.min(MAX_OFFICE_SEATS, Math.max(MIN_OFFICE_SEATS, n));
}

export interface PriceQuote {
  /** Nettó havi díj a kedvezmény után (éves fizetésnél a havi egyenérték). */
  netMonthly: number;
  /** Nettó összeg a számlázási időszakra (hó vagy év). */
  netPeriod: number;
  vatPeriod: number;
  grossPeriod: number;
}

/** Nettó havi díj kedvezmény nélkül (az Iroda csomagnál férőhelyszámmal). */
export function listMonthlyNet(plan: PlanTier, seats = 1): number {
  const p = PLAN_PRICING[plan];
  return p.monthly + (p.perSeat ?? 0) * normalizeSeats(plan, seats);
}

export function quotePlan(plan: PlanTier, interval: BillingInterval, seats = 1): PriceQuote {
  const list = listMonthlyNet(plan, seats);
  const netMonthly = interval === "year" ? Math.round(list * (1 - YEARLY_DISCOUNT)) : list;
  const netPeriod = interval === "year" ? netMonthly * 12 : netMonthly;
  const vatPeriod = Math.round(netPeriod * VAT_RATE);
  return { netMonthly, netPeriod, vatPeriod, grossPeriod: netPeriod + vatPeriod };
}

export function quoteCreditPack(netPrice: number): { net: number; vat: number; gross: number } {
  const vat = Math.round(netPrice * VAT_RATE);
  return { net: netPrice, vat, gross: netPrice + vat };
}

/** Havi kreditkeret: az Iroda csomagnál fejenként (spec 8). */
export function monthlyCreditAllowance(plan: PlanTier, seats = 1): number {
  const base = PLAN_LIMITS[plan].aiCreditsMonthly;
  return plan === "office" ? base * normalizeSeats(plan, seats) : base;
}

/** Az a legkisebb csomag, amelyben a funkció elérhető (a zárolt kártya ezt ajánlja). */
export function minimumPlanFor(feature: Feature): PlanTier {
  return PLAN_ORDER.find((p) => planHasFeature(p, feature)) ?? "office";
}

/** Aktív ingatlan limit; null = korlátlan. Az adatbázisban az `app.plan_limit()` tükrözi (tartsd szinkronban). */
export function activeListingLimit(plan: PlanTier): number | null {
  return PLAN_LIMITS[plan].activeListings;
}
