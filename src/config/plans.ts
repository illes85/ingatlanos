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
