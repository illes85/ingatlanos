import { createClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/session";
import { budapestDayKey, budapestMidnight, formatShortAddress } from "@/lib/format";
import { addDays } from "./calendar";

export type ShowingStatusValue = "scheduled" | "completed" | "cancelled" | "no_show";

export interface CalendarShowing {
  kind: "showing";
  id: string;
  at: string;
  status: ShowingStatusValue;
  address: string;
  code: string;
  buyerName: string | null;
  agentName: string | null;
}

export interface CalendarTask {
  kind: "task";
  id: string;
  at: string;
  title: string;
}

export type CalendarItem = CalendarShowing | CalendarTask;

/** A megadott napok bemutatói és határidős (nyitott) feladatai napkulcsonként csoportosítva. Láthatóságot az RLS ad. */
export async function getCalendarItems(ctx: AppContext, days: string[]): Promise<Map<string, CalendarItem[]>> {
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const from = budapestMidnight(days[0]!).toISOString();
  const to = budapestMidnight(addDays(days[days.length - 1]!, 1)).toISOString();

  const [showings, tasks] = await Promise.all([
    supabase
      .from("showings")
      .select(
        "id, starts_at, status, property:properties (code, city, district, street), buyer:contacts (full_name), agent:profiles!showings_agent_id_fkey (full_name)",
      )
      .eq("organization_id", orgId)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at"),
    supabase
      .from("tasks")
      .select("id, title, due_at")
      .eq("organization_id", orgId)
      .eq("status", "open")
      .gte("due_at", from)
      .lt("due_at", to)
      .order("due_at"),
  ]);

  const byDay = new Map<string, CalendarItem[]>(days.map((d) => [d, []]));
  for (const s of showings.data ?? []) {
    byDay.get(budapestDayKey(s.starts_at))?.push({
      kind: "showing",
      id: s.id,
      at: s.starts_at,
      status: s.status,
      address: s.property ? formatShortAddress({ city: s.property.city, district: s.property.district, street: s.property.street }) : "",
      code: s.property?.code ?? "",
      buyerName: s.buyer?.full_name ?? null,
      agentName: s.agent?.full_name ?? null,
    });
  }
  for (const t of tasks.data ?? []) {
    if (t.due_at) byDay.get(budapestDayKey(t.due_at))?.push({ kind: "task", id: t.id, at: t.due_at, title: t.title });
  }
  for (const list of byDay.values()) list.sort((a, b) => a.at.localeCompare(b.at));
  return byDay;
}

export interface ShowingDetail {
  id: string;
  startsAt: string;
  endsAt: string | null;
  status: ShowingStatusValue;
  notes: string | null;
  feedbackRating: number | null;
  feedbackText: string | null;
  feedbackRequestedAt: string | null;
  property: { id: string; code: string; title: string | null; address: string } | null;
  buyer: { id: string; name: string; phone: string | null; email: string | null } | null;
  agentName: string | null;
}

export async function getShowingDetail(ctx: AppContext, id: string): Promise<ShowingDetail | null> {
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("showings")
    .select(
      "id, starts_at, ends_at, status, notes, feedback_rating, feedback_text, feedback_requested_at, property:properties (id, code, title, city, district, street), buyer:contacts (id, full_name, company, phone, email), agent:profiles!showings_agent_id_fkey (full_name)",
    )
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!s) return null;
  return {
    id: s.id,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    status: s.status,
    notes: s.notes,
    feedbackRating: s.feedback_rating,
    feedbackText: s.feedback_text,
    feedbackRequestedAt: s.feedback_requested_at,
    property: s.property
      ? { id: s.property.id, code: s.property.code, title: s.property.title, address: formatShortAddress({ city: s.property.city, district: s.property.district, street: s.property.street }) }
      : null,
    buyer: s.buyer ? { id: s.buyer.id, name: s.buyer.full_name || s.buyer.company || "–", phone: s.buyer.phone, email: s.buyer.email } : null,
    agentName: s.agent?.full_name ?? null,
  };
}
