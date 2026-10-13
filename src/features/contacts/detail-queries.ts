import "server-only";
import type { AppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { calendarDaysBetween, districtLabel, formatShortAddress } from "@/lib/format";
import { MIN_MATCH_SCORE, scoreMatch, type MatchableProfile } from "@/features/properties/matching";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

const MAX_MATCHES = 5;
const CANDIDATE_LIMIT = 300;

export interface ProfileItem {
  id: string;
  name: string | null;
  transactionType: Enums["transaction_type"];
  propertyTypes: Enums["property_type"][];
  places: string[];
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  roomsMin: number | null;
  financing: string[];
  mortgageApproved: boolean;
  urgency: Enums["urgency"];
  active: boolean;
}

export interface RecommendationItem {
  id: string;
  propertyId: string;
  address: string;
  price: number;
  channel: string;
  reaction: "interested" | "not_interested" | "no_response" | null;
  sentAt: string;
}

export interface ContactMatchItem {
  propertyId: string;
  address: string;
  price: number;
  score: number;
  profileName: string | null;
}

export interface ContactDealItem {
  id: string;
  side: Enums["deal_side"];
  stage: Enums["deal_stage"];
  status: Enums["deal_status"];
  expectedValue: number | null;
  address: string | null;
  propertyId: string | null;
}

export interface ContactActivityItem {
  id: string;
  type: Enums["activity_type"];
  title: string;
  body: string | null;
  occurredAt: string;
}

export interface ContactDetail {
  contact: Tables["contacts"]["Row"];
  ownerName: string | null;
  profiles: ProfileItem[];
  recommendations: RecommendationItem[];
  matches: ContactMatchItem[];
  deals: ContactDealItem[];
  activities: ContactActivityItem[];
  sellerProperties: { id: string; address: string; price: number }[];
  daysSinceContact: number | null;
  /** A szerkesztő űrlap nyers profilsorai és a választható finanszírozási formák (szerkeszthető lista, D-016). */
  rawProfiles: Tables["search_profiles"]["Row"][];
  financingOptions: { key: string; label: string }[];
}

/** Az ügyfél adatlapjának adatai, RLS alatt: az ügynök csak a saját ügyfelét kapja meg (más ügyfélnél null). */
export async function getContactDetail(ctx: AppContext, id: string, now = new Date()): Promise<ContactDetail | null> {
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const { data: contact } = await supabase.from("contacts").select("*").eq("id", id).eq("organization_id", orgId).is("deleted_at", null).maybeSingle();
  if (!contact) return null;

  const [owner, profilesRes, recsRes, activitiesRes, dealsRes, sellerRes, candidatesRes, financingRes] = await Promise.all([
    contact.owner_agent_id ? supabase.from("profiles").select("full_name").eq("id", contact.owner_agent_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("search_profiles").select("*").eq("contact_id", id).order("created_at"),
    supabase
      .from("property_recommendations")
      .select("id, property_id, channel, reaction, sent_at, property:properties (city, district, street, price)")
      .eq("contact_id", id)
      .order("sent_at", { ascending: false })
      .limit(30),
    supabase.from("activities").select("id, type, title, body, occurred_at").eq("contact_id", id).order("occurred_at", { ascending: false }).limit(40),
    supabase
      .from("deals")
      .select("id, side, stage, status, expected_value, property_id, property:properties (city, district, street)")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("properties").select("id, price, city, district, street").eq("seller_contact_id", id),
    supabase
      .from("properties")
      .select("id, price, area_sqm, rooms, city, district, street, property_type, transaction_type")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .limit(CANDIDATE_LIMIT),
    supabase.from("lookup_values").select("key, label").eq("category", "financing").eq("active", true),
  ]);

  const financingLabels = Object.fromEntries((financingRes.data ?? []).map((f) => [f.key, f.label]));
  const profileRows = profilesRes.data ?? [];
  const profiles: ProfileItem[] = profileRows.map((p) => ({
    id: p.id,
    name: p.name,
    transactionType: p.transaction_type,
    propertyTypes: p.property_types,
    places: [...p.cities, ...p.districts.map((d) => `${districtLabel(d)} ker.`)],
    priceMin: p.price_min === null ? null : Number(p.price_min),
    priceMax: p.price_max === null ? null : Number(p.price_max),
    areaMin: p.area_min === null ? null : Number(p.area_min),
    roomsMin: p.rooms_min,
    financing: p.financing.map((k) => financingLabels[k] ?? k),
    mortgageApproved: p.mortgage_approved,
    urgency: p.urgency,
    active: p.active,
  }));

  // „Neki passzoló ingatlanok”: az aktív keresési profilok a kínálattal, a már ajánlottak nélkül.
  const alreadySent = new Set((recsRes.data ?? []).map((r) => r.property_id));
  const best = new Map<string, ContactMatchItem>();
  for (const p of profileRows) {
    if (!p.active) continue;
    const matchable: MatchableProfile = {
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
    };
    for (const c of candidatesRes.data ?? []) {
      if (alreadySent.has(c.id)) continue;
      const { score } = scoreMatch(
        {
          transactionType: c.transaction_type,
          propertyType: c.property_type,
          price: Number(c.price),
          areaSqm: c.area_sqm === null ? null : Number(c.area_sqm),
          rooms: c.rooms,
          city: c.city,
          district: c.district,
        },
        matchable,
      );
      if (score === null || score < MIN_MATCH_SCORE) continue;
      const previous = best.get(c.id);
      if (!previous || previous.score < score) {
        best.set(c.id, { propertyId: c.id, address: formatShortAddress(c), price: Number(c.price), score, profileName: p.name });
      }
    }
  }

  return {
    contact,
    ownerName: owner.data?.full_name ?? null,
    profiles,
    recommendations: (recsRes.data ?? []).map((r) => ({
      id: r.id,
      propertyId: r.property_id,
      address: r.property ? formatShortAddress(r.property) : "",
      price: r.property ? Number(r.property.price) : 0,
      channel: r.channel,
      reaction: r.reaction as RecommendationItem["reaction"],
      sentAt: r.sent_at,
    })),
    matches: [...best.values()].sort((a, b) => b.score - a.score).slice(0, MAX_MATCHES),
    deals: (dealsRes.data ?? []).map((d) => ({
      id: d.id,
      side: d.side,
      stage: d.stage,
      status: d.status,
      expectedValue: d.expected_value === null ? null : Number(d.expected_value),
      address: d.property ? formatShortAddress(d.property) : null,
      propertyId: d.property_id,
    })),
    activities: (activitiesRes.data ?? []).map((a) => ({ id: a.id, type: a.type, title: a.title, body: a.body, occurredAt: a.occurred_at })),
    sellerProperties: (sellerRes.data ?? []).map((p) => ({ id: p.id, address: formatShortAddress(p), price: Number(p.price) })),
    daysSinceContact: contact.last_contacted_at ? calendarDaysBetween(contact.last_contacted_at, now) : null,
    rawProfiles: profileRows,
    financingOptions: (financingRes.data ?? []).map((f) => ({ key: f.key, label: f.label })),
  };
}
