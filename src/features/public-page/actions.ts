"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { makePublicSlug } from "./slug";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Érdeklődés beküldése (névtelen látogató)
// ---------------------------------------------------------------------------

const INQUIRY_ERRORS = ["name", "contact", "email", "consent", "tooLong"] as const;
export type InquiryFieldError = (typeof INQUIRY_ERRORS)[number];

export interface InquiryState {
  status?: "sent" | "error" | "rate_limited";
  fieldErrors?: Partial<Record<"name" | "phone" | "email" | "message" | "consent", InquiryFieldError>>;
}

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const inquirySchema = z
  .object({
    name: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string("name").min(2, "name").max(120, "tooLong")),
    phone: z.preprocess(blank, z.string().trim().max(40, "tooLong").optional()),
    email: z.preprocess(blank, z.string().trim().max(200, "tooLong").email("email").optional()),
    message: z.preprocess(blank, z.string().trim().max(2000, "tooLong").optional()),
    consent: z.literal("on", "consent"),
  })
  .superRefine((v, ctx) => {
    if (!v.phone && !v.email) ctx.addIssue({ code: "custom", path: ["phone"], message: "contact" });
  });

/** A nyilvános oldal érdeklődési űrlapja: leadként érkezik az ingatlan felelőséhez. A szűrés és a korlátozás az adatbázisban is megvan. */
export async function submitInquiry(slug: string, _: InquiryState, formData: FormData): Promise<InquiryState> {
  // Rejtett csapdamező: a robotok kitöltik. Úgy teszünk, mintha sikerült volna, de nem mentünk semmit.
  if (String(formData.get("website") ?? "") !== "") return { status: "sent" };

  const result = inquirySchema.safeParse({
    name: formData.get("name") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    email: formData.get("email") ?? undefined,
    message: formData.get("message") ?? undefined,
    consent: formData.get("consent") ?? undefined,
  });
  if (!result.success) {
    const fieldErrors: NonNullable<InquiryState["fieldErrors"]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof NonNullable<InquiryState["fieldErrors"]> | undefined;
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = (INQUIRY_ERRORS as readonly string[]).includes(issue.message) ? (issue.message as InquiryFieldError) : "tooLong";
      }
    }
    return { status: "error", fieldErrors };
  }
  const input = result.data;

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("submit_public_inquiry", {
    p_slug: slug,
    p_name: input.name,
    p_phone: input.phone ?? "",
    p_email: input.email ?? "",
    p_message: input.message ?? "",
    p_consent: true,
  });
  if (error) return { status: "error" };
  if (data === "ok") return { status: "sent" };
  if (data === "rate_limited") return { status: "rate_limited" };
  return { status: "error" };
}

// ---------------------------------------------------------------------------
// Megosztás be- és kikapcsolása (belépett felhasználó)
// ---------------------------------------------------------------------------

export type ShareResult = { ok: true; slug: string | null } | { ok: false; error: "generic" | "forbidden" | "notPublishable" };

const PUBLISHABLE = ["active", "under_offer", "reserved"];

/** Az ingatlan nyilvános oldalának be/kikapcsolása. A link (slug) az első bekapcsoláskor jön létre, és később is megmarad. */
export async function setPublicPage(propertyId: string, enabled: boolean): Promise<ShareResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(propertyId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id, title, status, public_slug")
    .eq("id", propertyId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!property) return { ok: false, error: "forbidden" };
  if (enabled && !PUBLISHABLE.includes(property.status)) return { ok: false, error: "notPublishable" };

  const slug = property.public_slug;
  for (let attempt = 0; attempt < 3; attempt++) {
    const patch = enabled ? { public_enabled: true, public_slug: slug ?? makePublicSlug(property.title) } : { public_enabled: false };
    const { data, error } = await supabase
      .from("properties")
      .update(patch)
      .eq("id", propertyId)
      .eq("organization_id", ctx.organization.id)
      .select("public_slug");
    if (!error && data && data.length > 0) {
      revalidatePath(`/ingatlanok/${propertyId}`);
      return { ok: true, slug: enabled ? (data[0]!.public_slug ?? null) : slug };
    }
    if (error?.code === "23505" && !slug) continue; // ritka szlag-ütközés: új véletlen végződés
    return { ok: false, error: error?.code === "42501" || (!error && !data?.length) ? "forbidden" : "generic" };
  }
  return { ok: false, error: "generic" };
}

/** Új nyilvános link: a régi azonnal megszűnik (kiszivárgott link ellen). Csak bekapcsolt oldalon. */
export async function regeneratePublicLink(propertyId: string): Promise<ShareResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(propertyId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id, title, public_enabled")
    .eq("id", propertyId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!property) return { ok: false, error: "forbidden" };
  if (!property.public_enabled) return { ok: false, error: "generic" };

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("properties")
      .update({ public_slug: makePublicSlug(property.title) })
      .eq("id", propertyId)
      .eq("organization_id", ctx.organization.id)
      .select("public_slug");
    if (!error && data && data.length > 0) {
      revalidatePath(`/ingatlanok/${propertyId}`);
      return { ok: true, slug: data[0]!.public_slug ?? null };
    }
    if (error?.code === "23505") continue;
    return { ok: false, error: error?.code === "42501" || (!error && !data?.length) ? "forbidden" : "generic" };
  }
  return { ok: false, error: "generic" };
}
