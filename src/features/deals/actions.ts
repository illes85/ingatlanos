"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { STAGES_BY_SIDE, type DealStage } from "@/config/pipeline";
import { parseDealForm, type DealField, type DealFormError } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DealFormState {
  fieldErrors?: Partial<Record<DealField, DealFormError>>;
  error?: "generic" | "forbidden";
}

export type DealResult = { ok: true } | { ok: false; error: "generic" | "forbidden" };

/** Új ügylet. Az ügynök a saját nevére veszi fel; az owner kijelölhet felelőst. A hivatkozásokat adatbázis-trigger őrzi. */
export async function createDeal(_: DealFormState, formData: FormData): Promise<DealFormState> {
  const ctx = await requireAppContext();
  if (ctx.role === "assistant") return { error: "forbidden" };
  const parsed = parseDealForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  const input = parsed.data;
  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("deals")
    .insert({
      organization_id: ctx.organization.id,
      side: input.side,
      stage: input.stage,
      title: input.title ?? null,
      property_id: input.propertyId ?? null,
      contact_id: input.contactId ?? null,
      agent_id: ctx.role === "owner" && input.agentId ? input.agentId : ctx.userId,
      expected_value: input.expectedValueM === undefined ? null : Math.round(input.expectedValueM * 1_000_000),
      probability: input.probability ?? null,
      expected_close_date: input.expectedCloseDate ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.code === "42501" ? "forbidden" : "generic" };
  revalidatePath("/ugyletek");
  redirect(`/ugyletek?oldal=${input.side === "seller" ? "elado" : "vevo"}`);
}

/** Szakasz módosítása húzással. A szakasz és az oldal összeillését az adatbázis-kényszer is őrzi. */
export async function moveDeal(dealId: string, stage: DealStage): Promise<DealResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(dealId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data: deal } = await supabase.from("deals").select("side").eq("id", dealId).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!deal) return { ok: false, error: "forbidden" };
  if (!(STAGES_BY_SIDE[deal.side] as readonly string[]).includes(stage)) return { ok: false, error: "generic" };

  const { data, error } = await supabase.from("deals").update({ stage }).eq("id", dealId).eq("organization_id", ctx.organization.id).select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "forbidden" };
  revalidatePath("/ugyletek");
  return { ok: true };
}

/** Az ügylet részleteinek módosítása (érték, valószínűség, határidő, jegyzet; a felelőst csak az owner váltja). */
export async function updateDeal(dealId: string, _: DealFormState, formData: FormData): Promise<DealFormState> {
  const ctx = await requireAppContext();
  if (!UUID.test(dealId)) return { error: "generic" };
  const supabase = await createClient();
  const { data: current } = await supabase.from("deals").select("side, stage").eq("id", dealId).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!current) return { error: "forbidden" };

  formData.set("side", current.side);
  formData.set("stage", current.stage);
  const parsed = parseDealForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  const input = parsed.data;

  const patch = {
    title: input.title ?? null,
    expected_value: input.expectedValueM === undefined ? null : Math.round(input.expectedValueM * 1_000_000),
    probability: input.probability ?? null,
    expected_close_date: input.expectedCloseDate ?? null,
    notes: input.notes ?? null,
    ...(ctx.role === "owner" && input.agentId ? { agent_id: input.agentId } : {}),
  };
  const { data, error } = await supabase.from("deals").update(patch).eq("id", dealId).eq("organization_id", ctx.organization.id).select("id");
  if (error || !data || data.length === 0) return { error: "forbidden" };
  revalidatePath("/ugyletek");
  redirect(`/ugyletek/${dealId}`);
}

/** Az ügylet elvesztése (ok megadásával) vagy újranyitása. */
export async function setDealOutcome(dealId: string, outcome: "lost" | "reopen", reason?: string): Promise<DealResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(dealId) || (reason !== undefined && reason.length > 500)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const patch =
    outcome === "lost"
      ? { status: "lost" as const, lost_reason: reason?.trim() || null }
      : { status: "open" as const, closed_at: null, lost_reason: null };
  // Elvesztés csak nyitottból, újranyitás csak elvesztettből lehetséges.
  const { data, error } = await supabase
    .from("deals")
    .update(patch)
    .eq("id", dealId)
    .eq("organization_id", ctx.organization.id)
    .eq("status", outcome === "lost" ? "open" : "lost")
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "forbidden" };
  revalidatePath("/ugyletek");
  return { ok: true };
}
