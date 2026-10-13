"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { parseLeadForm, type LeadField, type LeadFormError } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LeadFormState {
  fieldErrors?: Partial<Record<LeadField, LeadFormError>>;
  error?: "generic" | "forbidden";
}

export type LeadResult = { ok: true; contactId?: string } | { ok: false; error: "generic" | "forbidden" };

/** Kézi lead rögzítése (pl. telefonos érdeklődés). Az ügynök leadje automatikusan hozzá kerül, az irodavezetőé kiosztatlan marad. */
export async function createLead(_: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const ctx = await requireAppContext();
  const parsed = parseLeadForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  const input = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("leads").insert({
    organization_id: ctx.organization.id,
    source: input.source,
    full_name: input.fullName,
    phone: input.phone ?? null,
    phone_normalized: normalizePhone(input.phone),
    email: input.email ?? null,
    raw_message: input.message ?? null,
    property_id: input.propertyId ?? null,
    assigned_to: ctx.role === "agent" ? ctx.userId : null,
  });
  if (error) return { error: "generic" };
  redirect("/leadek");
}

/** Megnyitáskor az új lead olvasottá válik. */
export async function markLeadRead(leadId: string): Promise<LeadResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(leadId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("organization_id", ctx.organization.id)
    .eq("status", "new");
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/leadek");
  return { ok: true };
}

/** Felelős kijelölése; a null a kiosztatlan állapot. Jogosultságot az adatbázis őrzi. */
export async function assignLead(leadId: string, assigneeId: string | null): Promise<LeadResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(leadId) || (assigneeId !== null && !UUID.test(assigneeId))) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ assigned_to: assigneeId })
    .eq("id", leadId)
    .eq("organization_id", ctx.organization.id)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "forbidden" };
  revalidatePath("/leadek");
  return { ok: true };
}

const MANUAL_STATUSES = ["new", "read", "contacted", "archived", "spam"] as const;
export type ManualLeadStatus = (typeof MANUAL_STATUSES)[number];

/** Állapotváltás kézzel (felvettük a kapcsolatot, archiválás, spam). Az „átalakítva” csak a konvertálással állítható. */
export async function setLeadStatus(leadId: string, status: ManualLeadStatus): Promise<LeadResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(leadId) || !MANUAL_STATUSES.includes(status)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("organization_id", ctx.organization.id)
    .neq("status", "converted")
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "forbidden" };
  revalidatePath("/leadek");
  return { ok: true };
}

/**
 * Lead átalakítása ügyféllé egy kattintással, egyetlen adatbázis-tranzakcióban (convert_lead, a hívó jogaival).
 * Ha az irodában már van egyező ügyfél, a hívó azt adja meg (existingContactId); különben új vevő-ügyfél készül.
 */
export async function convertLead(leadId: string, existingContactId?: string): Promise<LeadResult> {
  await requireAppContext();
  if (!UUID.test(leadId) || (existingContactId !== undefined && !UUID.test(existingContactId))) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const t = await getTranslations("leads.activity");
  const { data, error } = await supabase.rpc("convert_lead", { p_lead: leadId, p_contact: existingContactId, p_activity_title: t("converted") });
  if (error || !data) return { ok: false, error: error?.code === "42501" ? "forbidden" : "generic" };
  revalidatePath("/leadek");
  return { ok: true, contactId: data };
}
