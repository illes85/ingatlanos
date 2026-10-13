/** Seed · ügyfelek, keresési profilok, ingatlanok, eladói és vevői ügyletek. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/types/database";
import { emailLocalPart, hungarianPhone, type Clock, type Random } from "../lib";
import { FIRST_NAMES, LAST_NAMES, NAMED_CONTACTS, type AgentKey } from "../data/people";
import { PLACES } from "../data/places";
import { SEED_PROPERTIES, type SeedProperty } from "../data/properties";

type Admin = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];
type Role = Database["public"]["Enums"]["contact_role"];

export interface SeedContext {
  admin: Admin;
  random: Random;
  clock: Clock;
  orgId: string;
  agents: Record<AgentKey, string>;
}

export interface ContactRef {
  id: string;
  key: string;
  name: string;
  roles: Role[];
  agent: AgentKey;
  phone: string;
}

/**
 * Tömeges beszúrás. A PostgREST a hiányzó mezőket a sorok közös kulcskészletéből null-nak
 * veszi, ezért az eltérő mezőkészletű sorokat kulcs szerint csoportosítjuk, és csoportonként
 * szúrjuk be, hogy az adatbázis alapértékei érvényesüljenek.
 */
async function insert<T extends keyof Tables>(admin: Admin, table: T, rows: Tables[T]["Insert"][]) {
  const groups = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const signature = Object.keys(row).sort().join("|");
    groups.set(signature, [...(groups.get(signature) ?? []), index]);
  });

  // Az eredmény az eredeti sorrendben jön vissza (a hívók index alapján párosítanak).
  const result: Tables[T]["Row"][] = new Array(rows.length);
  for (const indexes of groups.values()) {
    const { data, error } = await admin
      .from(table)
      .insert(indexes.map((i) => rows[i]) as never)
      .select();
    if (error) throw new Error(`${String(table)}: ${error.message}`);
    (data as unknown as Tables[T]["Row"][]).forEach((row, j) => {
      result[indexes[j]!] = row;
    });
  }
  return result;
}
export { insert };

const AGENT_POOL: AgentKey[] = ["anna", "anna", "eszter", "eszter", "balint", "peter"];
const SOURCES = ["portal", "website", "facebook", "phone", "referral"] as const;

export async function seedContacts(ctx: SeedContext): Promise<ContactRef[]> {
  const { random, clock } = ctx;
  const people: { key: string; name: string; roles: Role[]; agent: AgentKey }[] = [...NAMED_CONTACTS];
  const used = new Set(people.map((p) => p.name));

  while (people.length < 82) {
    const name = `${random.pick(LAST_NAMES)} ${random.pick(FIRST_NAMES)}`;
    if (used.has(name)) continue;
    used.add(name);
    const r = random.next();
    const roles: Role[] = r < 0.5 ? ["buyer"] : r < 0.75 ? ["seller"] : r < 0.83 ? ["tenant"] : r < 0.88 ? ["landlord"] : r < 0.95 ? ["investor", "buyer"] : ["other"];
    people.push({ key: `gen-${people.length}`, name, roles, agent: random.pick(AGENT_POOL) });
  }

  const rows = people.map((p) => {
    const [last, ...first] = p.name.replace(/^dr\. /, "").split(" ");
    const phone = hungarianPhone(random);
    const consent = random.chance(0.9);
    return {
      organization_id: ctx.orgId,
      owner_agent_id: ctx.agents[p.agent],
      last_name: p.name.startsWith("dr. ") ? `dr. ${last}` : last!,
      first_name: first.join(" "),
      email: `${emailLocalPart(p.name.replace(/^dr\. /, ""))}@example.com`,
      phone: phone.display,
      phone_normalized: phone.normalized,
      roles: p.roles,
      source: random.pick(SOURCES),
      tags: random.chance(0.25) ? [random.pick(["VIP", "Visszatérő", "Ajánló", "Befektető"])] : [],
      gdpr_consent_at: consent ? clock.daysAgo(random.int(5, 400)).toISOString() : null,
      gdpr_consent_scope: consent ? ["kapcsolattartas", "ajanlatkuldes"] : [],
      gdpr_notice_version: consent ? "2026-01" : null,
      pmt_status: p.roles.includes("seller") || p.roles.includes("buyer") ? random.pick(["completed", "completed", "in_progress", "not_started"] as const) : "not_started",
      last_contacted_at: clock.daysAgo(random.int(0, 40)).toISOString(),
      created_at: clock.daysAgo(random.int(10, 420)).toISOString(),
    } satisfies Tables["contacts"]["Insert"];
  });

  const inserted = await insert(ctx.admin, "contacts", rows);
  return inserted.map((row, i) => ({ id: row.id, key: people[i]!.key, name: people[i]!.name, roles: people[i]!.roles, agent: people[i]!.agent, phone: row.phone ?? "" }));
}

/** Vevői keresési profilok — a tervben szereplő szövegekkel a megnevezett vevőknél. */
export async function seedSearchProfiles(ctx: SeedContext, contacts: ContactRef[]) {
  const named: Record<string, Partial<Tables["search_profiles"]["Insert"]>> = {
    "varga-bence": { name: "Gödöllő, családi ház", cities: ["Gödöllő"], property_types: ["house"], price_max: 100_000_000, rooms_min: 4, must_have: ["kert", "garázs"], financing: ["mortgage"], mortgage_approved: true, urgency: "high" },
    "toth-marton": { name: "3 szobás, agglomeráció", cities: ["Dunakeszi", "Fót", "Gödöllő", "Veresegyház"], property_types: ["house"], price_max: 90_000_000, rooms_min: 3, financing: ["mortgage", "csok_plusz"], urgency: "high" },
    "szabo-reka": { name: "XIII. kerület, bérlés", transaction_type: "rent", cities: ["Budapest"], districts: [13], property_types: ["flat"], price_max: 320_000, rooms_min: 2, urgency: "medium" },
    "nagy-eszter": { name: "2 szobás, XIII. kerület", cities: ["Budapest"], districts: [13], property_types: ["flat"], price_max: 66_000_000, rooms_min: 2, financing: ["mortgage"], mortgage_approved: true, urgency: "high" },
    "molnar-dora": { name: "4 szoba Gödöllőn", cities: ["Gödöllő"], property_types: ["house"], price_max: 98_000_000, rooms_min: 4, financing: ["csok_plusz"], urgency: "medium" },
    "farkas-adam": { name: "Agglomeráció, 92 M keret", cities: ["Gödöllő", "Mogyoród", "Kerepes"], property_types: ["house"], price_max: 92_000_000, rooms_min: 3, financing: ["cash"], urgency: "medium" },
    "kovacs-lilla": { name: "Nagy kertes ház", cities: ["Gödöllő", "Veresegyház"], property_types: ["house"], price_max: 100_000_000, rooms_min: 3, must_have: ["nagy kert"], financing: ["mortgage"], urgency: "low" },
    "simon-daniel": { name: "Budai polgári lakás", cities: ["Budapest"], districts: [11, 12, 1], property_types: ["flat"], price_max: 82_000_000, rooms_min: 2, financing: ["mortgage"], mortgage_approved: true, urgency: "high" },
    "gal-noemi": { name: "Kertkapcsolatos lakás", cities: ["Veresegyház", "Gödöllő"], property_types: ["flat"], price_max: 62_000_000, rooms_min: 3, financing: ["otthon_start"], urgency: "high" },
  };
  const cityPool = Object.values(PLACES);
  const rows: Tables["search_profiles"]["Insert"][] = [];
  for (const c of contacts.filter((c) => c.roles.includes("buyer") || c.roles.includes("tenant"))) {
    const preset = named[c.key];
    if (preset) {
      rows.push({ organization_id: ctx.orgId, contact_id: c.id, ...preset });
      continue;
    }
    const place = ctx.random.pick(cityPool);
    const isRent = c.roles.includes("tenant");
    const isHouse = !place.district && ctx.random.chance(0.6);
    const area = isHouse ? ctx.random.int(90, 160) : ctx.random.int(40, 90);
    const max = isRent ? ctx.random.int(22, 45) * 10_000 : Math.round((place.sqmPrice * area) / 1_000_000) * 1_000_000;
    const rooms = isHouse ? ctx.random.int(3, 5) : ctx.random.int(1, 3);
    rows.push({
      organization_id: ctx.orgId,
      contact_id: c.id,
      name: `${rooms} szobás, ${place.district ? `${place.district}. ker.` : place.city}`,
      transaction_type: isRent ? "rent" : "sale",
      cities: [place.city],
      districts: place.district ? [place.district] : [],
      property_types: [isHouse ? "house" : "flat"],
      price_min: Math.round(max * 0.7),
      price_max: max,
      area_min: area - 15,
      rooms_min: rooms,
      financing: isRent ? [] : [ctx.random.pick(["cash", "mortgage", "mortgage", "csok_plusz", "otthon_start"])],
      mortgage_approved: ctx.random.chance(0.3),
      urgency: ctx.random.pick(["low", "medium", "medium", "high"] as const),
    });
  }
  await insert(ctx.admin, "search_profiles", rows);
}

const STAGE_STATUS: Record<NonNullable<SeedProperty["stage"]>, Database["public"]["Enums"]["property_status"]> = {
  acquisition: "draft", assessment: "draft", mandate_signed: "draft", listed: "active",
  offer: "under_offer", deposit: "reserved", contract: "reserved", closed: "sold",
};
const STAGE_PROBABILITY = { acquisition: 10, assessment: 20, mandate_signed: 35, listed: 45, offer: 65, deposit: 85, contract: 95, closed: 100 };

export interface PropertyRef {
  id: string;
  key: string;
  seed: SeedProperty;
  sellerId: string;
}

export async function seedProperties(ctx: SeedContext, contacts: ContactRef[]): Promise<PropertyRef[]> {
  const { random, clock } = ctx;
  const byKey = new Map(contacts.map((c) => [c.key, c]));
  const spareSellers = contacts.filter((c) => c.key.startsWith("gen-") && c.roles.includes("seller"));
  let spare = 0;

  const sellers = SEED_PROPERTIES.map((p) => (p.seller ? byKey.get(p.seller)! : spareSellers[spare++ % spareSellers.length]!));
  const rows = SEED_PROPERTIES.map((p, i) => {
    const place = PLACES[p.place]!;
    const listedDaysAgo = p.stage && ["listed", "offer", "deposit", "contract", "closed"].includes(p.stage) ? Math.max(1, p.createdDaysAgo - 7) : p.stage ? null : Math.max(1, p.createdDaysAgo - 2);
    return {
      organization_id: ctx.orgId,
      code: p.key === "godollo-szabadsag" ? "K-1042" : "",
      title: p.title,
      transaction_type: p.rent ? "rent" : "sale",
      property_type: p.type,
      subtype: p.subtype,
      status: p.stage ? STAGE_STATUS[p.stage] : "active",
      responsible_agent_id: ctx.agents[p.agent],
      seller_contact_id: sellers[i]!.id,
      price: p.price,
      area_sqm: p.area,
      lot_sqm: p.lot ?? null,
      rooms: p.rooms,
      half_rooms: p.half ?? 0,
      floor: p.floor ?? null,
      building_floors: p.floors ?? null,
      has_elevator: p.elevator ?? null,
      heating: p.heating,
      building_material: p.material,
      condition: p.condition,
      year_built: p.year,
      energy_rating: p.energy,
      has_terrace: p.terrace ?? false,
      garden_connected: p.garden ?? false,
      parking: p.parking ?? null,
      common_cost_monthly: p.type === "flat" ? random.int(12, 45) * 1000 : null,
      utilities_monthly: p.type === "plot" ? null : random.int(25, 70) * 1000,
      description: p.description ?? `${p.title}. ${p.highlights.join(", ")}.`,
      highlights: p.highlights,
      postal_code: place.postal,
      city: place.city,
      district: place.district ?? null,
      street: p.street,
      house_number: p.houseNo,
      lat: random.jitter(place.lat, 0.012),
      lng: random.jitter(place.lng, 0.018),
      address_visibility: "street",
      mandate_type: p.mandate ?? null,
      mandate_start: p.mandate ? clock.dateAhead(-p.createdDaysAgo + 1) : null,
      mandate_expires_at: p.mandate && p.mandateDays ? clock.dateAhead(p.mandateDays) : null,
      listed_at: listedDaysAgo !== null ? clock.daysAgo(listedDaysAgo).toISOString() : null,
      public_slug: `${p.key}-${i + 1}`,
      public_enabled: Boolean(p.stage === "listed" || !p.stage),
      view_count: p.key === "godollo-szabadsag" ? 1284 : random.int(40, 900),
      created_at: clock.daysAgo(p.createdDaysAgo).toISOString(),
    } satisfies Tables["properties"]["Insert"];
  });

  const inserted = await insert(ctx.admin, "properties", rows);
  const refs = inserted.map((row, i) => ({ id: row.id, key: SEED_PROPERTIES[i]!.key, seed: SEED_PROPERTIES[i]!, sellerId: sellers[i]!.id }));

  const terms = refs
    .filter((r) => r.seed.commissionPct)
    .map((r) => ({ property_id: r.id, organization_id: ctx.orgId, commission_pct: r.seed.commissionPct! }));
  await insert(ctx.admin, "property_commission_terms", terms);
  return refs;
}

export async function seedSellerDeals(ctx: SeedContext, properties: PropertyRef[]) {
  const rows = properties
    .filter((p) => p.seed.stage)
    .map((p) => {
      const stage = p.seed.stage!;
      const entered = ctx.clock.daysAgo(p.seed.stageDays ?? 1).toISOString();
      return {
        organization_id: ctx.orgId,
        side: "seller",
        stage,
        status: stage === "closed" ? "won" : "open",
        title: p.seed.title,
        property_id: p.id,
        contact_id: p.sellerId,
        agent_id: ctx.agents[p.seed.agent],
        expected_value: p.seed.price,
        probability: STAGE_PROBABILITY[stage],
        expected_close_date: stage === "closed" ? null : ctx.clock.dateAhead(ctx.random.int(20, 120)),
        stage_entered_at: entered,
        closed_at: stage === "closed" ? entered : null,
        created_at: ctx.clock.daysAgo(p.seed.createdDaysAgo).toISOString(),
      } satisfies Tables["deals"]["Insert"];
    });
  const deals = await insert(ctx.admin, "deals", rows);
  return new Map(deals.map((d) => [properties.find((p) => p.id === d.property_id)!.key, d]));
}

/** Vevői oldal: a tervben szereplő vevők rögzített szakaszokban + generált tételek. */
export async function seedBuyerDeals(ctx: SeedContext, contacts: ContactRef[], properties: PropertyRef[]) {
  const prop = (key: string) => properties.find((p) => p.key === key)!;
  const contact = (key: string) => contacts.find((c) => c.key === key)!;
  const plan: { contact: ContactRef; stage: Database["public"]["Enums"]["deal_stage"]; property?: PropertyRef; days: number; value?: number }[] = [
    { contact: contact("varga-bence"), stage: "showings", property: prop("godollo-szabadsag"), days: 4 },
    { contact: contact("nagy-eszter"), stage: "offer", property: prop("bp13-vaci"), days: 3 },
    { contact: contact("simon-daniel"), stage: "financing", property: prop("bp11-bartok"), days: 11 },
    { contact: contact("gal-noemi"), stage: "financing", property: prop("veresegyhaz-fo"), days: 9 },
    { contact: contact("toth-marton"), stage: "showings", property: prop("dunakeszi-baratsag"), days: 2, value: 90_000_000 },
    { contact: contact("szabo-reka"), stage: "new", days: 2, value: 300_000 },
    { contact: contact("molnar-dora"), stage: "needs_assessment", days: 6, value: 98_000_000 },
    { contact: contact("farkas-adam"), stage: "showings", days: 8, value: 92_000_000 },
    { contact: contact("kovacs-lilla"), stage: "needs_assessment", days: 12, value: 100_000_000 },
  ];
  const buyers = contacts.filter((c) => c.key.startsWith("gen-") && c.roles.includes("buyer"));
  const stages = ["new", "new", "needs_assessment", "showings", "offer", "contract", "closed"] as const;
  stages.forEach((stage, i) => plan.push({ contact: buyers[i]!, stage, days: ctx.random.int(1, 20), value: ctx.random.int(40, 110) * 1_000_000 }));

  const rows = plan.map((p) => ({
    organization_id: ctx.orgId,
    side: "buyer" as const,
    stage: p.stage,
    status: p.stage === "closed" ? ("won" as const) : ("open" as const),
    title: p.contact.name,
    property_id: p.property?.id ?? null,
    contact_id: p.contact.id,
    agent_id: ctx.agents[p.contact.agent],
    // Saját hirdetéshez kötött vevői ügyletnél nem számoljuk kétszer a pipeline-értéket.
    expected_value: p.property ? null : (p.value ?? null),
    probability: { new: 10, needs_assessment: 20, showings: 35, offer: 60, financing: 80, contract: 95, closed: 100 }[p.stage as string] ?? 30,
    stage_entered_at: ctx.clock.daysAgo(p.days).toISOString(),
    closed_at: p.stage === "closed" ? ctx.clock.daysAgo(p.days).toISOString() : null,
    created_at: ctx.clock.daysAgo(p.days + ctx.random.int(5, 40)).toISOString(),
  }));
  await insert(ctx.admin, "deals", rows);
}
