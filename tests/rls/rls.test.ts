/**
 * Row Level Security tesztek a seedelt demó adatokon.
 * Minden szerepkörrel (owner / agent / assistant) és egy másik szervezet felhasználójával
 * belépünk a nyilvános (anon) kulccsal — pontosan úgy, ahogy a böngésző is.
 */
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { DEMO_ACCOUNTS } from "@/config/demo";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const password = process.env.DEMO_USER_PASSWORD!;

type Client = SupabaseClient<Database>;

async function signIn(email: string): Promise<{ client: Client; userId: string }> {
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Belépés sikertelen (${email}): ${error?.message}`);
  return { client, userId: data.user.id };
}

let owner: Awaited<ReturnType<typeof signIn>>;
let agent: Awaited<ReturnType<typeof signIn>>;
let assistant: Awaited<ReturnType<typeof signIn>>;
let solo: Awaited<ReturnType<typeof signIn>>;
let anon: Client;
let kapuOrgId: string;

beforeAll(async () => {
  [owner, agent, assistant, solo] = await Promise.all([
    signIn(DEMO_ACCOUNTS.owner.email),
    signIn(DEMO_ACCOUNTS.agent.email),
    signIn(DEMO_ACCOUNTS.assistant.email),
    signIn("lakatos.dora@kulcs-demo.test"),
  ]);
  anon = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
  const { data } = await owner.client.from("organizations").select("id").single();
  kapuOrgId = data!.id;
});

describe("tenant-izoláció", () => {
  it("a másik szervezet felhasználója semmit nem lát a Kapu Ingatlanirodából", async () => {
    const { data: orgs } = await solo.client.from("organizations").select("id, name");
    expect(orgs?.map((o) => o.id)).not.toContain(kapuOrgId);

    const { count: props } = await solo.client.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", kapuOrgId);
    const { count: contacts } = await solo.client.from("contacts").select("id", { count: "exact", head: true }).eq("organization_id", kapuOrgId);
    expect(props).toBe(0);
    expect(contacts).toBe(0);
  });

  it("a Kapu irodavezetője sem látja az egyéni ügynök adatait", async () => {
    const { data } = await owner.client.from("properties").select("organization_id");
    expect(new Set(data?.map((p) => p.organization_id))).toEqual(new Set([kapuOrgId]));
  });

  it("bejelentkezés nélkül nincs adat", async () => {
    const { data } = await anon.from("properties").select("id").limit(1);
    expect(data ?? []).toHaveLength(0);
  });

  it("a névjegyzék-függvény idegen szervezetre üres", async () => {
    const { data } = await solo.client.rpc("contact_directory", { p_org: kapuOrgId });
    expect(data ?? []).toHaveLength(0);
  });
});

describe("szerepkörök az irodán belül", () => {
  it("az ügynök csak a saját ügyfeleit látja, az owner és az asszisztens mindet", async () => {
    const all = await owner.client.from("contacts").select("id, owner_agent_id");
    const mine = await agent.client.from("contacts").select("id, owner_agent_id");
    const backoffice = await assistant.client.from("contacts").select("id");

    expect(all.data!.length).toBeGreaterThan(mine.data!.length);
    expect(mine.data!.length).toBeGreaterThan(0);
    expect(mine.data!.every((c) => c.owner_agent_id === agent.userId)).toBe(true);
    expect(backoffice.data!.length).toBe(all.data!.length);
  });

  it("más ügynök ügyfeléről az ügynök csak nevet és felelőst kap (telefon, e-mail nélkül)", async () => {
    const { data } = await agent.client.rpc("contact_directory", { p_org: kapuOrgId, p_query: "Varga" });
    const varga = data?.find((c) => c.full_name === "Varga Bence");
    expect(varga).toBeDefined();
    expect(varga!.is_mine).toBe(false);
    expect(Object.keys(varga!)).not.toContain("phone");
    expect(Object.keys(varga!)).not.toContain("email");
  });

  it("az asszisztens nem lát jutalékadatot", async () => {
    const commissions = await assistant.client.from("commissions").select("id");
    const splits = await assistant.client.from("commission_splits").select("id");
    const terms = await assistant.client.from("property_commission_terms").select("property_id");
    expect(commissions.data ?? []).toHaveLength(0);
    expect(splits.data ?? []).toHaveLength(0);
    expect(terms.data ?? []).toHaveLength(0);
  });

  it("az ügynök csak a saját jutalékrészét látja", async () => {
    const { data } = await agent.client.from("commission_splits").select("agent_id");
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((s) => s.agent_id === agent.userId)).toBe(true);
  });

  it("az ügynök nem módosíthatja más ügynök ingatlanát", async () => {
    const { data: target } = await owner.client
      .from("properties")
      .select("id, title, responsible_agent_id")
      .eq("responsible_agent_id", owner.userId)
      .limit(1)
      .single();
    const { data: updated } = await agent.client.from("properties").update({ title: "Feltört cím" }).eq("id", target!.id).select("id");
    expect(updated ?? []).toHaveLength(0);
    const { data: after } = await owner.client.from("properties").select("title").eq("id", target!.id).single();
    expect(after!.title).toBe(target!.title);
  });

  it("csak az owner törölhet ügyfelet", async () => {
    const { data: own } = await agent.client.from("contacts").select("id").limit(1).single();
    const { data: deleted } = await agent.client.from("contacts").delete().eq("id", own!.id).select("id");
    expect(deleted ?? []).toHaveLength(0);
  });

  it("szervezetet csak a create_organization() hozhat létre; tagságot csak owner adhat", async () => {
    const { error } = await agent.client.from("organizations").insert({ name: "Kalóz Kft.", type: "office", slug: "kaloz" });
    expect(error).not.toBeNull();
    const { error: memberError } = await agent.client
      .from("memberships")
      .insert({ organization_id: kapuOrgId, user_id: agent.userId, role: "owner" });
    expect(memberError).not.toBeNull();
  });
});

/** 1x1 pixeles PNG: a storage-tesztek apró, valódi képfájlt töltenek fel. */
const PIXEL_PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);

describe("ingatlan-média, storage és jutalékfeltétel jogosultságok (biztonsági átnézés, D-022)", () => {
  let ownerProperty: { id: string };
  let agentProperty: { id: string };
  const tempPaths: string[] = [];

  beforeAll(async () => {
    const { data: o } = await owner.client.from("properties").select("id").eq("responsible_agent_id", owner.userId).eq("visibility", "office").limit(1).single();
    ownerProperty = o!;
    const { data: a } = await agent.client.from("properties").select("id").eq("responsible_agent_id", agent.userId).limit(1).single();
    agentProperty = a!;
  });

  async function uploadAs(who: typeof owner, propertyId: string, upsert = false, name = `${crypto.randomUUID()}.png`) {
    const path = `${kapuOrgId}/${propertyId}/${name}`;
    const result = await who.client.storage.from("property-media").upload(path, PIXEL_PNG, { contentType: "image/png", upsert });
    if (!result.error) tempPaths.push(path);
    return { path, ...result };
  }

  afterAll(async () => {
    if (tempPaths.length > 0) await owner.client.storage.from("property-media").remove(tempPaths);
  });

  it("az ügynök nem tölthet fel fotót más ügynök ingatlanához, a felelős igen", async () => {
    const foreign = await uploadAs(agent, ownerProperty.id);
    expect(foreign.error).not.toBeNull();
    const own = await uploadAs(agent, agentProperty.id);
    expect(own.error).toBeNull();
  });

  it("az ügynök nem írhatja felül és nem törölheti más fotóját", async () => {
    const photo = await uploadAs(owner, ownerProperty.id);
    expect(photo.error).toBeNull();

    const overwrite = await agent.client.storage.from("property-media").upload(photo.path, PIXEL_PNG, { contentType: "image/png", upsert: true });
    expect(overwrite.error).not.toBeNull();

    const removed = await agent.client.storage.from("property-media").remove([photo.path]);
    expect(removed.data ?? []).toHaveLength(0);
    const still = await owner.client.storage.from("property-media").createSignedUrl(photo.path, 60);
    expect(still.error).toBeNull();
  });

  it("a másik szervezet felhasználója nem tölthet fel, és nem kérhet aláírt URL-t a Kapu fájljaira", async () => {
    const attempt = await uploadAs(solo, ownerProperty.id);
    expect(attempt.error).not.toBeNull();
    const photo = await uploadAs(owner, ownerProperty.id);
    const signed = await solo.client.storage.from("property-media").createSignedUrl(photo.path, 60);
    expect(signed.error).not.toBeNull();
  });

  it("az ügynök nem vehet fel, nem módosíthat és nem törölhet médiasort más ügynök ingatlanán", async () => {
    const photo = await uploadAs(owner, ownerProperty.id);
    const { data: row } = await owner.client
      .from("property_media")
      .insert({ organization_id: kapuOrgId, property_id: ownerProperty.id, storage_path: photo.path, kind: "photo", sort_order: 999 })
      .select("id")
      .single();
    expect(row).not.toBeNull();

    const insert = await agent.client
      .from("property_media")
      .insert({ organization_id: kapuOrgId, property_id: ownerProperty.id, storage_path: photo.path, kind: "photo", sort_order: 1000 });
    expect(insert.error).not.toBeNull();

    const update = await agent.client.from("property_media").update({ is_public: false }).eq("id", row!.id).select("id");
    expect(update.data ?? []).toHaveLength(0);
    const del = await agent.client.from("property_media").delete().eq("id", row!.id).select("id");
    expect(del.data ?? []).toHaveLength(0);

    const cleanup = await owner.client.from("property_media").delete().eq("id", row!.id).select("id");
    expect(cleanup.data).toHaveLength(1);
  });

  it("médiasor útvonala csak a saját szervezet mappájára mutathat", async () => {
    const { error } = await owner.client
      .from("property_media")
      .insert({ organization_id: kapuOrgId, property_id: ownerProperty.id, storage_path: "00000000-0000-0000-0000-000000000000/x/y.png", kind: "photo" });
    expect(error).not.toBeNull();
  });

  it("jutalékfeltételt az ügynök csak a saját ingatlanára hozhat létre, a másik szervezet sehova", async () => {
    const foreign = await agent.client.from("property_commission_terms").insert({ property_id: ownerProperty.id, organization_id: kapuOrgId, commission_pct: 1 });
    expect(foreign.error).not.toBeNull();
    const cross = await solo.client.from("property_commission_terms").insert({ property_id: ownerProperty.id, organization_id: kapuOrgId, commission_pct: 1 });
    expect(cross.error).not.toBeNull();
    const assistantWrite = await assistant.client.from("property_commission_terms").insert({ property_id: ownerProperty.id, organization_id: kapuOrgId, commission_pct: 1 });
    expect(assistantWrite.error).not.toBeNull();
  });

  it("a felelőst csak szervezeti ügynökre lehet váltani, és a váltás az owner vagy a felelős joga", async () => {
    const outsider = await owner.client.from("properties").update({ responsible_agent_id: solo.userId }).eq("id", ownerProperty.id).select("id");
    expect(outsider.error).not.toBeNull();

    const hijack = await assistant.client.from("properties").update({ responsible_agent_id: assistant.userId }).eq("id", ownerProperty.id).select("id");
    expect(hijack.error !== null || (hijack.data ?? []).length === 0).toBe(true);
    const { data: after } = await owner.client.from("properties").select("responsible_agent_id").eq("id", ownerProperty.id).single();
    expect(after!.responsible_agent_id).toBe(owner.userId);
  });

  it("a dokumentumok fájljai csak a documents sor láthatósága szerint listázhatók", async () => {
    const { data: files } = await agent.client.storage.from("documents").list(kapuOrgId);
    const { data: visibleDocs } = await agent.client.from("documents").select("storage_path").not("storage_path", "is", null);
    const visible = new Set((visibleDocs ?? []).map((d) => d.storage_path));
    for (const file of files ?? []) {
      if (file.id) expect(visible.has(`${kapuOrgId}/${file.name}`)).toBe(true);
    }
  });
});

describe("ügyfelek és gyerektáblák védelme (D-022)", () => {
  it("az ügyfél felelőse nem állítható szervezeten kívüli profilra", async () => {
    const { data: own } = await agent.client.from("contacts").select("id").eq("owner_agent_id", agent.userId).limit(1).single();
    const { error } = await agent.client.from("contacts").update({ owner_agent_id: solo.userId }).eq("id", own!.id);
    expect(error).not.toBeNull();
    const { data: after } = await owner.client.from("contacts").select("owner_agent_id").eq("id", own!.id).single();
    expect(after!.owner_agent_id).toBe(agent.userId);
  });

  it("az ügynök nem vehet át más ügynök ügyfelét", async () => {
    const { data: foreign } = await owner.client.from("contacts").select("id").eq("owner_agent_id", owner.userId).limit(1).single();
    const { data: updated } = await agent.client.from("contacts").update({ owner_agent_id: agent.userId }).eq("id", foreign!.id).select("id");
    expect(updated ?? []).toHaveLength(0);
  });

  it("keresési profil és ajánlás nem hivatkozhat másik szervezet ügyfelére vagy ingatlanára", async () => {
    const { data: kapuContact } = await owner.client.from("contacts").select("id").limit(1).single();
    const { data: soloProperty } = await solo.client.from("properties").select("id, organization_id").limit(1).single();
    const { data: soloContact } = await solo.client.from("contacts").select("id, organization_id").limit(1).single();

    const profile = await solo.client
      .from("search_profiles")
      .insert({ organization_id: soloContact!.organization_id, contact_id: kapuContact!.id, transaction_type: "sale" });
    expect(profile.error).not.toBeNull();

    const recommendation = await solo.client
      .from("property_recommendations")
      .insert({ organization_id: soloContact!.organization_id, contact_id: soloContact!.id, property_id: (await owner.client.from("properties").select("id").limit(1).single()).data!.id });
    expect(recommendation.error).not.toBeNull();
    expect(soloProperty).not.toBeNull();
  });

  it("az esemény nem hivatkozhat másik szervezet ügyfelére", async () => {
    const { data: kapuContact } = await owner.client.from("contacts").select("id").limit(1).single();
    const { data: soloContact } = await solo.client.from("contacts").select("organization_id").limit(1).single();
    const { error } = await solo.client
      .from("activities")
      .insert({ organization_id: soloContact!.organization_id, contact_id: kapuContact!.id, type: "note", title: "Kalóz" });
    expect(error).not.toBeNull();
  });
});
