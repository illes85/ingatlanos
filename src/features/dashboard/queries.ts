import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { signedCoverUrls } from "@/lib/media/signed-urls";
import { SELLER_STAGES, isPreCloseStage } from "@/config/pipeline";
import { planHasFeature } from "@/config/plans";
import {
  budapestDayRange,
  budapestMonthStart,
  calendarDaysBetween,
  formatShortAddress,
  givenName,
} from "@/lib/format";
import type { AlertItem, DashboardData, RecentProperty, ShowingItem, StageBar } from "./types";

type Client = SupabaseClient<Database>;
const DAY = 86_400_000;
const ACTIVE_LISTING: Database["public"]["Enums"]["property_status"][] = ["active", "under_offer", "reserved"];

/**
 * A „Ma” irányítópult adatai. Minden lekérdezés a felhasználó munkamenetével, RLS alatt fut.
 * Nézőpont: a saját munkám (ügynök/irodavezető); az asszisztens az iroda egészét látja.
 */
export async function getDashboardData(ctx: AppContext, now = new Date()): Promise<DashboardData> {
  const supabase = await createClient();
  const mine = ctx.role !== "assistant";
  const orgId = ctx.organization.id;
  const today = budapestDayRange(now);

  const [commission, pipeline, mandates, leads, callList, showings, stages, alerts, recent, todoCount] = await Promise.all([
    getCommission(supabase, ctx, now),
    getPipelineValue(supabase, orgId, mine ? ctx.userId : null, now),
    getMandates(supabase, orgId, mine ? ctx.userId : null),
    getLeadCounts(supabase, orgId),
    getCallList(supabase, orgId, planHasFeature(ctx.effectivePlan, "ai.call_list")),
    getShowings(supabase, orgId, mine ? ctx.userId : null, today),
    getStages(supabase, orgId, mine ? ctx.userId : null),
    getAlerts(supabase, orgId, mine ? ctx.userId : null, now),
    getRecentProperties(supabase, orgId, now),
    getTodoCount(supabase, ctx.userId, today.end),
  ]);

  return {
    firstName: givenName(ctx.fullName),
    todoCount,
    commission,
    pipeline,
    mandates,
    leads,
    callList,
    showings,
    stages,
    alerts,
    recent,
  };
}

async function getCommission(supabase: Client, ctx: AppContext, now: Date) {
  const { data } = await supabase
    .from("commission_splits")
    .select("amount, commission:commissions!inner (status, earned_at)")
    .eq("agent_id", ctx.userId)
    .in("commission.status", ["earned", "invoiced", "paid"])
    .gte("commission.earned_at", budapestMonthStart(now).toISOString());
  const earned = (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  return { earned, goal: ctx.monthlyCommissionGoal ? Number(ctx.monthlyCommissionGoal) : null };
}

async function getPipelineValue(supabase: Client, orgId: string, agentId: string | null, now: Date) {
  let query = supabase
    .from("deals")
    .select("expected_value, created_at, closed_at, status")
    .eq("organization_id", orgId)
    .gte("created_at", "1970-01-01");
  if (agentId) query = query.eq("agent_id", agentId);
  const { data } = await query;

  const weekAgo = now.getTime() - 7 * DAY;
  let value = 0;
  let previous = 0;
  for (const deal of data ?? []) {
    const amount = Number(deal.expected_value ?? 0);
    if (deal.status === "open") value += amount;
    const openWeekAgo =
      new Date(deal.created_at).getTime() <= weekAgo &&
      (deal.status === "open" || (deal.closed_at !== null && new Date(deal.closed_at).getTime() > weekAgo));
    if (openWeekAgo) previous += amount;
  }
  return { value, trendPct: previous > 0 ? ((value - previous) / previous) * 100 : null };
}

async function getMandates(supabase: Client, orgId: string, agentId: string | null) {
  let query = supabase
    .from("properties")
    .select("mandate_type")
    .eq("organization_id", orgId)
    .in("status", ACTIVE_LISTING)
    .not("mandate_type", "is", null);
  if (agentId) query = query.eq("responsible_agent_id", agentId);
  const { data } = await query;
  return {
    active: data?.length ?? 0,
    exclusive: (data ?? []).filter((p) => p.mandate_type === "exclusive").length,
  };
}

async function getLeadCounts(supabase: Client, orgId: string) {
  const { data } = await supabase.from("leads").select("urgent").eq("organization_id", orgId).eq("status", "new");
  return { fresh: data?.length ?? 0, urgent: (data ?? []).filter((l) => l.urgent).length };
}

async function getCallList(supabase: Client, orgId: string, unlocked: boolean) {
  const { data, count } = await supabase
    .from("leads")
    .select(
      "id, full_name, phone, ai_score, ai_score_reason, property:properties (city, district, subtype, property_type), contact:contacts (full_name, roles, phone, search_profiles (name, active))",
      { count: "exact" },
    )
    .eq("organization_id", orgId)
    .in("status", ["new", "read", "contacted"])
    .not("ai_score", "is", null)
    .order("ai_score", { ascending: false })
    .limit(4);

  const items = (data ?? []).map((lead) => {
    const contact = lead.contact;
    const profile = contact?.search_profiles?.find((p) => p.active);
    const property = lead.property;
    const context = property
      ? `${property.district ? formatShortAddress({ city: property.city, district: property.district }) : property.city}${property.subtype ? `, ${property.subtype}` : ""}`
      : (profile?.name ?? null);
    return {
      id: lead.id,
      name: contact?.full_name ?? lead.full_name ?? "",
      role: contact?.roles?.[0] ?? null,
      context,
      reason: lead.ai_score_reason,
      score: lead.ai_score ?? 0,
      phone: contact?.phone ?? lead.phone,
    };
  });
  return { items, total: count ?? items.length, locked: !unlocked };
}

async function getShowings(supabase: Client, orgId: string, agentId: string | null, today: { start: Date; end: Date }): Promise<ShowingItem[]> {
  let query = supabase
    .from("showings")
    .select(
      "id, starts_at, status, feedback_requested_at, property_id, property:properties (city, district, street, subtype, property_type, rooms, price), buyer:contacts (full_name)",
    )
    .eq("organization_id", orgId)
    .neq("status", "cancelled")
    .gte("starts_at", today.start.toISOString())
    .lt("starts_at", today.end.toISOString())
    .order("starts_at");
  if (agentId) query = query.eq("agent_id", agentId);
  const { data } = await query;
  const photos = await signedCoverUrls(supabase, [...new Set((data ?? []).map((s) => s.property_id))]);

  return (data ?? []).map((s) => {
    const p = s.property;
    const address = p ? formatShortAddress({ city: p.city, district: p.district, street: p.street }) : "";
    return {
      id: s.id,
      startsAt: s.starts_at,
      status: s.status,
      feedbackRequested: Boolean(s.feedback_requested_at),
      address,
      propertyLabel: p?.subtype ?? "",
      buyerName: s.buyer?.full_name ?? null,
      price: p ? Number(p.price) : null,
      photoUrl: photos.get(s.property_id) ?? null,
      mapsQuery: address,
      propertyId: s.property_id,
    };
  });
}

async function getStages(supabase: Client, orgId: string, agentId: string | null): Promise<StageBar[]> {
  let query = supabase
    .from("deals")
    .select("stage, expected_value")
    .eq("organization_id", orgId)
    .eq("side", "seller")
    .eq("status", "open");
  if (agentId) query = query.eq("agent_id", agentId);
  const { data } = await query;

  return SELLER_STAGES.filter((stage) => stage !== "closed").map((stage) => {
    const rows = (data ?? []).filter((d) => d.stage === stage);
    return {
      stage,
      count: rows.length,
      value: rows.reduce((sum, d) => sum + Number(d.expected_value ?? 0), 0),
      preClose: isPreCloseStage(stage),
    };
  });
}

async function getAlerts(supabase: Client, orgId: string, agentId: string | null, now: Date): Promise<AlertItem[]> {
  const in14 = new Date(now.getTime() + 14 * DAY).toISOString().slice(0, 10);
  const in3 = new Date(now.getTime() + 3 * DAY).toISOString().slice(0, 10);
  const staleBefore = new Date(now.getTime() - 14 * DAY).toISOString();

  let deposits = supabase
    .from("offers")
    .select("id, deposit_deadline, property:properties!inner (id, city, district, street, responsible_agent_id)")
    .eq("organization_id", orgId)
    .in("status", ["accepted", "pending"])
    .not("deposit_deadline", "is", null)
    .lte("deposit_deadline", in3);
  let mandates = supabase
    .from("properties")
    .select("id, city, district, street, mandate_expires_at")
    .eq("organization_id", orgId)
    .in("status", ACTIVE_LISTING)
    .not("mandate_expires_at", "is", null)
    .lte("mandate_expires_at", in14);
  let stale = supabase
    .from("deals")
    .select("id, stage_entered_at, property:properties (id, city, district, street)")
    .eq("organization_id", orgId)
    .eq("status", "open")
    .eq("side", "seller")
    .eq("stage", "listed")
    .lt("stage_entered_at", staleBefore);
  if (agentId) {
    deposits = deposits.eq("property.responsible_agent_id", agentId);
    mandates = mandates.eq("responsible_agent_id", agentId);
    stale = stale.eq("agent_id", agentId);
  }
  const [d, m, s] = await Promise.all([deposits, mandates, stale]);

  const alerts: AlertItem[] = [];
  for (const offer of d.data ?? []) {
    const daysLeft = calendarDaysBetween(now, `${offer.deposit_deadline}T12:00:00Z`);
    if (daysLeft < 0) continue;
    alerts.push({ kind: "deposit", severity: "danger", daysLeft, address: formatShortAddress(offer.property), href: `/ingatlanok/${offer.property.id}` });
  }
  for (const p of m.data ?? []) {
    const daysLeft = calendarDaysBetween(now, `${p.mandate_expires_at}T12:00:00Z`);
    if (daysLeft < 0) continue;
    alerts.push({ kind: "mandate", severity: "warning", daysLeft, address: formatShortAddress(p), href: `/ingatlanok/${p.id}` });
  }
  for (const deal of s.data ?? []) {
    if (!deal.property) continue;
    const days = calendarDaysBetween(deal.stage_entered_at, now);
    alerts.push({ kind: "stale", severity: "neutral", days, address: formatShortAddress(deal.property), href: `/ingatlanok/${deal.property.id}` });
  }
  const order = { danger: 0, warning: 1, neutral: 2 } as const;
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 4);
}

async function getRecentProperties(supabase: Client, orgId: string, now: Date): Promise<RecentProperty[]> {
  const { data } = await supabase
    .from("properties")
    .select("id, price, city, district, street, area_sqm, rooms, half_rooms, floor, property_type, energy_rating, status, listed_at, created_at")
    .eq("organization_id", orgId)
    .in("status", ["draft", ...ACTIVE_LISTING])
    .order("created_at", { ascending: false })
    .limit(3);
  const photos = await signedCoverUrls(supabase, (data ?? []).map((p) => p.id));

  return (data ?? []).map((p) => ({
    id: p.id,
    price: Number(p.price),
    address: formatShortAddress(p),
    areaSqm: p.area_sqm === null ? null : Number(p.area_sqm),
    rooms: p.rooms,
    halfRooms: p.half_rooms,
    floor: p.floor,
    propertyType: p.property_type,
    energyRating: p.energy_rating,
    status: p.status,
    daysSinceListed: calendarDaysBetween(p.listed_at ?? p.created_at, now),
    photoUrl: photos.get(p.id) ?? null,
  }));
}

async function getTodoCount(supabase: Client, userId: string, endOfToday: Date) {
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("assignee_id", userId)
    .eq("status", "open")
    .lt("due_at", endOfToday.toISOString());
  return count ?? 0;
}
