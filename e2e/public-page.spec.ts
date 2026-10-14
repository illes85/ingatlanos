import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

config({ path: ".env.local", quiet: true });

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

test("az ingatlan megosztható, a nyilvános oldal belépés nélkül látszik, az érdeklődés leadként érkezik", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktopon ellenőrizzük");
  const email = `e2e-latogato${Date.now()}@example.com`;
  const { data: property } = await admin().from("properties").select("id, public_enabled, public_slug, title").eq("status", "active").limit(1).single();
  const original = { public_enabled: property!.public_enabled, public_slug: property!.public_slug };

  try {
    await admin().from("properties").update({ public_enabled: false }).eq("id", property!.id);
    await page.goto("/belepes");
    await page.getByTestId("demo-owner").click();
    await page.waitForURL("**/ma");
    await page.goto(`/ingatlanok/${property!.id}`);

    await page.getByRole("button", { name: "Megosztás" }).click();
    await page.getByRole("switch", { name: "Nyilvános oldal bekapcsolva" }).click();
    const link = page.getByLabel("Nyilvános link");
    await expect(link).toBeVisible();
    const url = await link.inputValue();
    expect(url).toMatch(/\/p\/[a-z0-9-]{8,}$/);

    // Belépés nélküli látogató: új, süti nélküli környezet.
    const visitor = await browser.newContext();
    const vp = await visitor.newPage();
    await vp.goto(new URL(url).pathname.replace(/^/, "http://localhost:3000"));
    await expect(vp.getByRole("heading", { level: 1, name: property!.title })).toBeVisible();
    await expect(vp.getByTestId("public-price")).toBeVisible();
    await expect(vp.getByRole("heading", { name: "Érdeklődöm az ingatlan iránt" })).toBeVisible();

    // Hiányos űrlap: hibaüzenetek.
    await vp.getByRole("button", { name: "Üzenet küldése" }).click();
    await expect(vp.getByText("Add meg a neved")).toBeVisible();
    await expect(vp.getByText("A küldéshez el kell fogadnod az adatkezelést")).toBeVisible();

    await vp.getByLabel("Név").fill("E2E Látogató");
    await vp.getByLabel("E-mail-cím").fill(email);
    await vp.getByLabel("Üzenet", { exact: true }).fill("Szeretnék bemutatót kérni.");
    await vp.getByRole("checkbox").check();
    await vp.getByRole("button", { name: "Üzenet küldése" }).click();
    await expect(vp.getByText("Köszönjük, megkaptuk!")).toBeVisible();

    const { data: lead } = await admin().from("leads").select("source, property_id, status, full_name").eq("email", email).single();
    expect(lead).toMatchObject({ source: "public_page", property_id: property!.id, status: "new", full_name: "E2E Látogató" });

    // Kikapcsolás után az oldal nem érhető el.
    await page.getByRole("switch", { name: "Nyilvános oldal bekapcsolva" }).click();
    await expect(page.getByLabel("Nyilvános link")).toHaveCount(0);
    await vp.reload();
    await expect(vp.getByText("Ez az oldal már nem érhető el")).toBeVisible();
    await visitor.close();
  } finally {
    await admin().from("leads").delete().eq("email", email);
    await admin().from("properties").update(original).eq("id", property!.id);
  }
});
