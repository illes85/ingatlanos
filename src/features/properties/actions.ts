"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatMillions } from "@/lib/format";
import { parsePropertyForm, toPropertyRow, type PropertyField, type PropertyFormError, type PropertyInput } from "./schema";

export interface PropertyFormState {
  fieldErrors?: Partial<Record<PropertyField, PropertyFormError>>;
  error?: "generic" | "forbidden";
}

export type MediaActionResult = { ok: true } | { ok: false; error: "generic" | "forbidden" | "invalidPath" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A kezdő ügyletszakasz felvételkor: az ingatlan státusza ebből származik (D-007). */
const INITIAL_DEAL_PROBABILITY = 10;

/** Jutalékfeltétel mentése; az asszisztens szerepkörnek az RLS miatt nincs hozzáférése, ezért nála kihagyjuk. */
async function saveCommission(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string, propertyId: string, pct: number | undefined) {
  if (pct === undefined) {
    await supabase.from("property_commission_terms").delete().eq("property_id", propertyId);
    return;
  }
  await supabase.from("property_commission_terms").upsert({ property_id: propertyId, organization_id: orgId, commission_pct: pct });
}

export async function createProperty(_: PropertyFormState, formData: FormData): Promise<PropertyFormState> {
  const ctx = await requireAppContext();
  const parsed = parsePropertyForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  const input: PropertyInput = parsed.data;

  const supabase = await createClient();
  const responsible = input.responsibleAgentId ?? (ctx.role === "assistant" ? null : ctx.userId);
  const { data: created, error } = await supabase
    .from("properties")
    .insert({ ...toPropertyRow(input), code: "", organization_id: ctx.organization.id, responsible_agent_id: responsible })
    .select("id")
    .single();
  if (error || !created) return { error: "generic" };

  if (ctx.role !== "assistant") await saveCommission(supabase, ctx.organization.id, created.id, input.commissionPct);

  // Az eladói ügylet az akvizíciós szakaszban indul; a kanbanon innen vihető tovább.
  await supabase.from("deals").insert({
    organization_id: ctx.organization.id,
    side: "seller",
    stage: "acquisition",
    property_id: created.id,
    agent_id: responsible,
    expected_value: input.price ?? null,
    probability: INITIAL_DEAL_PROBABILITY,
    created_by: ctx.userId,
  });
  await supabase.from("activities").insert({
    organization_id: ctx.organization.id,
    type: "status_change",
    actor_id: ctx.userId,
    property_id: created.id,
    title: (await getTranslations("properties.activity"))("created"),
  });

  redirect(`/ingatlanok/${created.id}/szerkesztes?uj=1`);
}

export async function updateProperty(propertyId: string, _: PropertyFormState, formData: FormData): Promise<PropertyFormState> {
  const ctx = await requireAppContext();
  if (!UUID.test(propertyId)) return { error: "generic" };
  const parsed = parsePropertyForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: before } = await supabase.from("properties").select("price").eq("id", propertyId).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!before) return { error: "forbidden" };

  const { data: updated, error } = await supabase
    .from("properties")
    .update(toPropertyRow(input))
    .eq("id", propertyId)
    .eq("organization_id", ctx.organization.id)
    .select("id");
  // Az RLS a nem módosítható sort csendben kihagyja: üres találat = nincs jogosultság.
  if (error) return { error: "generic" };
  if (!updated || updated.length === 0) return { error: "forbidden" };

  if (ctx.role !== "assistant") await saveCommission(supabase, ctx.organization.id, propertyId, input.commissionPct);

  const oldPrice = Number(before.price);
  if (input.price !== undefined && input.price !== oldPrice) {
    await supabase.from("activities").insert({
      organization_id: ctx.organization.id,
      type: "price_change",
      actor_id: ctx.userId,
      property_id: propertyId,
      title: (await getTranslations("properties.activity"))(input.price < oldPrice ? "priceDown" : "priceUp", {
        from: formatMillions(oldPrice),
        to: formatMillions(input.price),
      }),
      payload: { from: oldPrice, to: input.price },
    });
  }

  redirect(`/ingatlanok/${propertyId}`);
}

/** Feltöltött fájlok felvétele médiasorként. A fájlok feltöltése a böngészőből történt, a saját szervezet mappájába. */
export async function addPropertyMedia(propertyId: string, files: { path: string; width?: number; height?: number }[]): Promise<MediaActionResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(propertyId) || files.length === 0 || files.length > 30) return { ok: false, error: "generic" };
  const prefix = `${ctx.organization.id}/${propertyId}/`;
  if (files.some((f) => !f.path.startsWith(prefix) || f.path.includes(".."))) return { ok: false, error: "invalidPath" };

  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("id").eq("id", propertyId).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!property) return { ok: false, error: "forbidden" };

  const { data: existing } = await supabase.from("property_media").select("sort_order, is_cover").eq("property_id", propertyId);
  const nextOrder = Math.max(-1, ...(existing ?? []).map((m) => m.sort_order)) + 1;
  const hasCover = (existing ?? []).some((m) => m.is_cover);

  const { error } = await supabase.from("property_media").insert(
    files.map((f, index) => ({
      organization_id: ctx.organization.id,
      property_id: propertyId,
      kind: "photo" as const,
      storage_path: f.path,
      width: f.width ?? null,
      height: f.height ?? null,
      sort_order: nextOrder + index,
      is_cover: !hasCover && index === 0,
      is_public: true,
    })),
  );
  return error ? { ok: false, error: "generic" } : { ok: true };
}

export async function deletePropertyMedia(propertyId: string, mediaId: string): Promise<MediaActionResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(propertyId) || !UUID.test(mediaId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("property_media")
    .select("id, storage_path, is_cover")
    .eq("id", mediaId)
    .eq("property_id", propertyId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!media) return { ok: false, error: "forbidden" };

  if (media.storage_path) await supabase.storage.from("property-media").remove([media.storage_path]);
  const { error } = await supabase.from("property_media").delete().eq("id", mediaId);
  if (error) return { ok: false, error: "generic" };

  if (media.is_cover) {
    const { data: next } = await supabase.from("property_media").select("id").eq("property_id", propertyId).order("sort_order").limit(1).maybeSingle();
    if (next) await supabase.from("property_media").update({ is_cover: true }).eq("id", next.id);
  }
  return { ok: true };
}

export async function setCoverMedia(propertyId: string, mediaId: string): Promise<MediaActionResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(propertyId) || !UUID.test(mediaId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data: media } = await supabase.from("property_media").select("id").eq("id", mediaId).eq("property_id", propertyId).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!media) return { ok: false, error: "forbidden" };
  await supabase.from("property_media").update({ is_cover: false }).eq("property_id", propertyId).neq("id", mediaId);
  const { error } = await supabase.from("property_media").update({ is_cover: true }).eq("id", mediaId);
  return error ? { ok: false, error: "generic" } : { ok: true };
}

export async function setMediaPublic(propertyId: string, mediaId: string, isPublic: boolean): Promise<MediaActionResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(propertyId) || !UUID.test(mediaId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_media")
    .update({ is_public: isPublic })
    .eq("id", mediaId)
    .eq("property_id", propertyId)
    .eq("organization_id", ctx.organization.id)
    .select("id");
  if (error) return { ok: false, error: "generic" };
  return data && data.length > 0 ? { ok: true } : { ok: false, error: "forbidden" };
}

/** Átrendezés: a megadott azonosító-sorrend lesz az új `sort_order`. Idegen azonosítók kimaradnak. */
export async function reorderPropertyMedia(propertyId: string, orderedIds: string[]): Promise<MediaActionResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(propertyId) || orderedIds.some((id) => !UUID.test(id))) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data: rows } = await supabase.from("property_media").select("id").eq("property_id", propertyId).eq("organization_id", ctx.organization.id);
  const known = new Set((rows ?? []).map((r) => r.id));
  const ids = orderedIds.filter((id) => known.has(id));
  const results = await Promise.all(ids.map((id, index) => supabase.from("property_media").update({ sort_order: index }).eq("id", id)));
  return results.some((r) => r.error) ? { ok: false, error: "generic" } : { ok: true };
}
