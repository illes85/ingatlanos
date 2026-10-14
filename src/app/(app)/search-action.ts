"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAppContext } from "@/lib/auth/session";
import { formatShortAddress } from "@/lib/format";

export interface SearchResult {
  properties: { id: string; code: string; label: string; price: number }[];
  contacts: { id: string; name: string; detail: string }[];
  leads: { id: string; name: string; detail: string }[];
}

/**
 * Globális keresés a parancspalettához. A felhasználó munkamenetével fut, így az RLS
 * pontosan azt engedi látni, amihez joga van (más ügynök ügyfeleinek adatait nem).
 */
export async function searchEverything(rawQuery: string): Promise<SearchResult> {
  const query = rawQuery.trim().slice(0, 64);
  if (query.length < 2) return { properties: [], contacts: [], leads: [] };

  const ctx = await requireAppContext();
  const supabase = await createClient();
  const pattern = `%${query.toLowerCase().replace(/[%_\\]/g, (m) => `\\${m}`)}%`;

  const [properties, contacts, leads] = await Promise.all([
    supabase
      .from("properties")
      .select("id, code, city, district, street, price")
      .eq("organization_id", ctx.organization.id)
      .ilike("search_text", pattern)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("contacts")
      .select("id, full_name, roles, phone")
      .eq("organization_id", ctx.organization.id)
      .is("deleted_at", null)
      .ilike("full_name", pattern)
      .order("full_name")
      .limit(6),
    supabase
      .from("leads")
      .select("id, full_name, phone, email")
      .eq("organization_id", ctx.organization.id)
      .ilike("full_name", pattern)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    properties: (properties.data ?? []).map((p) => ({
      id: p.id,
      code: p.code,
      label: formatShortAddress({ city: p.city, district: p.district, street: p.street }),
      price: Number(p.price),
    })),
    contacts: (contacts.data ?? []).map((c) => ({
      id: c.id,
      name: c.full_name ?? "",
      detail: c.phone ?? "",
    })),
    leads: (leads.data ?? []).map((l) => ({ id: l.id, name: l.full_name ?? "", detail: l.phone ?? l.email ?? "" })),
  };
}
