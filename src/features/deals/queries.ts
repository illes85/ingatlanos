import "server-only";
import type { AppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { signedCoverUrls } from "@/lib/media/signed-urls";
import { calendarDaysBetween, formatShortAddress } from "@/lib/format";
import { DEFAULT_PROBABILITY, type DealSide } from "@/config/pipeline";
import type { DealBoard, DealCardData } from "./types";

/** A lezárt (megnyert) ügyletek ennyi napig maradnak a tábla „Lezárva” oszlopában. */
const CLOSED_VISIBLE_DAYS = 30;

const COLUMNS =
  "id, side, stage, status, title, expected_value, probability, stage_entered_at, closed_at, agent_id, property:properties (id, property_type, city, district, street), contact:contacts (full_name, company), agent:profiles!deals_agent_id_fkey (full_name)";

/**
 * Egy oldal (eladói/vevői) ügylettáblája a felhasználó munkamenetével, RLS alatt: az ügynök a saját
 * ügyleteit látja, az owner és az asszisztens az egész irodáét. A nyitott ügyletek mellett a
 * legutóbb megnyert ügyletek is megjelennek; az elvesztettek nem.
 */
export async function getDealBoard(ctx: AppContext, side: DealSide, now = new Date()): Promise<DealBoard> {
  const supabase = await createClient();
  const since = new Date(now.getTime() - CLOSED_VISIBLE_DAYS * 86_400_000).toISOString();

  const { data } = await supabase
    .from("deals")
    .select(COLUMNS)
    .eq("organization_id", ctx.organization.id)
    .eq("side", side)
    .or(`status.eq.open,and(status.eq.won,closed_at.gte.${since})`)
    .order("stage_entered_at", { ascending: true })
    .limit(500);

  const rows = data ?? [];
  const covers = await signedCoverUrls(
    supabase,
    rows.flatMap((d) => (d.property ? [d.property.id] : [])),
  );

  const deals: DealCardData[] = rows.map((d) => ({
    id: d.id,
    side: d.side,
    stage: d.stage,
    status: d.status,
    title: d.property
      ? formatShortAddress({ city: d.property.city, district: d.property.district, street: d.property.street })
      : (d.title ?? ""),
    propertyId: d.property?.id ?? null,
    propertyType: d.property?.property_type ?? null,
    coverUrl: d.property ? (covers.get(d.property.id) ?? null) : null,
    contactName: d.contact?.full_name || d.contact?.company || null,
    agentName: d.agent?.full_name ?? null,
    expectedValue: d.expected_value === null ? null : Number(d.expected_value),
    daysInStage: calendarDaysBetween(d.stage_entered_at, now),
    canMove: ctx.role === "owner" || d.agent_id === ctx.userId,
  }));

  const open = rows.filter((d) => d.status === "open");
  const weightedValue = open.reduce((sum, d) => {
    const value = d.expected_value === null ? 0 : Number(d.expected_value);
    return sum + (value * (d.probability ?? DEFAULT_PROBABILITY[d.stage])) / 100;
  }, 0);

  return { side, deals, openCount: open.length, weightedValue };
}
