import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { detUuid } from "@/lib/billing/ids";
import { createStripeBilling, normalizeEvent } from "@/lib/billing/stripe";

const ev = (type: string, object: unknown, id = "evt_1") => ({ id, type, data: { object } }) as unknown as Stripe.Event;

describe("detUuid", () => {
  it("egyezik az SQL app.det_uuid() kimenetével", () => {
    // select app.det_uuid('monthly:abc:2026-10') az adatbázisban
    expect(detUuid("monthly:abc:2026-10")).toBe("054fd3cc-36ce-4ac4-2f63-c77313e60f2c");
  });
  it("determinisztikus, és kulcsonként különbözik", () => {
    expect(detUuid("a")).toBe(detUuid("a"));
    expect(detUuid("a")).not.toBe(detUuid("b"));
  });
});

describe("Stripe-események normalizálása", () => {
  const org = "11111111-1111-1111-1111-111111111111";

  it("fizetett előfizetés-checkout → aktiválás", () => {
    const e = normalizeEvent(
      ev("checkout.session.completed", {
        payment_status: "paid",
        client_reference_id: org,
        customer: "cus_1",
        subscription: "sub_1",
        metadata: { organization_id: org, kind: "subscription", plan: "office", interval: "year", seats: "4" },
      }),
    );
    expect(e).toMatchObject({ type: "subscription.activated", organizationId: org, plan: "office", interval: "year", seats: 4, customerId: "cus_1", subscriptionId: "sub_1" });
  });

  it("nem fizetett checkout figyelmen kívül marad", () => {
    expect(normalizeEvent(ev("checkout.session.completed", { payment_status: "unpaid", metadata: { organization_id: org, kind: "subscription", plan: "pro", interval: "month" } })).type).toBe("ignored");
  });

  it("ismeretlen vagy start csomag nem aktiválható", () => {
    const meta = { organization_id: org, kind: "subscription", interval: "month" };
    expect(normalizeEvent(ev("checkout.session.completed", { payment_status: "paid", metadata: { ...meta, plan: "start" } })).type).toBe("ignored");
    expect(normalizeEvent(ev("checkout.session.completed", { payment_status: "paid", metadata: { ...meta, plan: "admin" } })).type).toBe("ignored");
  });

  it("kreditcsomag-vásárlás", () => {
    const e = normalizeEvent(ev("checkout.session.completed", { payment_status: "paid", metadata: { organization_id: org, kind: "credits", pack_id: "credits_200" } }));
    expect(e).toMatchObject({ type: "credits.purchased", organizationId: org, packId: "credits_200" });
    expect(normalizeEvent(ev("checkout.session.completed", { payment_status: "paid", metadata: { organization_id: org, kind: "credits", pack_id: "credits_999999" } })).type).toBe("ignored");
  });

  it("az első számla nem ír jóvá külön (az aktiválás teszi)", () => {
    const inv = (reason: string) => ({ billing_reason: reason, parent: { subscription_details: { subscription: "sub_1" } }, lines: { data: [{ period: { start: 1_700_000_000, end: 1_702_600_000 } }] } });
    expect(normalizeEvent(ev("invoice.paid", inv("subscription_create"))).type).toBe("ignored");
    expect(normalizeEvent(ev("invoice.paid", inv("subscription_cycle")))).toMatchObject({ type: "subscription.renewed", subscriptionId: "sub_1" });
  });

  it("előfizetés-frissítés: státusz és lemondás", () => {
    const sub = (status: string, cancel: boolean) => ({ id: "sub_1", status, cancel_at_period_end: cancel, metadata: {}, items: { data: [{ current_period_end: 1_702_600_000 }] } });
    expect(normalizeEvent(ev("customer.subscription.updated", sub("trialing", false)))).toMatchObject({ status: "active", cancelAtPeriodEnd: false });
    expect(normalizeEvent(ev("customer.subscription.updated", sub("past_due", true)))).toMatchObject({ status: "past_due", cancelAtPeriodEnd: true });
    expect(normalizeEvent(ev("customer.subscription.deleted", { id: "sub_1" }))).toMatchObject({ type: "subscription.ended", subscriptionId: "sub_1" });
  });

  it("csomagváltás a metaadatból; hamis metaadat nem fogadható el", () => {
    const ok = normalizeEvent(ev("customer.subscription.updated", { id: "s", status: "active", cancel_at_period_end: false, metadata: { plan: "pro_ai", interval: "month", seats: "9" }, items: { data: [] } }));
    expect(ok).toMatchObject({ plan: "pro_ai", interval: "month", seats: 1 });
    const bad = normalizeEvent(ev("customer.subscription.updated", { id: "s", status: "active", cancel_at_period_end: false, metadata: { plan: "start", interval: "month" }, items: { data: [] } }));
    expect(bad).not.toHaveProperty("plan");
  });

  it("az esemény ideje átkerül a normalizált eseménybe (sorrenden kívüli események ellen)", () => {
    const e = normalizeEvent({ ...ev("customer.subscription.deleted", { id: "sub_1" }), created: 1_700_000_000 } as unknown as Stripe.Event);
    expect(e.createdAt).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it("az „unpaid” előfizetés nem ad jogosultságot", () => {
    const e = normalizeEvent(ev("customer.subscription.updated", { id: "s", status: "unpaid", cancel_at_period_end: false, metadata: {}, items: { data: [] } }));
    expect(e).toMatchObject({ type: "subscription.updated" });
    expect((e as { status: string }).status).not.toBe("active");
    expect((e as { status: string }).status).not.toBe("past_due");
  });

  it("ismeretlen eseménytípus figyelmen kívül marad", () => {
    expect(normalizeEvent(ev("charge.refunded", {})).type).toBe("ignored");
  });
});

describe("webhook-aláírás", () => {
  const secret = "whsec_test_secret";
  const billing = createStripeBilling({ secretKey: "sk_test_x", webhookSecret: secret, taxRateId: null });
  const payload = JSON.stringify({ id: "evt_9", object: "event", type: "customer.subscription.deleted", data: { object: { id: "sub_9" } } });
  const stripe = new Stripe("sk_test_x");

  it("érvényes aláírást elfogad", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(billing.parseWebhook(payload, header)).toMatchObject({ type: "subscription.ended", subscriptionId: "sub_9" });
  });

  it("hibás titokkal, módosított törzzsel és hiányzó fejléccel elutasít", () => {
    const wrong = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_masik" });
    expect(() => billing.parseWebhook(payload, wrong)).toThrow();
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(() => billing.parseWebhook(payload.replace("sub_9", "sub_8"), header)).toThrow();
    expect(() => billing.parseWebhook(payload, null)).toThrow();
  });
});
