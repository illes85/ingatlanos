"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CREDIT_PACKS, PAID_PLANS, listMonthlyNet, normalizeSeats, type CreditPackId } from "@/config/plans";
import { serverEnv } from "@/lib/env";
import { requireAppContext, type AppContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import { getBilling } from "@/lib/billing";
import { detUuid } from "@/lib/billing/ids";
import type { BillingProvider, CheckoutContext } from "@/lib/billing";
import { randomUUID } from "node:crypto";

const BACK = "/csomagok";
const done = (result: string): never => {
  revalidatePath(BACK);
  revalidatePath("/", "layout");
  redirect(`${BACK}?fizetes=${result}`);
};

const subscriptionSchema = z.object({
  plan: z.enum(PAID_PLANS),
  interval: z.enum(["month", "year"]),
  seats: z.coerce.number().int().min(1).max(200).default(1),
});

/**
 * A fizetési műveleteket csak az owner végezheti. A MOCK szimuláció élesben csak demó módban ÉS demó szervezetnél engedett
 * (különben bárki ingyen csomagot és kreditet kapna; D-037).
 */
async function authorize(): Promise<{ ctx: AppContext; billing: BillingProvider } | null> {
  const ctx = await requireAppContext();
  if (ctx.role !== "owner") return null;
  const billing = getBilling();
  if (billing.mode === "mock" && process.env.NODE_ENV === "production" && !(serverEnv().demoMode && ctx.organization.isDemo)) return null;
  return { ctx, billing };
}

async function checkoutContext(ctx: AppContext): Promise<CheckoutContext> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("organization_id", ctx.organization.id)
    .eq("provider", "stripe")
    .not("provider_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    organizationId: ctx.organization.id,
    organizationName: ctx.organization.name,
    customerEmail: ctx.email,
    customerId: data?.provider_customer_id ?? null,
  };
}

async function liveSubscription(organizationId: string) {
  const { data } = await createAdminClient()
    .from("subscriptions")
    .select("id, status, plan, billing_interval, seats, provider, provider_subscription_id, provider_customer_id, current_period_start, current_period_end, cancel_at_period_end")
    .eq("organization_id", organizationId)
    .in("status", ["active", "past_due", "incomplete"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function closeSubscription(organizationId: string, sub: NonNullable<Awaited<ReturnType<typeof liveSubscription>>>) {
  const { error } = await createAdminClient().rpc("apply_plan_change", {
    p_org: organizationId,
    p_plan: sub.plan,
    p_interval: sub.billing_interval,
    p_seats: sub.seats,
    p_status: "canceled",
    p_provider: sub.provider,
    p_provider_subscription_id: sub.provider_subscription_id ?? undefined,
  });
  if (error) throw new Error(error.message);
}

/** Csomagválasztás: új előfizetés (Stripe-fizetőoldal / MOCK) vagy meglévő módosítása. */
export async function startSubscription(formData: FormData): Promise<void> {
  const parsed = subscriptionSchema.safeParse(Object.fromEntries(formData));
  const auth = await authorize();
  if (!parsed.success || !auth) return done("hiba");
  const { ctx, billing } = auth;
  const { plan, interval } = parsed.data;
  const seats = normalizeSeats(plan, parsed.data.seats);
  const request = { kind: "subscription", plan, interval, seats } as const;

  try {
    let existing = await liveSubscription(ctx.organization.id);
    if (existing && existing.status === "incomplete" && existing.provider === "stripe") return done("hiba"); // folyamatban lévő fizetés (pl. 3DS)
    // Üzemmód-váltás után maradt MOCK előfizetést előbb lezárjuk, hogy ne kerüljön két élő előfizetés a szervezetre.
    if (existing && existing.provider !== billing.mode) {
      await closeSubscription(ctx.organization.id, existing);
      existing = null;
    }
    if (existing && existing.plan === plan && existing.billing_interval === interval && existing.seats === seats && !existing.cancel_at_period_end) {
      return done("sikeres");
    }

    if (billing.mode === "mock") {
      const { error } = await createAdminClient().rpc("apply_plan_change", {
        p_org: ctx.organization.id,
        p_plan: plan,
        p_interval: interval,
        p_seats: seats,
        p_status: "active",
        p_provider: "mock",
        // Ugyanaz az előfizetés frissül (nem jön létre második); az időszak váltáskor újraindul.
        p_provider_subscription_id: existing?.provider === "mock" ? (existing.provider_subscription_id ?? undefined) : undefined,
        p_period_start: new Date().toISOString(),
        p_period_end: new Date(Date.now() + (interval === "year" ? 365 : 30) * 86_400_000).toISOString(),
      });
      if (error) throw new Error(error.message);
      return done("sikeres");
    }

    if (existing?.provider === "stripe" && existing.provider_subscription_id) {
      const chargeNow = listMonthlyNet(plan, seats) >= listMonthlyNet(existing.plan, existing.seats) || existing.billing_interval !== interval;
      await billing.changeSubscription(existing.provider_subscription_id, request, chargeNow);
      return done("sikeres");
    }
    const result = await billing.createCheckout(await checkoutContext(ctx), request);
    if (result.type === "redirect") redirect(result.url);
  } catch (error) {
    // A redirect() kivétel, amit tovább kell engedni.
    if (error instanceof Error && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) throw error;
    return done("hiba");
  }
  return done("hiba");
}

/** Kreditcsomag vásárlása (egyszeri fizetés). A vásárolt kredit nem jár le. */
export async function buyCredits(formData: FormData): Promise<void> {
  const packId = String(formData.get("pack") ?? "") as CreditPackId;
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  const auth = await authorize();
  if (!pack || !auth) return done("hiba");
  const { ctx, billing } = auth;

  try {
    if (billing.mode === "mock") {
      const { error } = await createAdminClient().rpc("grant_credits", {
        p_org: ctx.organization.id,
        p_amount: pack.credits,
        p_reason: "purchase",
        p_ref_id: detUuid(`mock:purchase:${randomUUID()}`),
        p_created_by: ctx.userId,
      });
      if (error) throw new Error(error.message);
      return done("kredit");
    }
    const result = await billing.createCheckout(await checkoutContext(ctx), { kind: "credits", packId });
    if (result.type === "redirect") redirect(result.url);
  } catch (error) {
    if (error instanceof Error && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) throw error;
    return done("hiba");
  }
  return done("hiba");
}

/** Lemondás az időszak végére: addig a csomag használható marad (D-039). */
export async function cancelSubscription(): Promise<void> {
  const auth = await authorize();
  if (!auth) return done("hiba");
  const { ctx, billing } = auth;

  let ok = false;
  try {
    const sub = await liveSubscription(ctx.organization.id);
    if (sub?.provider === "stripe" && sub.provider_subscription_id) {
      // A végleges állapotot a Stripe-webhook hozza (a helyi óra szerinti írás eldobhatná a későbbi eseményt).
      await billing.cancelAtPeriodEnd(sub.provider_subscription_id);
      ok = true;
    } else if (sub) {
      const { error } = await createAdminClient().rpc("apply_plan_change", {
        p_org: ctx.organization.id,
        p_plan: sub.plan,
        p_interval: sub.billing_interval,
        p_seats: sub.seats,
        p_status: sub.status === "past_due" ? "past_due" : "active",
        p_provider: sub.provider,
        p_provider_subscription_id: sub.provider_subscription_id ?? undefined,
        p_period_start: sub.current_period_start ?? undefined,
        p_period_end: sub.current_period_end ?? undefined,
        p_cancel_at_period_end: true,
      });
      ok = !error;
    }
  } catch {
    ok = false;
  }
  return done(ok ? "lemondva" : "hiba");
}
