import "server-only";
import { mockBilling } from "./mock";
import { createStripeBilling } from "./stripe";
import type { BillingProvider } from "./types";

export type * from "./types";

/**
 * A fizetési szolgáltató: mindhárom Stripe-kulcs megléténél Stripe, egyébként MOCK.
 * Teszt módú kulcsokkal (sk_test_…) dolgozunk; éles kulcsot nem fogadunk el (D-037).
 */
export function getBilling(): BillingProvider {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const set = [secretKey, webhookSecret, publishable].filter(Boolean).length;
  if (set === 0) return mockBilling;
  // Részleges beállításnál nem esünk vissza csendben MOCK-ra (a webhook-események elvesznének).
  if (set < 3) throw new Error("Hiányos Stripe-beállítás: a STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET és NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY mindegyike kell.");
  if (!secretKey.startsWith("sk_test_") && process.env.STRIPE_ALLOW_LIVE !== "true") {
    throw new Error("A fejlesztés alatt csak teszt módú Stripe-kulcs (sk_test_…) használható.");
  }
  return createStripeBilling({ secretKey, webhookSecret, taxRateId: process.env.STRIPE_TAX_RATE_ID || null });
}
