/** Seed · bemutatók, ajánlatok, leadek, feladatok, jutalékok, idővonal, értesítések, piaci adatok. */
import type { Database } from "../../../src/types/database";
import { insert, type ContactRef, type PropertyRef, type SeedContext } from "./core";
import { PLACES } from "../data/places";

type Tables = Database["public"]["Tables"];
type Deal = Tables["deals"]["Row"];

const FEEDBACK = [
  "Tetszett az elrendezés, de a konyhát kicsinek találták.",
  "Nagyon tetszett, a párjával még egyszer megnézné.",
  "Az ár magasnak tűnik nekik, alkura nyitottak.",
  "A környék kiváló, a fürdőszoba felújítandó.",
  "Rendben volt, de inkább kertes házat keresnek.",
];

export async function seedShowings(ctx: SeedContext, contacts: ContactRef[], properties: PropertyRef[]) {
  const { clock, random } = ctx;
  const prop = (key: string) => properties.find((p) => p.key === key)!;
  const contact = (key: string) => contacts.find((c) => c.key === key)!;
  const anna = ctx.agents.anna;
  const rows: Tables["showings"]["Insert"][] = [];

  // A „Ma” terv három bemutatója
  rows.push(
    { organization_id: ctx.orgId, property_id: prop("godollo-szabadsag").id, buyer_contact_id: contact("varga-bence").id, agent_id: anna, starts_at: clock.todayAt(10).toISOString(), ends_at: clock.todayAt(10, 45).toISOString(), status: "completed", feedback_rating: 5, feedback_text: "A kert és a garázs nagyon tetszett, hitel rendben.", feedback_requested_at: clock.todayAt(11).toISOString() },
    { organization_id: ctx.orgId, property_id: prop("bp13-vaci").id, buyer_contact_id: contact("nagy-eszter").id, agent_id: anna, starts_at: clock.todayAt(13, 30).toISOString(), ends_at: clock.todayAt(14, 15).toISOString(), status: "scheduled" },
    { organization_id: ctx.orgId, property_id: prop("dunakeszi-baratsag").id, buyer_contact_id: contact("toth-marton").id, agent_id: anna, starts_at: clock.todayAt(17).toISOString(), ends_at: clock.todayAt(17, 45).toISOString(), status: "scheduled" },
  );

  const listed = properties.filter((p) => p.seed.stage === "listed" || p.seed.stage === "offer" || !p.seed.stage);
  const buyers = contacts.filter((c) => c.roles.includes("buyer") || c.roles.includes("tenant"));
  const showingFor = (offsetDays: number, hour: number, minute: number, agentKey?: keyof typeof ctx.agents) => {
    const property = agentKey ? random.pick(listed.filter((p) => p.seed.agent === agentKey).concat(listed.slice(0, 2))) : random.pick(listed);
    const start = clock.dayAt(offsetDays, hour, minute);
    const past = offsetDays < 0;
    const rated = past && random.chance(0.8);
    rows.push({
      organization_id: ctx.orgId,
      property_id: property.id,
      buyer_contact_id: random.pick(buyers).id,
      agent_id: ctx.agents[agentKey ?? property.seed.agent],
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 45 * 60_000).toISOString(),
      status: past ? (random.chance(0.08) ? "no_show" : "completed") : "scheduled",
      feedback_rating: rated ? random.int(3, 5) : null,
      feedback_text: rated ? random.pick(FEEDBACK) : null,
      feedback_requested_at: past ? new Date(start.getTime() + 2 * 3_600_000).toISOString() : null,
    });
  };

  // Múlt 30 nap és a következő 14 nap — így a „Ma” képernyő a seed utáni napokon is élő marad.
  for (let d = -30; d <= 14; d++) {
    if (d === 0) continue;
    showingFor(d, 10, 0, "anna");
    if (d > 0 || random.chance(0.6)) showingFor(d, 15, 30, "anna");
    showingFor(d, random.pick([9, 11, 14, 16]), random.pick([0, 30]));
  }
  await insert(ctx.admin, "showings", rows);
}

export async function seedOffers(ctx: SeedContext, contacts: ContactRef[], properties: PropertyRef[], deals: Map<string, Deal>) {
  const { clock } = ctx;
  const prop = (key: string) => properties.find((p) => p.key === key)!;
  const contact = (key: string) => contacts.find((c) => c.key === key)!;
  const buyers = contacts.filter((c) => c.key.startsWith("gen-") && c.roles.includes("buyer"));
  const offer = (key: string, buyer: ContactRef, amount: number, status: "pending" | "accepted", extra: Partial<Tables["offers"]["Insert"]> = {}) => ({
    organization_id: ctx.orgId,
    deal_id: deals.get(key)?.id ?? null,
    property_id: prop(key).id,
    buyer_contact_id: buyer.id,
    amount,
    status,
    created_at: clock.daysAgo(3).toISOString(),
    ...extra,
  });
  await insert(ctx.admin, "offers", [
    offer("bp13-vaci", contact("nagy-eszter"), 62_000_000, "pending", { valid_until: clock.dateAhead(4) }),
    offer("bp11-bartok", contact("simon-daniel"), 79_900_000, "accepted", { deposit_amount: 8_000_000, deposit_deadline: clock.dateAhead(1), created_at: clock.daysAgo(11).toISOString() }),
    offer("veresegyhaz-fo", contact("gal-noemi"), 59_900_000, "accepted", { deposit_amount: 6_000_000, deposit_deadline: clock.dateAhead(10), created_at: clock.daysAgo(9).toISOString() }),
    offer("bp12-svabhegy", buyers[0]!, 182_000_000, "pending", { valid_until: clock.dateAhead(5) }),
    offer("bp3-panel", buyers[1]!, 45_500_000, "pending", { valid_until: clock.dateAhead(2) }),
    offer("vac-lakas", buyers[2]!, 38_000_000, "pending", { valid_until: clock.dateAhead(6) }),
  ]);
}

export async function seedLeads(ctx: SeedContext, contacts: ContactRef[], properties: PropertyRef[]) {
  const { clock, random } = ctx;
  const prop = (key: string) => properties.find((p) => p.key === key)!;
  const contact = (key: string) => contacts.find((c) => c.key === key)!;
  type LeadInsert = Tables["leads"]["Insert"];
  const fromContact = (c: ContactRef, extra: Partial<LeadInsert>): LeadInsert => ({
    organization_id: ctx.orgId,
    full_name: c.name,
    phone: c.phone,
    phone_normalized: c.phone.replace(/\s/g, ""),
    contact_id: c.id,
    assigned_to: ctx.agents[c.agent],
    ...extra,
  });

  const rows: LeadInsert[] = [
    fromContact(contact("varga-bence"), { source: "portal", source_detail: "Ingatlanportál", property_id: prop("godollo-szabadsag").id, status: "contacted", ai_score: 92, ai_score_reason: "Ma kétszer nézte meg a gödöllői házat, a hitelbírálata kész.", raw_message: "Érdekelne a ház, mikor lehetne megnézni?", received_at: clock.daysAgo(6).toISOString() }),
    fromContact(contact("horvath-judit"), { source: "website", source_detail: "Értékbecslés-kérés", property_id: prop("szentendre-bukkos").id, status: "contacted", ai_score: 87, ai_score_reason: "Értékbecslést kért, most dönt a megbízásról – küldd el a riportot.", raw_message: "Szeretném eladni a szentendrei lakásomat, mennyit érhet?", received_at: clock.daysAgo(4).toISOString() }),
    fromContact(contact("toth-marton"), { source: "referral", status: "read", ai_score: 74, ai_score_reason: "Az új dunakeszi ikerház 96%-ban egyezik a keresésével.", raw_message: "3 szobás házat keresünk az agglomerációban.", received_at: clock.daysAgo(9).toISOString() }),
    fromContact(contact("szabo-reka"), { source: "portal", source_detail: "Ingatlanportál", property_id: prop("bp13-kiado").id, status: "new", ai_score: 68, ai_score_reason: "2 napja vár válaszra – délután a legaktívabb.", raw_message: "Kiadó még a lakás? Novembertől költöznék.", received_at: clock.daysAgo(2).toISOString() }),
    // két sürgős, egy órán belüli új lead (kiosztatlan)
    { organization_id: ctx.orgId, source: "phone", full_name: "Papp Gergő", phone: "+36 30 412 7781", phone_normalized: "+36304127781", property_id: prop("bp13-angyalfold").id, status: "new", urgent: true, ai_score: 58, ai_score_reason: "Készpénzes vevő, ma délután ráér.", raw_message: "Visszahívást kér a Dagály utcai lakás miatt.", received_at: clock.daysAgo(0.02).toISOString() },
    { organization_id: ctx.orgId, source: "public_page", full_name: "Rácz Fanni", email: "racz.fanni@example.com", property_id: prop("godollo-szabadsag").id, status: "new", urgent: true, raw_message: "Hétvégén meg tudnánk nézni a házat?", received_at: clock.daysAgo(0.03).toISOString() },
    { organization_id: ctx.orgId, source: "facebook", full_name: "Juhász Petra", email: "juhasz.petra@example.com", property_id: prop("dunakeszi-sorhaz").id, assigned_to: ctx.agents.balint, status: "new", ai_score: 41, ai_score_reason: "Először érdeklődik, finanszírozás még nyitott.", raw_message: "Mekkora a közös költség?", received_at: clock.daysAgo(0.4).toISOString() },
    { organization_id: ctx.orgId, source: "website", full_name: "Kocsis András", email: "kocsis.andras@example.com", status: "new", assigned_to: ctx.agents.eszter, raw_message: "Budai lakást keresek 120 M-ig.", received_at: clock.daysAgo(1).toISOString() },
  ];

  const others = contacts.filter((c) => c.key.startsWith("gen-") && c.roles.includes("buyer"));
  const reasons = ["Hasonló ingatlanokat nézett a héten.", "Hitelbírálat folyamatban.", "Régi ügyfél, újra aktív.", "Gyors döntést jelzett.", "Két bemutatón is részt vett."];
  for (let i = 0; i < 16; i++) {
    const c = others[i % others.length]!;
    const scored = i < 8;
    rows.push(fromContact(c, {
      source: random.pick(["portal", "website", "facebook", "referral"] as const),
      property_id: random.pick(properties).id,
      status: scored ? random.pick(["read", "contacted"] as const) : random.pick(["converted", "converted", "archived", "contacted"] as const),
      ai_score: scored ? random.int(30, 64) : null,
      ai_score_reason: scored ? random.pick(reasons) : null,
      raw_message: "Érdeklődnék az ingatlan iránt.",
      received_at: clock.daysAgo(random.int(3, 60)).toISOString(),
      read_at: clock.daysAgo(random.int(1, 3)).toISOString(),
      converted_at: null,
    }));
  }
  await insert(ctx.admin, "leads", rows);
}

export async function seedTasks(ctx: SeedContext, contacts: ContactRef[], properties: PropertyRef[]) {
  const { clock } = ctx;
  const prop = (key: string) => properties.find((p) => p.key === key)!;
  const contact = (key: string) => contacts.find((c) => c.key === key)!;
  const task = (agent: keyof typeof ctx.agents, title: string, dueHour: number, extra: Partial<Tables["tasks"]["Insert"]> = {}) => ({
    organization_id: ctx.orgId,
    title,
    assignee_id: ctx.agents[agent],
    due_at: clock.todayAt(dueHour).toISOString(),
    ...extra,
  });
  await insert(ctx.admin, "tasks", [
    task("anna", "Visszajelzés kérése – Varga Bence", 12, { contact_id: contact("varga-bence").id, property_id: prop("godollo-szabadsag").id, priority: "high" }),
    task("anna", "Értékbecslő riport küldése Horváth Juditnak", 15, { contact_id: contact("horvath-judit").id, priority: "high" }),
    task("anna", "Megbízás-hosszabbítás egyeztetése – Szentendre, Pap-rét", 18, { property_id: prop("szentendre-paprét").id }),
    task("anna", "Fotózás egyeztetése – Dunakeszi, Barátság útja", 34, { property_id: prop("dunakeszi-baratsag").id }),
    task("anna", "Heti hívás régi ügyfeleknek", 58, { recurrence_rule: "FREQ=WEEKLY;BYDAY=MO" }),
    task("anna", "Energetikai tanúsítvány bekérése", 8, { status: "done", completed_at: clock.daysAgo(1).toISOString(), due_at: clock.daysAgo(1).toISOString() }),
    task("eszter", "Ajánlat egyeztetése – Svábhegy", 16, { property_id: prop("bp12-svabhegy").id, priority: "high" }),
    task("balint", "Bemutatási lap nyomtatása", 9),
    task("kinga", "Fotók feltöltése – Veresegyház, Patak utca", 11, { property_id: prop("veresegyhaz-haz").id }),
  ]);
}

/** Jutalékok: Kiss Anna e havi megszerzett része 1 840 000 Ft (a terv KPI-ja), cél 3 000 000 Ft. */
export async function seedCommissions(ctx: SeedContext, deals: Map<string, Deal>, properties: PropertyRef[]) {
  const { clock } = ctx;
  const inMonth = (daysAgo: number) => {
    const candidate = clock.daysAgo(daysAgo).getTime();
    const floor = clock.monthStart.getTime() + 3_600_000;
    return new Date(Math.min(clock.now.getTime() - 60_000, Math.max(candidate, floor))).toISOString();
  };
  const prop = (key: string) => properties.find((p) => p.key === key)!;
  const commission = (key: string, gross: number, status: Database["public"]["Enums"]["commission_status"], extra: Partial<Tables["commissions"]["Insert"]> = {}) => ({
    organization_id: ctx.orgId,
    deal_id: deals.get(key)?.id ?? null,
    property_id: prop(key).id,
    gross_amount: gross,
    status,
    ...extra,
  });
  const rows = await insert(ctx.admin, "commissions", [
    commission("godollo-isaszegi", 2_492_000, "earned", { office_share_pct: 26.17, earned_at: inMonth(2) }),
    commission("fot-vorosmarty", 1_920_000, "paid", { office_share_pct: 40, earned_at: clock.daysAgo(9).toISOString(), paid_at: clock.daysAgo(3).toISOString() }),
    commission("kerepes-szilasliget", 2_220_000, "expected", { office_share_pct: 40, expected_date: clock.dateAhead(5) }),
    commission("bp11-bartok", 2_397_000, "expected", { office_share_pct: 40, expected_date: clock.dateAhead(30) }),
    commission("veresegyhaz-fo", 1_797_000, "expected", { office_share_pct: 40, expected_date: clock.dateAhead(45) }),
    commission("bp2-pasareti", 1_400_000, "earned", { office_share_pct: 45, earned_at: inMonth(4), notes: "Korábbi ügylet zárása" }),
  ]);
  const [isaszegi, fot, kerepes, bartok, veresegyhaz, pasareti] = rows;
  const a = ctx.agents;
  await insert(ctx.admin, "commission_splits", [
    { organization_id: ctx.orgId, commission_id: isaszegi!.id, agent_id: a.anna, role: "listing", pct: 73.83, amount: 1_840_000 },
    { organization_id: ctx.orgId, commission_id: fot!.id, agent_id: a.anna, role: "listing", pct: 60, amount: 1_152_000 },
    { organization_id: ctx.orgId, commission_id: kerepes!.id, agent_id: a.anna, role: "listing", pct: 60, amount: 1_332_000 },
    { organization_id: ctx.orgId, commission_id: bartok!.id, agent_id: a.anna, role: "listing", pct: 60, amount: 1_438_200 },
    { organization_id: ctx.orgId, commission_id: veresegyhaz!.id, agent_id: a.anna, role: "listing", pct: 60, amount: 1_078_200 },
    { organization_id: ctx.orgId, commission_id: pasareti!.id, agent_id: a.eszter, role: "listing", pct: 40, amount: 560_000 },
    { organization_id: ctx.orgId, commission_id: pasareti!.id, agent_id: a.balint, role: "selling", pct: 15, amount: 210_000 },
  ]);
}

export async function seedTimeline(ctx: SeedContext, contacts: ContactRef[], properties: PropertyRef[]) {
  const { clock, random } = ctx;
  const prop = (key: string) => properties.find((p) => p.key === key)!;
  const contact = (key: string) => contacts.find((c) => c.key === key)!;
  const anna = ctx.agents.anna;
  const godollo = prop("godollo-szabadsag").id;
  const rows: Tables["activities"]["Insert"][] = [
    { organization_id: ctx.orgId, type: "showing", actor_id: anna, property_id: godollo, contact_id: contact("varga-bence").id, title: "Bemutató · Varga Bence · 5/5", body: "A kert és a garázs nagyon tetszett, hitel rendben.", occurred_at: clock.todayAt(10, 45).toISOString() },
    { organization_id: ctx.orgId, type: "price_change", actor_id: anna, property_id: godollo, title: "Árcsökkentés 97,9 → 94,5 M Ft", body: "tulajdonos jóváhagyta", payload: { from: 97_900_000, to: 94_500_000 }, occurred_at: clock.daysAgo(4).toISOString() },
    { organization_id: ctx.orgId, type: "listing", actor_id: anna, property_id: godollo, title: "Hirdetés feltöltve 3 portálra", occurred_at: clock.daysAgo(23).toISOString() },
  ];
  const kinds = [
    { type: "call" as const, title: "Telefonhívás", body: "Egyeztettük a következő lépéseket." },
    { type: "email" as const, title: "E-mail elküldve", body: "Ajánló e-mail 3 ingatlannal." },
    { type: "note" as const, title: "Jegyzet", body: "Csak hétköznap délután érhető el." },
    { type: "sms" as const, title: "SMS", body: "Emlékeztető a holnapi bemutatóról." },
  ];
  for (const c of contacts.slice(0, 50)) {
    const n = random.int(1, 3);
    for (let i = 0; i < n; i++) {
      const k = random.pick(kinds);
      rows.push({ organization_id: ctx.orgId, type: k.type, actor_id: ctx.agents[c.agent], contact_id: c.id, title: k.title, body: k.body, occurred_at: clock.daysAgo(random.int(0, 45)).toISOString() });
    }
  }
  await insert(ctx.admin, "activities", rows);

  // „Mit kapott már meg tőlünk”
  const recs: Tables["property_recommendations"]["Insert"][] = [
    { organization_id: ctx.orgId, contact_id: contact("varga-bence").id, property_id: godollo, sent_by: anna, sent_at: clock.daysAgo(8).toISOString(), reaction: "interested" },
    { organization_id: ctx.orgId, contact_id: contact("toth-marton").id, property_id: prop("dunakeszi-baratsag").id, sent_by: anna, sent_at: clock.daysAgo(1).toISOString(), reaction: "interested" },
  ];
  const buyers = contacts.filter((c) => c.roles.includes("buyer"));
  for (let i = 0; i < 30; i++) {
    const c = random.pick(buyers);
    recs.push({ organization_id: ctx.orgId, contact_id: c.id, property_id: random.pick(properties).id, sent_by: ctx.agents[c.agent], sent_at: clock.daysAgo(random.int(1, 60)).toISOString(), reaction: random.pick(["interested", "not_interested", "no_response"]) });
  }
  await insert(ctx.admin, "property_recommendations", recs);

  await insert(ctx.admin, "notifications", [
    { organization_id: ctx.orgId, user_id: anna, type: "lead", title: "Új lead: Rácz Fanni", body: "Gödöllő, Szabadság út – hétvégi bemutatót kér.", link: "/leadek", created_at: clock.daysAgo(0.03).toISOString() },
    { organization_id: ctx.orgId, user_id: anna, type: "deadline", title: "Foglaló határidő holnap", body: "Budapest XI., Bartók Béla út", link: "/ugyletek", created_at: clock.daysAgo(0.2).toISOString() },
    { organization_id: ctx.orgId, user_id: anna, type: "showing", title: "Visszajelzés érkezett", body: "Varga Bence 5/5-re értékelte a bemutatót.", link: "/ma", read_at: clock.now.toISOString() },
  ]);
}

/** Piaci m²-ár pillanatképek (mock forrás): az utolsó 12 hónap településenként, lakás és ház. */
export async function seedMarket(ctx: SeedContext) {
  const rows: Tables["market_snapshots"]["Insert"][] = [];
  for (const place of Object.values(PLACES)) {
    for (const type of ["flat", "house"] as const) {
      for (let m = 11; m >= 0; m--) {
        const [year, month] = ctx.clock.todayKey.split("-").map(Number);
        const period = new Date(Date.UTC(year!, month! - 1 - m, 1)).toISOString().slice(0, 10);
        const base = place.sqmPrice * (type === "house" ? 0.92 : 1.04) * (1 - 0.006 * m);
        const avg = Math.round(ctx.random.jitter(base, base * 0.012) / 1000) * 1000;
        rows.push({ city: place.city, district: place.district ?? null, property_type: type, period, avg_price_per_sqm: avg, median_price_per_sqm: Math.round(avg * 0.97 / 1000) * 1000, sample_size: ctx.random.int(12, 140), source: "mock" });
      }
    }
  }
  const { error } = await ctx.admin.from("market_snapshots").upsert(rows as never, { onConflict: "city,district,property_type,period", ignoreDuplicates: true });
  if (error) throw new Error(`market_snapshots: ${error.message}`);
}
