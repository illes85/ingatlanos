"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import {
  parseContactForm,
  parseProfileForm,
  toContactRow,
  toProfileRow,
  type ContactField,
  type ContactFormError,
  type ProfileField,
  type ProfileFormError,
} from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DuplicateHit {
  id: string;
  fullName: string;
  ownerName: string | null;
  match: "phone" | "email";
}

export interface ContactFormState {
  fieldErrors?: Partial<Record<ContactField, ContactFormError>>;
  error?: "generic" | "forbidden";
  /** Felvételkor: az irodában már szereplő egyező ügyfelek (csak név és felelős). */
  duplicates?: DuplicateHit[];
}

export type SimpleResult = { ok: true } | { ok: false; error: "generic" | "forbidden" };

export async function createContact(_: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const ctx = await requireAppContext();
  const parsed = parseContactForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  const input = parsed.data;
  const supabase = await createClient();

  // Duplikátum-felismerés telefonszám és e-mail alapján: a hívás személyes adat nélkül (név + felelős) válaszol.
  if (formData.get("ignoreDuplicates") !== "1") {
    const { data: hits } = await supabase.rpc("find_duplicate_contacts", {
      p_org: ctx.organization.id,
      p_phone: normalizePhone(input.phone) ?? "",
      p_email: input.email ?? "",
    });
    if (hits && hits.length > 0) {
      return {
        duplicates: hits.map((h) => ({ id: h.id, fullName: h.full_name, ownerName: h.owner_name, match: h.match === "phone" ? "phone" : "email" })),
      };
    }
  }

  const owner = input.ownerAgentId && ctx.role !== "agent" ? input.ownerAgentId : ctx.role === "assistant" ? null : ctx.userId;
  const { data: created, error } = await supabase
    .from("contacts")
    .insert({ ...toContactRow(input), organization_id: ctx.organization.id, owner_agent_id: owner })
    .select("id")
    .single();
  if (error || !created) return { error: "generic" };
  redirect(`/ugyfelek/${created.id}`);
}

export async function updateContact(contactId: string, _: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const ctx = await requireAppContext();
  if (!UUID.test(contactId)) return { error: "generic" };
  const parsed = parseContactForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  const input = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase.from("contacts").select("gdpr_consent_at").eq("id", contactId).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!before) return { error: "forbidden" };

  const row = toContactRow(input, before.gdpr_consent_at);
  // A felelőst csak az váltja, akinek a mező megjelent; hiányzó mezőnél nem érintjük.
  const patch = formData.has("ownerAgentId") && input.ownerAgentId ? { ...row, owner_agent_id: input.ownerAgentId } : row;
  const { data: updated, error } = await supabase.from("contacts").update(patch).eq("id", contactId).eq("organization_id", ctx.organization.id).select("id");
  if (error) return { error: "generic" };
  if (!updated || updated.length === 0) return { error: "forbidden" };
  redirect(`/ugyfelek/${contactId}`);
}

/** Esemény rögzítése az ügyfél idővonalára (jegyzet, hívás, e-mail, SMS); a hívás/e-mail/SMS frissíti az utolsó kapcsolatot. */
export async function addContactActivity(contactId: string, type: "note" | "call" | "email" | "sms", body: string): Promise<SimpleResult> {
  const ctx = await requireAppContext();
  const text = body.trim();
  if (!UUID.test(contactId) || text.length === 0 || text.length > 4000 || !["note", "call", "email", "sms"].includes(type)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data: contact } = await supabase.from("contacts").select("id").eq("id", contactId).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!contact) return { ok: false, error: "forbidden" };

  const t = await getTranslations("contacts.detail.timeline.types");
  const { error } = await supabase.from("activities").insert({
    organization_id: ctx.organization.id,
    type,
    actor_id: ctx.userId,
    contact_id: contactId,
    title: t(type),
    body: text,
  });
  if (error) return { ok: false, error: "generic" };
  if (type !== "note") await supabase.from("contacts").update({ last_contacted_at: new Date().toISOString() }).eq("id", contactId);
  return { ok: true };
}

/** „Mit kapott már meg tőlünk”: az ajánlás rögzítése (a küldést az ügynök a saját csatornáján végzi). */
export async function recordRecommendation(contactId: string, propertyId: string, channel: "email" | "sms" | "phone" | "in_person" = "email"): Promise<SimpleResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(contactId) || !UUID.test(propertyId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const [{ data: contact }, { data: property }] = await Promise.all([
    supabase.from("contacts").select("id").eq("id", contactId).eq("organization_id", ctx.organization.id).maybeSingle(),
    supabase.from("properties").select("id, city, street").eq("id", propertyId).eq("organization_id", ctx.organization.id).maybeSingle(),
  ]);
  if (!contact || !property) return { ok: false, error: "forbidden" };

  const { error } = await supabase.from("property_recommendations").insert({
    organization_id: ctx.organization.id,
    contact_id: contactId,
    property_id: propertyId,
    channel,
    reaction: "no_response",
  });
  if (error) return { ok: false, error: "generic" };

  const t = await getTranslations("contacts.activity");
  await supabase.from("activities").insert({
    organization_id: ctx.organization.id,
    type: "recommendation",
    actor_id: ctx.userId,
    contact_id: contactId,
    property_id: propertyId,
    title: t("recommended", { address: [property.city, property.street].filter(Boolean).join(", ") }),
  });
  return { ok: true };
}

export interface ProfileFormState {
  fieldErrors?: Partial<Record<ProfileField, ProfileFormError>>;
  error?: "generic" | "forbidden";
  saved?: boolean;
}

/** Keresési profil felvétele vagy módosítása (a rejtett `profileId` mező dönt). */
export async function saveSearchProfile(contactId: string, _: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const ctx = await requireAppContext();
  if (!UUID.test(contactId)) return { error: "generic" };
  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  const supabase = await createClient();

  const { data: contact } = await supabase.from("contacts").select("id").eq("id", contactId).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!contact) return { error: "forbidden" };

  const row = toProfileRow(parsed.data);
  const profileId = String(formData.get("profileId") ?? "");
  if (UUID.test(profileId)) {
    const { data, error } = await supabase.from("search_profiles").update(row).eq("id", profileId).eq("contact_id", contactId).select("id");
    if (error) return { error: "generic" };
    if (!data || data.length === 0) return { error: "forbidden" };
  } else {
    const { error } = await supabase.from("search_profiles").insert({ ...row, organization_id: ctx.organization.id, contact_id: contactId });
    if (error) return { error: "generic" };
  }
  return { saved: true };
}

export async function deleteSearchProfile(contactId: string, profileId: string): Promise<SimpleResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(contactId) || !UUID.test(profileId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("search_profiles")
    .delete()
    .eq("id", profileId)
    .eq("contact_id", contactId)
    .eq("organization_id", ctx.organization.id)
    .select("id");
  if (error) return { ok: false, error: "generic" };
  return data && data.length > 0 ? { ok: true } : { ok: false, error: "forbidden" };
}
