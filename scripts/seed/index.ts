/**
 * Kulcs demó seed — `npm run db:seed`.
 * Újrafuttatható: a korábbi demó szervezeteket és felhasználókat törli, majd újra létrehozza.
 * A dátumok a futtatás napjához igazodnak (a „Ma” képernyő mindig élő).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";
import { DEMO_ORG_NAME } from "../../src/config/demo";
import { createClock, createRandom } from "./lib";
import { SOLO_AGENT, STAFF, type AgentKey } from "./data/people";
import { seedBuyerDeals, seedContacts, seedProperties, seedSearchProfiles, seedSellerDeals, insert, type SeedContext } from "./steps/core";
import { seedCommissions, seedLeads, seedMarket, seedOffers, seedShowings, seedTasks, seedTimeline } from "./steps/activity";
import { seedPhotos } from "./steps/photos";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_USER_PASSWORD;
if (!url || !serviceKey || !password) {
  console.error("Hiányzik a NEXT_PUBLIC_SUPABASE_URL, a SUPABASE_SERVICE_ROLE_KEY vagy a DEMO_USER_PASSWORD (.env.local).");
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const DEMO_EMAILS = [...Object.values(STAFF).map((s) => s.email), SOLO_AGENT.email];

async function reset() {
  const { error: orgError } = await admin.from("organizations").delete().eq("is_demo", true);
  if (orgError) throw new Error(`Demó szervezetek törlése: ${orgError.message}`);
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Felhasználók listázása: ${error.message}`);
  for (const user of data.users.filter((u) => u.email && DEMO_EMAILS.includes(u.email))) {
    await admin.auth.admin.deleteUser(user.id);
  }
}

async function createUser(email: string, fullName: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`Felhasználó (${email}): ${error?.message}`);
  return data.user.id;
}

async function createOrg(name: string, type: "office" | "individual", plan: Database["public"]["Enums"]["plan_tier"], clock: ReturnType<typeof createClock>) {
  const [org] = await insert(admin, "organizations", [
    {
      name,
      type,
      slug: name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-"),
      plan,
      trial_plan: type === "office" ? "pro_ai" : null,
      trial_ends_at: type === "office" ? clock.daysAhead(11).toISOString() : null,
      ai_credit_balance: type === "office" ? 312 : 50,
      ai_credit_monthly: type === "office" ? 10 : 50,
      is_demo: true,
    },
  ]);
  return org!.id;
}

async function main() {
  const started = Date.now();
  const clock = createClock();
  const random = createRandom(20261002);

  console.log("› Korábbi demó adatok törlése…");
  await reset();

  console.log("› Felhasználók és szervezet…");
  const orgId = await createOrg(DEMO_ORG_NAME, "office", "start", clock);
  const agents = {} as Record<AgentKey, string>;
  for (const [key, staff] of Object.entries(STAFF) as [AgentKey, (typeof STAFF)[AgentKey]][]) {
    const id = await createUser(staff.email, staff.name);
    agents[key] = id;
    await admin
      .from("profiles")
      .update({ phone: `+36 30 ${random.int(100, 999)} ${random.int(1000, 9999)}`, license_number: staff.license, monthly_commission_goal: staff.goal, active_organization_id: orgId })
      .eq("id", id);
    await insert(admin, "memberships", [{ organization_id: orgId, user_id: id, role: staff.role }]);
  }

  const ctx: SeedContext = { admin, random, clock, orgId, agents };

  console.log("› Ügyfelek és keresési profilok…");
  const contacts = await seedContacts(ctx);
  await seedSearchProfiles(ctx, contacts);

  console.log("› Ingatlanok és ügyletek…");
  const properties = await seedProperties(ctx, contacts);
  const sellerDeals = await seedSellerDeals(ctx, properties);
  await seedBuyerDeals(ctx, contacts, properties);

  console.log("› Bemutatók, ajánlatok, leadek, feladatok…");
  await seedShowings(ctx, contacts, properties);
  await seedOffers(ctx, contacts, properties, sellerDeals);
  await seedLeads(ctx, contacts, properties);
  await seedTasks(ctx, contacts, properties);
  await seedCommissions(ctx, sellerDeals, properties);
  await seedTimeline(ctx, contacts, properties);
  await seedMarket(ctx);

  console.log("› Fotók…");
  const photoCount = await seedPhotos(ctx, properties);
  console.log(photoCount ? `  ${photoCount} fotó rendelve az ingatlanokhoz.` : "  Nincs fotó a scripts/seed/photos mappában – tónusos helykitöltők jelennek meg.");

  console.log("› Második (egyéni) szervezet a tenant-izolációhoz…");
  await seedSoloOrg(clock);

  console.log(`✓ Kész (${((Date.now() - started) / 1000).toFixed(1)} mp). Belépés: http://localhost:3000/belepes → „Demó belépés”.`);
}

async function seedSoloOrg(clock: ReturnType<typeof createClock>) {
  const orgId = await createOrg(SOLO_AGENT.orgName, "individual", "pro", clock);
  const userId = await createUser(SOLO_AGENT.email, SOLO_AGENT.name);
  await admin.from("profiles").update({ active_organization_id: orgId, monthly_commission_goal: 1_500_000 }).eq("id", userId);
  await insert(admin, "memberships", [{ organization_id: orgId, user_id: userId, role: "owner" }]);
  const [seller, buyer] = await insert(admin, "contacts", [
    { organization_id: orgId, owner_agent_id: userId, last_name: "Bognár", first_name: "Imre", roles: ["seller"], phone: "+36 30 555 0101", email: "bognar.imre@example.com" },
    { organization_id: orgId, owner_agent_id: userId, last_name: "Szalai", first_name: "Hanna", roles: ["buyer"], phone: "+36 70 555 0102", email: "szalai.hanna@example.com" },
  ]);
  const [property] = await insert(admin, "properties", [
    { organization_id: orgId, code: "K-1001", title: "Felújított lakás a Bartók Béla úton", property_type: "flat", status: "active", responsible_agent_id: userId, seller_contact_id: seller!.id, price: 69_900_000, area_sqm: 61, rooms: 2, city: "Budapest", district: 11, street: "Bartók Béla út", lat: 47.474, lng: 19.043, mandate_type: "exclusive", listed_at: clock.daysAgo(5).toISOString() },
  ]);
  await insert(admin, "leads", [{ organization_id: orgId, full_name: "Szalai Hanna", contact_id: buyer!.id, property_id: property!.id, status: "new", source: "website", assigned_to: userId }]);
  await insert(admin, "deals", [{ organization_id: orgId, side: "seller", stage: "listed", property_id: property!.id, contact_id: seller!.id, agent_id: userId, expected_value: 69_900_000, probability: 45 }]);
}

main().catch((error) => {
  console.error("✗ A seed megszakadt:", error instanceof Error ? error.message : error);
  process.exit(1);
});
