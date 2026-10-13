import "server-only";
import type { AppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { calendarDaysBetween, districtLabel } from "@/lib/format";
import { MIN_MATCH_SCORE, scoreMatch } from "./matching";
import type { PropertyDetail, PropertyMatchItem, PropertyMediaItem } from "./detail-types";

const SIGNED_URL_SECONDS = 3600;
const MAX_MATCHES = 6;

/**
 * Egy ingatlan adatlapjának összes adata. Minden lekérdezés a felhasználó munkamenetével, RLS alatt fut:
 * ami a szerepkörnek nem látható (pl. jutalékfeltétel az asszisztensnek), egyszerűen hiányzik.
 */
export async function getPropertyDetail(ctx: AppContext, id: string, now = new Date()): Promise<PropertyDetail | null> {
  const supabase = await createClient();
  const orgId = ctx.organization.id;

  const { data: property } = await supabase.from("properties").select("*").eq("id", id).eq("organization_id", orgId).maybeSingle();
  if (!property) return null;

  const [mediaRes, terms, showingsRes, leadsRes, activitiesRes, documentsRes, profilesRes, market, financingRes, responsible, seller] = await Promise.all([
    supabase.from("property_media").select("id, kind, caption, is_cover, is_public, sort_order, storage_path, external_url").eq("property_id", id).order("sort_order"),
    supabase.from("property_commission_terms").select("commission_pct, commission_fixed").eq("property_id", id).maybeSingle(),
    supabase
      .from("showings")
      .select("id, starts_at, status, feedback_rating, feedback_text, buyer:contacts (full_name), agent:profiles!showings_agent_id_fkey (full_name)")
      .eq("property_id", id)
      .order("starts_at", { ascending: false })
      .limit(50),
    supabase
      .from("leads")
      .select("id, full_name, source, status, urgent, raw_message, received_at, contact_id")
      .eq("property_id", id)
      .order("received_at", { ascending: false })
      .limit(50),
    supabase.from("activities").select("id, type, title, body, occurred_at").eq("property_id", id).order("occurred_at", { ascending: false }).limit(40),
    supabase.from("documents").select("id, title, kind, status, created_at").eq("property_id", id).order("created_at", { ascending: false }),
    supabase
      .from("search_profiles")
      .select(
        "contact_id, active, transaction_type, property_types, price_min, price_max, area_min, area_max, rooms_min, cities, districts, financing, mortgage_approved, urgency, contact:contacts!inner (full_name)",
      )
      .eq("organization_id", orgId)
      .eq("active", true)
      .eq("transaction_type", property.transaction_type),
    supabase
      .from("market_snapshots")
      .select("avg_price_per_sqm, district")
      .eq("city", property.city)
      .eq("property_type", property.property_type)
      .order("period", { ascending: false })
      .limit(20),
    supabase.from("lookup_values").select("key, label").eq("category", "financing").eq("active", true),
    property.responsible_agent_id
      ? supabase.from("profiles").select("id, full_name").eq("id", property.responsible_agent_id).maybeSingle()
      : Promise.resolve({ data: null }),
    property.seller_contact_id
      ? supabase.from("contacts").select("full_name").eq("id", property.seller_contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const mediaRows = mediaRes.data ?? [];
  const paths = mediaRows.map((m) => m.storage_path).filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length ? await supabase.storage.from("property-media").createSignedUrls(paths, SIGNED_URL_SECONDS) : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const media: PropertyMediaItem[] = mediaRows.map((m) => ({
    id: m.id,
    kind: m.kind,
    caption: m.caption,
    isCover: m.is_cover,
    isPublic: m.is_public,
    sortOrder: m.sort_order,
    url: m.storage_path ? (urlByPath.get(m.storage_path) ?? null) : m.external_url,
  }));

  // A finanszírozási formák szerkeszthető listából jönnek (a támogatások változnak, D-016).
  const financingLabels = new Map((financingRes.data ?? []).map((f) => [f.key, f.label]));
  const matches: PropertyMatchItem[] = (profilesRes.data ?? [])
    .map((p) => {
      const { score } = scoreMatch(
        {
          transactionType: property.transaction_type,
          propertyType: property.property_type,
          price: Number(property.price),
          areaSqm: property.area_sqm === null ? null : Number(property.area_sqm),
          rooms: property.rooms,
          city: property.city,
          district: property.district,
        },
        {
          active: p.active,
          transactionType: p.transaction_type,
          propertyTypes: p.property_types,
          priceMin: p.price_min === null ? null : Number(p.price_min),
          priceMax: p.price_max === null ? null : Number(p.price_max),
          areaMin: p.area_min === null ? null : Number(p.area_min),
          areaMax: p.area_max === null ? null : Number(p.area_max),
          roomsMin: p.rooms_min,
          cities: p.cities,
          districts: p.districts,
        },
      );
      return { p, score };
    })
    .filter((m): m is { p: (typeof m)["p"]; score: number } => m.score !== null && m.score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES)
    .map(({ p, score }) => ({
      contactId: p.contact_id,
      contactName: p.contact?.full_name ?? "",
      score,
      roomsMin: p.rooms_min,
      priceMax: p.price_max === null ? null : Number(p.price_max),
      places: [...p.cities, ...p.districts.map((d) => districtLabel(d))],
      financing: p.financing.map((key) => financingLabels.get(key) ?? key),
      mortgageApproved: p.mortgage_approved,
      urgency: p.urgency,
    }));

  const ratings = (showingsRes.data ?? []).map((s) => s.feedback_rating).filter((r): r is number => r !== null);
  const termRow = terms.data;
  const price = Number(property.price);
  const commission = termRow
    ? {
        pct: termRow.commission_pct === null ? null : Number(termRow.commission_pct),
        fixed: termRow.commission_fixed === null ? null : Number(termRow.commission_fixed),
        expectedAmount:
          termRow.commission_fixed !== null
            ? Number(termRow.commission_fixed)
            : termRow.commission_pct !== null
              ? Math.round((price * Number(termRow.commission_pct)) / 100)
              : null,
      }
    : null;

  // A kerületi átlag az elsődleges; ha nincs, a város bármely friss adata.
  const marketRows = market.data ?? [];
  const marketRow = marketRows.find((m) => property.district !== null && m.district === property.district) ?? marketRows[0];

  const mandateEnd = property.mandate_expires_at;
  const mandateStart = property.mandate_start;

  return {
    property,
    media,
    responsible: responsible.data ? { id: responsible.data.id, name: responsible.data.full_name } : null,
    sellerName: seller.data?.full_name ?? null,
    commission,
    marketAvgPricePerSqm: marketRow ? Number(marketRow.avg_price_per_sqm) : null,
    showings: (showingsRes.data ?? []).map((s) => ({
      id: s.id,
      startsAt: s.starts_at,
      status: s.status,
      buyerName: s.buyer?.full_name ?? null,
      agentName: s.agent?.full_name ?? null,
      feedbackRating: s.feedback_rating,
      feedbackText: s.feedback_text,
    })),
    leads: (leadsRes.data ?? []).map((l) => ({
      id: l.id,
      name: l.full_name,
      source: l.source,
      status: l.status,
      urgent: l.urgent,
      message: l.raw_message,
      receivedAt: l.received_at,
      contactId: l.contact_id,
    })),
    activities: (activitiesRes.data ?? []).map((a) => ({ id: a.id, type: a.type, title: a.title, body: a.body, occurredAt: a.occurred_at })),
    documents: (documentsRes.data ?? []).map((d) => ({ id: d.id, title: d.title, kind: d.kind, status: d.status, createdAt: d.created_at })),
    matches,
    stats: {
      views: property.view_count,
      leads: (leadsRes.data ?? []).length,
      showings: (showingsRes.data ?? []).filter((s) => s.status !== "cancelled").length,
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    },
    daysOnMarket: property.listed_at ? calendarDaysBetween(property.listed_at, now) : null,
    mandateDaysLeft: mandateEnd ? calendarDaysBetween(now, mandateEnd) : null,
    mandateTotalDays: mandateEnd && mandateStart ? calendarDaysBetween(mandateStart, mandateEnd) : null,
  };
}
