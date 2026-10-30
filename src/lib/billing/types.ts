import type { BillingInterval, CreditPackId, PaidPlan } from "@/config/plans";

/** Cserélhető fizetési réteg (D-020): MOCK kulcsok nélkül, Stripe a .env.local kulcsaival. */
export type BillingMode = "mock" | "stripe";

export interface CheckoutContext {
  organizationId: string;
  organizationName: string;
  customerEmail: string | null;
  /** A stripe-ügyfél azonosítója, ha a szervezetnek már van. */
  customerId: string | null;
}

export type CheckoutRequest =
  | { kind: "subscription"; plan: PaidPlan; interval: BillingInterval; seats: number }
  | { kind: "credits"; packId: CreditPackId };

export type CheckoutResult =
  /** A böngészőt a szolgáltató fizetőoldalára kell irányítani. */
  | { type: "redirect"; url: string }
  /** MOCK: nincs külső fizetés, a hívó azonnal alkalmazza a változást. */
  | { type: "simulated" };

/** A webhookból normalizált, szolgáltatófüggetlen esemény; az alkalmazás ezt dolgozza fel. */
export type BillingEvent =
  | {
      type: "subscription.activated";
      eventId: string;
      organizationId: string;
      plan: PaidPlan;
      interval: BillingInterval;
      seats: number;
      customerId: string | null;
      subscriptionId: string | null;
      periodStart: string | null;
      periodEnd: string | null;
    }
  | {
      type: "subscription.renewed";
      eventId: string;
      subscriptionId: string;
      periodStart: string | null;
      periodEnd: string | null;
    }
  | {
      type: "subscription.updated";
      eventId: string;
      subscriptionId: string;
      status: "active" | "past_due" | "canceled" | "incomplete";
      cancelAtPeriodEnd: boolean;
      periodEnd: string | null;
    }
  | { type: "subscription.ended"; eventId: string; subscriptionId: string }
  | { type: "credits.purchased"; eventId: string; organizationId: string; packId: CreditPackId }
  | { type: "ignored"; eventId: string };

export interface BillingProvider {
  readonly mode: BillingMode;
  createCheckout(ctx: CheckoutContext, request: CheckoutRequest): Promise<CheckoutResult>;
  /** Az időszak végén lépjen életbe a lemondás (D-039). */
  cancelAtPeriodEnd(subscriptionId: string): Promise<void>;
  /** Aláírás-ellenőrzés + normalizálás. Érvénytelen aláírásnál kivételt dob. */
  parseWebhook(rawBody: string, signature: string | null): BillingEvent;
}
