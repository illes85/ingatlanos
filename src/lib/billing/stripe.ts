import Stripe from "stripe";
import { CREDIT_PACKS, isPaidPlan, normalizeSeats, quotePlan, type BillingInterval, type CreditPackId, type PaidPlan } from "@/config/plans";
import { publicEnv } from "@/lib/env";
import type { BillingEvent, BillingProvider, CheckoutContext, CheckoutRequest } from "./types";

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  /** Opcionális: a Stripe-ban előre létrehozott 27%-os ÁFA-kulcs azonosítója (D-037). */
  taxRateId: string | null;
}

/** A Stripe HUF-ot kétjegyű pénznemként kezeli: az összeg forint × 100. TODO(integráció): teszt módban ellenőrizd az első fizetésnél. */
const toMinorUnits = (huf: number) => huf * 100;

const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

function periodOf(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  return { start: iso(item?.current_period_start), end: iso(item?.current_period_end) };
}

function mapStatus(status: Stripe.Subscription.Status): "active" | "past_due" | "canceled" | "incomplete" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled") return "canceled";
  return "incomplete";
}

export function createStripeBilling(config: StripeConfig): BillingProvider {
  const stripe = new Stripe(config.secretKey);
  const taxRates = config.taxRateId ? [config.taxRateId] : undefined;
  const returnBase = `${publicEnv.siteUrl}/csomagok`;

  function subscriptionLine(request: Extract<CheckoutRequest, { kind: "subscription" }>) {
    const seats = normalizeSeats(request.plan, request.seats);
    const quote = quotePlan(request.plan, request.interval, seats);
    return {
      quantity: 1,
      tax_rates: taxRates,
      price_data: {
        currency: "huf",
        unit_amount: toMinorUnits(quote.netPeriod),
        recurring: { interval: request.interval },
        product_data: { name: `Kulcs ${request.plan}${request.plan === "office" ? ` (${seats} fő)` : ""}` },
      },
    };
  }

  return {
    mode: "stripe",

    async createCheckout(ctx: CheckoutContext, request: CheckoutRequest) {
      const common = {
        client_reference_id: ctx.organizationId,
        success_url: `${returnBase}?fizetes=sikeres`,
        cancel_url: `${returnBase}?fizetes=megszakitva`,
        ...(ctx.customerId ? { customer: ctx.customerId } : ctx.customerEmail ? { customer_email: ctx.customerEmail } : {}),
      };
      if (request.kind === "subscription") {
        const seats = normalizeSeats(request.plan, request.seats);
        const metadata = { organization_id: ctx.organizationId, kind: "subscription", plan: request.plan, interval: request.interval, seats: String(seats) };
        const session = await stripe.checkout.sessions.create({
          ...common,
          mode: "subscription",
          line_items: [subscriptionLine(request)],
          metadata,
          subscription_data: { metadata },
        });
        if (!session.url) throw new Error("A Stripe nem adott fizetési címet.");
        return { type: "redirect" as const, url: session.url };
      }
      const pack = CREDIT_PACKS.find((p) => p.id === request.packId);
      if (!pack) throw new Error("Ismeretlen kreditcsomag.");
      const session = await stripe.checkout.sessions.create({
        ...common,
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            tax_rates: taxRates,
            price_data: { currency: "huf", unit_amount: toMinorUnits(pack.netPrice), product_data: { name: `Kulcs AI kredit (${pack.credits})` } },
          },
        ],
        metadata: { organization_id: ctx.organizationId, kind: "credits", pack_id: pack.id },
      });
      if (!session.url) throw new Error("A Stripe nem adott fizetési címet.");
      return { type: "redirect" as const, url: session.url };
    },

    async cancelAtPeriodEnd(subscriptionId: string) {
      await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    },

    parseWebhook(rawBody: string, signature: string | null): BillingEvent {
      if (!signature) throw new Error("Hiányzó Stripe-aláírás.");
      // Az aláírást a nyers, módosítatlan törzsön ellenőrzi; hibás vagy lejárt aláírásnál kivételt dob.
      const event = stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret);
      return normalizeEvent(event);
    },
  };
}

/** Egységtesztelhető: a Stripe-esemény → szolgáltatófüggetlen esemény. */
export function normalizeEvent(event: Stripe.Event): BillingEvent {
  const eventId = event.id;
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      const meta = s.metadata ?? {};
      const organizationId = meta.organization_id || s.client_reference_id;
      if (!organizationId || s.payment_status !== "paid") return { type: "ignored", eventId };
      if (meta.kind === "credits") {
        const pack = CREDIT_PACKS.find((p) => p.id === meta.pack_id);
        return pack ? { type: "credits.purchased", eventId, organizationId, packId: pack.id as CreditPackId } : { type: "ignored", eventId };
      }
      const plan = meta.plan as PaidPlan;
      const interval = meta.interval as BillingInterval;
      if (meta.kind !== "subscription" || !isPaidPlan(plan) || (interval !== "month" && interval !== "year")) {
        return { type: "ignored", eventId };
      }
      return {
        type: "subscription.activated",
        eventId,
        organizationId,
        plan,
        interval,
        seats: normalizeSeats(plan, Number(meta.seats)),
        customerId: typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null),
        subscriptionId: typeof s.subscription === "string" ? s.subscription : (s.subscription?.id ?? null),
        // Az időszak a customer.subscription.updated eseménnyel pontosodik.
        periodStart: null,
        periodEnd: null,
      };
    }
    case "invoice.paid": {
      const inv = event.data.object;
      const sub = inv.parent?.subscription_details?.subscription;
      const subscriptionId = typeof sub === "string" ? sub : sub?.id;
      // Az első számla jóváírását a checkout.session.completed végzi (nehogy duplán járjon).
      if (!subscriptionId || inv.billing_reason !== "subscription_cycle") return { type: "ignored", eventId };
      const line = inv.lines.data[0];
      return { type: "subscription.renewed", eventId, subscriptionId, periodStart: iso(line?.period?.start), periodEnd: iso(line?.period?.end) };
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      return { type: "subscription.updated", eventId, subscriptionId: sub.id, status: mapStatus(sub.status), cancelAtPeriodEnd: sub.cancel_at_period_end, periodEnd: periodOf(sub).end };
    }
    case "customer.subscription.deleted":
      return { type: "subscription.ended", eventId, subscriptionId: event.data.object.id };
    default:
      return { type: "ignored", eventId };
  }
}
