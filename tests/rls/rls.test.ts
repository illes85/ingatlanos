/**
 * Row Level Security tesztek a seedelt demó adatokon.
 * Minden szerepkörrel (owner / agent / assistant) és egy másik szervezet felhasználójával
 * belépünk a nyilvános (anon) kulccsal — pontosan úgy, ahogy a böngésző is.
 */
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
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
