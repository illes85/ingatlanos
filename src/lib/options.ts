import { createClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/session";

export interface Option {
  id: string;
  label: string;
}

/** Ingatlan-választó (kód · név). A láthatóságot az RLS szabja meg. */
export async function getPropertyOptions(ctx: AppContext): Promise<Option[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("properties").select("id, code, title").eq("organization_id", ctx.organization.id).order("code").limit(300);
  return (data ?? []).map((p) => ({ id: p.id, label: `${p.code} · ${p.title ?? ""}` }));
}

/** Ügyfél-választó. Az ügynök csak a sajátjait látja (RLS). */
export async function getContactOptions(ctx: AppContext): Promise<Option[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, full_name, company")
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null)
    .is("anonymized_at", null)
    .order("full_name")
    .limit(500);
  return (data ?? []).map((c) => ({ id: c.id, label: c.full_name || c.company || "–" }));
}
