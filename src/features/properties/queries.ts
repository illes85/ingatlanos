import "server-only";
import type { AppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { signedCoverUrls } from "@/lib/media/signed-urls";
import { calendarDaysBetween, formatShortAddress } from "@/lib/format";
import { PAGE_SIZE, STATUS_BY_GROUP, type PropertyFilters } from "./filters";
import type { PropertyListItem, PropertyListResult } from "./types";

const LIST_COLUMNS =
  "id, code, title, transaction_type, subtype, price, price_per_sqm, area_sqm, rooms, half_rooms, floor, property_type, energy_rating, status, status_changed_at, listed_at, created_at, mandate_type, mandate_expires_at, city, district, street, lat, lng, responsible:profiles!properties_responsible_agent_id_fkey (full_name)";

/** Az ingatlanlista a felhasználó munkamenetével, RLS alatt. A szűrés és a rendezés az adatbázisban történik. */
export async function getProperties(ctx: AppContext, filters: PropertyFilters, now = new Date()): Promise<PropertyListResult> {
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("organization_id", ctx.organization.id);

  const statuses = STATUS_BY_GROUP[filters.statusGroup];
  if (statuses) query = query.in("status", statuses);
  if (filters.transaction) query = query.eq("transaction_type", filters.transaction);
  if (filters.types.length) query = query.in("property_type", filters.types);
  if (filters.priceMinM !== null) query = query.gte("price", filters.priceMinM * 1_000_000);
  if (filters.priceMaxM !== null) query = query.lte("price", filters.priceMaxM * 1_000_000);
  if (filters.roomsMin !== null) query = query.gte("rooms", filters.roomsMin);
  if (filters.q) {
    // A keresőszöveg a generált search_text oszlopra illeszkedik; a speciális karaktereket levágjuk.
    const term = filters.q.toLowerCase().replace(/[%,()*\\]/g, " ").trim();
    if (term) query = query.ilike("search_text", `%${term}%`);
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "area_desc":
      query = query.order("area_sqm", { ascending: false, nullsFirst: false });
      break;
    case "mandate":
      query = query.order("mandate_expires_at", { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const rows = data ?? [];
  const photos = await signedCoverUrls(supabase, rows.map((p) => p.id));

  const items: PropertyListItem[] = rows.map((p) => ({
    id: p.id,
    code: p.code,
    title: p.title,
    transactionType: p.transaction_type,
    subtype: p.subtype,
    price: Number(p.price),
    pricePerSqm: p.price_per_sqm === null ? null : Number(p.price_per_sqm),
    address: formatShortAddress(p),
    areaSqm: p.area_sqm === null ? null : Number(p.area_sqm),
    rooms: p.rooms,
    halfRooms: p.half_rooms,
    floor: p.floor,
    propertyType: p.property_type,
    energyRating: p.energy_rating,
    status: p.status,
    daysSinceListed: calendarDaysBetween(p.listed_at ?? p.created_at, now),
    daysInStatus: calendarDaysBetween(p.status_changed_at, now),
    photoUrl: photos.get(p.id) ?? null,
    responsibleName: p.responsible?.full_name ?? null,
    mandateType: p.mandate_type,
    mandateExpiresAt: p.mandate_expires_at,
    mandateDaysLeft: p.mandate_expires_at ? calendarDaysBetween(now, p.mandate_expires_at) : null,
    lat: p.lat,
    lng: p.lng,
  }));

  return { items, total: count ?? items.length, pageSize: PAGE_SIZE };
}

/** A szervezet ügynökei és irodavezetői a „Felelős ügynök” választóhoz. */
export async function getAgentOptions(ctx: AppContext): Promise<{ id: string; name: string }[]> {
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
