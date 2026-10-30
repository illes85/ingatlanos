import { getBilling } from "@/lib/billing";
import { processBillingEvent } from "@/lib/billing/service";

/**
 * Stripe-webhook. A törzset nyers szövegként olvassuk, mert az aláírás ellenőrzése a módosítatlan bájtokon megy.
 * Érvénytelen aláírás → 400 (semmi nem íródik); feldolgozási hiba → 500 (a Stripe újrapróbálja, az ismétlés idempotens).
 */
export async function POST(request: Request) {
  let billing;
  try {
    billing = getBilling();
  } catch {
    return new Response("Fizetés nincs beállítva", { status: 503 });
  }
  if (billing.mode !== "stripe") return new Response("Nem található", { status: 404 });

  // Aláírás-ellenőrzés előtt ne olvassunk be korlátlan méretű törzset.
  if (Number(request.headers.get("content-length") ?? 0) > 1_000_000) return new Response("Túl nagy kérés", { status: 413 });
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return new Response("Túl nagy kérés", { status: 413 });
  let event;
  try {
    event = billing.parseWebhook(rawBody, request.headers.get("stripe-signature"));
  } catch {
    return new Response("Érvénytelen aláírás", { status: 400 });
  }

  try {
    const result = await processBillingEvent(event);
    return Response.json({ received: true, result });
  } catch {
    return new Response("Feldolgozási hiba", { status: 500 });
  }
}
