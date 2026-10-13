import "server-only";
import type { AppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { calendarDaysBetween } from "@/lib/format";
import { CONTACT_PAGE_SIZE, type ContactFilters } from "./filters";
import type { ContactListItem, ContactListResult, DirectoryHit } from "./types";

const LIST_COLUMNS =
  "id, full_name, company, roles, phone, email, owner_agent_id, last_contacted_at, created_at, owner:profiles!contacts_owner_agent_id_fkey (full_name)";

/** Szűrőbe szánt szövegből eltávolítja a PostgREST-szűrő különleges karaktereit. */
function safeTerm(value: string): string {
  return value.replace(/[%,()*\\]/g, " ").trim();
}

/**
 * Az ügyféllista a felhasználó munkamenetével, RLS alatt: az ügynök csak a saját ügyfeleit kapja,
 * az owner és az asszisztens az egész irodáét. A találatok mellé az ügynöknek a névjegyzékből
 * jön a más ügynököknél lévő egyező nevek (csak név és felelős).
 */
export async function getContacts(ctx: AppContext, filters: ContactFilters, now = new Date()): Promise<ContactListResult> {
  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null)
    .is("anonymized_at", null);

  if (filters.role) query = query.contains("roles", [filters.role]);
  if (filters.owner === "mine") query = query.eq("owner_agent_id", ctx.userId);
  else if (filters.owner !== "all") query = query.eq("owner_agent_id", filters.owner);

  const term = safeTerm(filters.q);
  if (term) {
    const digits = term.replace(/\D/g, "");
    const clauses = [`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `company.ilike.%${term}%`];
    if (digits.length >= 3) clauses.push(`phone_normalized.ilike.%${digits}%`);
    query = query.or(clauses.join(","));
  }

  if (filters.sort === "recent") query = query.order("created_at", { ascending: false });
  else if (filters.sort === "contacted") query = query.order("last_contacted_at", { ascending: false, nullsFirst: false });
  else query = query.order("full_name", { ascending: true });

  const from = (filters.page - 1) * CONTACT_PAGE_SIZE;
  const { data, count } = await query.range(from, from + CONTACT_PAGE_SIZE - 1);

  const items: ContactListItem[] = (data ?? []).map((c) => ({
    id: c.id,
    fullName: c.full_name ?? "",
    company: c.company,
    roles: c.roles,
    phone: c.phone,
    email: c.email,
    ownerId: c.owner_agent_id,
    ownerName: c.owner?.full_name ?? null,
    lastContactedAt: c.last_contacted_at,
    daysSinceContact: c.last_contacted_at ? calendarDaysBetween(c.last_contacted_at, now) : null,
    createdAt: c.created_at,
  }));

  let directory: DirectoryHit[] = [];
  if (ctx.role === "agent" && term.length >= 2 && filters.page === 1) {
    const { data: hits } = await supabase.rpc("contact_directory", { p_org: ctx.organization.id, p_query: term, p_limit: 6 });
    directory = (hits ?? [])
      .filter((h) => !h.is_mine)
      .map((h) => ({ id: h.id, fullName: h.full_name, roles: h.roles, ownerName: h.owner_name }));
  }

  return { items, total: count ?? items.length, pageSize: CONTACT_PAGE_SIZE, directory };
}

/** A szervezet ügynökei és irodavezetői (felelős-választó és szűrő). */
export async function getOwnerOptions(ctx: AppContext): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("user_id, profile:profiles!memberships_user_id_fkey (full_name)")
    .eq("organization_id", ctx.organization.id)
    .eq("status", "active")
    .in("role", ["owner", "agent"]);
  return (data ?? [])
    .map((m) => ({ id: m.user_id, name: m.profile?.full_name ?? "" }))
    .filter((a) => a.name)
    .sort((a, b) => a.name.localeCompare(b.name, "hu"));
}
