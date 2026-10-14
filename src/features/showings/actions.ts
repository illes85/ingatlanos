"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { combineDueAt } from "@/features/tasks/recurrence";
import { parseShowingForm, type ShowingField, type ShowingFormError } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ShowingFormState {
  fieldErrors?: Partial<Record<ShowingField, ShowingFormError>>;
  error?: "generic" | "forbidden";
}

export type ShowingResult = { ok: true } | { ok: false; error: "generic" | "forbidden" };
export type ShowingStatus = "scheduled" | "completed" | "cancelled" | "no_show";

function refresh(showingId?: string) {
  revalidatePath("/naptar");
  revalidatePath("/ma");
  if (showingId) revalidatePath(`/naptar/${showingId}`);
}

/** Bemutató gyors-rögzítése. Az ügynök a saját nevére veszi fel; az owner és az asszisztens kijelölhet másikat (az adatbázis őrzi). */
export async function createShowing(_: ShowingFormState, formData: FormData): Promise<ShowingFormState> {
  const ctx = await requireAppContext();
  const parsed = parseShowingForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  const input = parsed.data;
  const supabase = await createClient();

  const startsAt = combineDueAt(input.date, input.time);
  const endsAt = new Date(startsAt.getTime() + input.duration * 60_000);
  const agentId = ctx.role === "agent" ? ctx.userId : (input.agentId ?? ctx.userId);

  const { data: created, error } = await supabase
    .from("showings")
    .insert({
      organization_id: ctx.organization.id,
      property_id: input.propertyId,
      buyer_contact_id: input.buyerContactId ?? null,
      agent_id: agentId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.code === "42501" ? "forbidden" : "generic" };

  const t = await getTranslations("showings.activity");
  await supabase.from("activities").insert({
    organization_id: ctx.organization.id,
    type: "showing",
    actor_id: ctx.userId,
    property_id: input.propertyId,
    contact_id: input.buyerContactId ?? null,
    title: t("scheduled"),
    payload: { showing_id: created.id, starts_at: startsAt.toISOString() },
  });
  refresh();
  redirect(`/naptar?datum=${input.date}`);
}

/** Állapotváltás: lezajlott, lemondva, nem jelent meg, vagy vissza ütemezettre. */
export async function setShowingStatus(showingId: string, status: ShowingStatus): Promise<ShowingResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(showingId) || !["scheduled", "completed", "cancelled", "no_show"].includes(status)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("showings")
    .update({ status })
    .eq("id", showingId)
    .eq("organization_id", ctx.organization.id)
    .select("id, property_id, buyer_contact_id");
  const showing = data?.[0];
  if (error || !showing) return { ok: false, error: "forbidden" };

  if (status !== "scheduled") {
    const t = await getTranslations("showings.activity");
    await supabase.from("activities").insert({
      organization_id: ctx.organization.id,
      type: "showing",
      actor_id: ctx.userId,
      property_id: showing.property_id,
      contact_id: showing.buyer_contact_id,
      title: t(status),
      payload: { showing_id: showingId },
    });
    if (status === "completed" && showing.buyer_contact_id) {
      await supabase.from("contacts").update({ last_contacted_at: new Date().toISOString() }).eq("id", showing.buyer_contact_id);
    }
  }
  refresh(showingId);
  return { ok: true };
}

/** A visszajelzés-kérés rögzítése. TODO(integráció): az e-mail/SMS tényleges kiküldése; addig az ügynök a saját csatornáján kéri. */
export async function requestShowingFeedback(showingId: string): Promise<ShowingResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(showingId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("showings")
    .update({ feedback_requested_at: new Date().toISOString() })
    .eq("id", showingId)
    .eq("organization_id", ctx.organization.id)
    .eq("status", "completed")
    .select("id, property_id, buyer_contact_id");
  const showing = data?.[0];
  if (error || !showing) return { ok: false, error: "forbidden" };

  const t = await getTranslations("showings.activity");
  await supabase.from("activities").insert({
    organization_id: ctx.organization.id,
    type: "showing",
    actor_id: ctx.userId,
    property_id: showing.property_id,
    contact_id: showing.buyer_contact_id,
    title: t("feedbackRequested"),
    payload: { showing_id: showingId },
  });
  refresh(showingId);
  return { ok: true };
}

/** A vevő visszajelzése: 1–5 értékelés és szöveg. */
export async function saveShowingFeedback(showingId: string, rating: number | null, text: string): Promise<ShowingResult> {
  const ctx = await requireAppContext();
  const body = text.trim();
  if (!UUID.test(showingId) || body.length > 2000) return { ok: false, error: "generic" };
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("showings")
    .update({ feedback_rating: rating, feedback_text: body || null })
    .eq("id", showingId)
    .eq("organization_id", ctx.organization.id)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "forbidden" };
  refresh(showingId);
  return { ok: true };
}
