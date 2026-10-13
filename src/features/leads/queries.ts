import "server-only";
import type { AppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { LEAD_PAGE_SIZE, TAB_STATUSES, type LeadFilters, type LeadTab } from "./filters";
import type { LeadItem, LeadListResult } from "./types";

const COLUMNS =
  "id, full_name, email, phone, phone_normalized, source, source_detail, status, urgent, raw_message, received_at, ai_score, ai_score_reason, assigned_to, assignee:profiles!leads_assigned_to_fkey (full_name), property:properties (id, title, code), contact:contacts (id, full_name)";

/**
 * A lead-postaláda a felhasználó munkamenetével, RLS alatt: az ügynök a hozzá rendelt és a kiosztatlan
 * leadeket látja, az owner és az asszisztens az egész irodáét. Az új, még át nem alakított leadekhez
 * jelezzük az irodában már szereplő egyező ügyfelet (telefon/e-mail alapján).
 */
export async function getLeads(ctx: AppContext, filters: LeadFilters): Promise<LeadListResult> {
  const supabase = await createClient();
  const orgId = ctx.organization.id;

  const countFor = async (tab: LeadTab) => {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", [...TAB_STATUSES[tab]]);
    return count ?? 0;
  };

  const from = (filters.page - 1) * LEAD_PAGE_SIZE;
  const [listRes, aktiv, uj, atalakitott, lezart] = await Promise.all([
    supabase
      .from("leads")
      .select(COLUMNS, { count: "exact" })
      .eq("organization_id", orgId)
      .in("status", [...TAB_STATUSES[filters.tab]])
      .order("urgent", { ascending: false })
      .order("received_at", { ascending: false })
      .range(from, from + LEAD_PAGE_SIZE - 1),
    countFor("aktiv"),
    countFor("uj"),
    countFor("atalakitott"),
    countFor("lezart"),
  ]);

  const rows = listRes.data ?? [];
  const items: LeadItem[] = await Promise.all(
    rows.map(async (l) => {
      let duplicates: LeadItem["duplicates"] = [];
      const open = !l.contact && l.status !== "converted" && l.status !== "spam" && l.status !== "archived";
      if (open && (l.phone || l.email)) {
        const { data: hits } = await supabase.rpc("find_duplicate_contacts", {
          p_org: orgId,
          p_phone: l.phone_normalized ?? normalizePhone(l.phone) ?? "",
          p_email: l.email ?? "",
        });
        duplicates = (hits ?? []).map((h) => ({ id: h.id, fullName: h.full_name, ownerName: h.owner_name, match: h.match === "phone" ? "phone" : "email" }));
      }
      return {
        id: l.id,
        fullName: l.full_name ?? "",
        email: l.email,
        phone: l.phone,
        source: l.source,
        sourceDetail: l.source_detail,
        status: l.status,
        urgent: l.urgent,
        message: l.raw_message,
        receivedAt: l.received_at,
        aiScore: l.ai_score,
        aiReason: l.ai_score_reason,
        assignedTo: l.assigned_to,
        assigneeName: l.assignee?.full_name ?? null,
        property: l.property ? { id: l.property.id, title: l.property.title ?? "", code: l.property.code } : null,
        contact: l.contact ? { id: l.contact.id, name: l.contact.full_name ?? "" } : null,
        duplicates,
      };
    }),
  );

  return { items, total: listRes.count ?? items.length, pageSize: LEAD_PAGE_SIZE, counts: { aktiv, uj, atalakitott, lezart } };
}
