import "server-only";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/session";

export interface BillingOverview {
  subscription: {
    plan: "pro" | "pro_ai" | "office";
    interval: "month" | "year";
    seats: number;
    provider: "mock" | "stripe";
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  ledger: { id: string; createdAt: string; delta: number; reason: string }[];
  activeListings: number;
}

/** Aktív (hirdetett) ingatlan: az `app.is_listing_active()` státuszlistájával egyezik (D-038). */
const ACTIVE_STATUSES = ["active", "under_offer", "reserved"] as const;

export async function getBillingOverview(ctx: AppContext): Promise<BillingOverview> {
  const supabase = await createClient();
  const isOwner = ctx.role === "owner";

  // Az előfizetést és a kreditnaplót csak az owner olvashatja (RLS); másnak üres marad.
  const [sub, ledger, listings] = await Promise.all([
    isOwner
      ? supabase
          .from("subscriptions")
          .select("plan, billing_interval, seats, provider, current_period_end, cancel_at_period_end")
          .in("status", ["active", "past_due"])
          .maybeSingle()
      : Promise.resolve({ data: null }),
    isOwner
      ? supabase.from("credit_ledger").select("id, created_at, delta, reason").order("created_at", { ascending: false }).limit(15)
      : Promise.resolve({ data: [] }),
    // A számláló a szervezet összes aktív ingatlanát nézi (a más ügynök privát ingatlana is beleszámít a limitbe).
    createAdminClient()
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organization.id)
      .in("status", [...ACTIVE_STATUSES]),
  ]);

  const s = sub.data;
  return {
    subscription: s
      ? {
          plan: s.plan as "pro" | "pro_ai" | "office",
          interval: s.billing_interval,
          seats: s.seats,
          provider: s.provider,
          periodEnd: s.current_period_end,
          cancelAtPeriodEnd: s.cancel_at_period_end,
        }
      : null,
    ledger: (ledger.data ?? []).map((l) => ({ id: l.id, createdAt: l.created_at, delta: l.delta, reason: l.reason })),
    activeListings: listings.count ?? 0,
  };
}
