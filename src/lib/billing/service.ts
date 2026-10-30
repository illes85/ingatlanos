import "server-only";
import { CREDIT_PACKS } from "@/config/plans";
import { createAdminClient } from "@/lib/supabase/server";
import { detUuid } from "./ids";
import type { BillingEvent } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

/** Egy webhook-esemény idempotens feldolgozása. Hibánál kivételt dob (a Stripe újrapróbálja). */
export async function processBillingEvent(event: BillingEvent): Promise<"processed" | "duplicate" | "ignored"> {
  if (event.type === "ignored") return "ignored";
  const admin = createAdminClient();

  // Először rögzítjük az eseményt; a (provider, event_id) egyedi, így az ismétlés felismerhető.
  await admin
    .from("billing_events")
    .upsert({ provider: "stripe", event_id: event.eventId, type: event.type }, { onConflict: "provider,event_id", ignoreDuplicates: true });
  const { data: row, error: readError } = await admin
    .from("billing_events")
    .select("id, processed_at")
    .eq("provider", "stripe")
    .eq("event_id", event.eventId)
    .single();
  fail(readError);
  if (row?.processed_at) return "duplicate";

  try {
    const organizationId = await applyEvent(admin, event);
    await admin
      .from("billing_events")
      .update({ processed_at: new Date().toISOString(), last_error: null, organization_id: organizationId })
      .eq("id", row!.id);
    return "processed";
  } catch (error) {
    await admin
      .from("billing_events")
      .update({ last_error: error instanceof Error ? error.message.slice(0, 500) : "ismeretlen hiba" })
      .eq("id", row!.id);
    throw error;
  }
}

async function findSubscription(admin: Admin, subscriptionId: string) {
  const { data, error } = await admin
    .from("subscriptions")
    .select("organization_id, plan, billing_interval, seats, provider_customer_id, current_period_start, current_period_end, cancel_at_period_end, status")
    .eq("provider", "stripe")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();
  fail(error);
  // Ha még nincs sor (a checkout-esemény később érkezik), hibát dobunk: a Stripe újraküldi.
  if (!data) throw new Error("Ismeretlen előfizetés; az aktiváló esemény még nem érkezett meg.");
  return data;
}

async function applyEvent(admin: Admin, event: Exclude<BillingEvent, { type: "ignored" }>): Promise<string | null> {
  switch (event.type) {
    case "subscription.activated": {
      const { error } = await admin.rpc("apply_plan_change", {
        p_org: event.organizationId,
        p_plan: event.plan,
        p_interval: event.interval,
        p_seats: event.seats,
        p_status: "active",
        p_provider: "stripe",
        p_provider_customer_id: event.customerId ?? undefined,
        p_provider_subscription_id: event.subscriptionId ?? undefined,
        p_period_start: event.periodStart ?? undefined,
        p_period_end: event.periodEnd ?? undefined,
      });
      fail(error);
      return event.organizationId;
    }
    case "subscription.renewed":
    case "subscription.updated":
    case "subscription.ended": {
      const sub = await findSubscription(admin, event.subscriptionId);
      const status =
        event.type === "subscription.ended" ? "canceled" : event.type === "subscription.updated" ? event.status : "active";
      const { error } = await admin.rpc("apply_plan_change", {
        p_org: sub.organization_id,
        p_plan: (event.type === "subscription.updated" && event.plan) || sub.plan,
        p_interval: (event.type === "subscription.updated" && event.interval) || sub.billing_interval,
        p_seats: (event.type === "subscription.updated" && event.seats) || sub.seats,
        p_status: status,
        p_provider: "stripe",
        p_provider_subscription_id: event.subscriptionId,
        p_period_start: ("periodStart" in event ? event.periodStart : null) ?? undefined,
        p_period_end: ("periodEnd" in event ? event.periodEnd : null) ?? undefined,
        p_cancel_at_period_end: event.type === "subscription.updated" ? event.cancelAtPeriodEnd : sub.cancel_at_period_end,
      });
      fail(error);
      return sub.organization_id;
    }
    case "credits.purchased": {
      const pack = CREDIT_PACKS.find((p) => p.id === event.packId);
      if (!pack) throw new Error("Ismeretlen kreditcsomag.");
      const { error } = await admin.rpc("grant_credits", {
        p_org: event.organizationId,
        p_amount: pack.credits,
        p_reason: "purchase",
        p_ref_id: detUuid(`stripe:event:${event.eventId}`),
      });
      fail(error);
      return event.organizationId;
    }
  }
}
