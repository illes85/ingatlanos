import path from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

config({ path: ".env.local", quiet: true });

async function demoLogin(page: Page) {
  await page.goto("/belepes");
  await page.getByTestId("demo-owner").click();
  await page.waitForURL("**/ma");
}

/** A teszt által létrehozott ingatlan (és a fotói) törlése, hogy a demóadat ne szemetelődjön. */
async function cleanup(title: string) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: rows } = await admin.from("properties").select("id, organization_id").eq("title", title);
  for (const row of rows ?? []) {
    const prefix = `${row.organization_id}/${row.id}`;
    const { data: files } = await admin.storage.from("property-media").list(prefix);
    if (files?.length) await admin.storage.from("property-media").remove(files.map((f) => `${prefix}/${f.name}`));
    await admin.from("deals").delete().eq("property_id", row.id);
    await admin.from("properties").delete().eq("id", row.id);
  }
}

test("új ingatlan felvétele fotóval → adatlap → lista", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A feltöltési folyamatot desktopon ellenőrizzük");
  const title = `E2E teszt lakás ${Date.now()}`;

  try {
    await demoLogin(page);
    await page.goto("/ingatlanok/uj");

    // Hiányos űrlap: mezőnkénti hiba, nincs átirányítás.
    await page.getByRole("button", { name: "Ingatlan felvétele" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Ez a mező kötelező." }).first()).toBeVisible();

    await page.getByLabel("Hirdetés címe").fill(title);
    await page.getByLabel("Ár (Ft)").fill("45 000 000");
    await page.getByLabel("Település").fill("Szeged");
    await page.getByLabel("Alapterület (m²)").fill("55");
    await page.getByLabel("Szobák", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Ingatlan felvétele" }).click();

    await page.waitForURL(/\/ingatlanok\/[0-9a-f-]+\/szerkesztes\?uj=1/);
    await expect(page.getByText("Az ingatlan felvéve.")).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "scripts/seed/photos/interior/room-1.jpg"));
    await expect(page.getByRole("button", { name: /Fotó áthelyezése: 1\. kép/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Borító", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Tovább az adatlapra" }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("45,0 M Ft").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Fotó megnyitása/ }).first()).toBeVisible();

    await page.goto(`/ingatlanok?q=${encodeURIComponent("Szeged")}`);
    await expect(page.getByRole("link", { name: /Szeged/ }).first()).toBeVisible();
  } finally {
    await cleanup(title);
  }
});

test("ingatlanlista: szűrők az URL-ben, táblázatos nézet", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Szűrősáv-ellenőrzés desktopon");
  await demoLogin(page);
  await page.goto("/ingatlanok");
  await expect(page.getByRole("heading", { level: 1, name: "Ingatlanok" })).toBeVisible();

  await page.getByRole("radio", { name: "Lista" }).click();
  await expect(page).toHaveURL(/nezet=lista/);
  await expect(page.getByRole("columnheader", { name: "Ár" })).toBeVisible();

  await page.getByRole("button", { name: "Eladó" }).click();
  await expect(page).toHaveURL(/ugylet=sale/);
  await page.getByRole("button", { name: "Szűrők törlése" }).click();
  await expect(page).not.toHaveURL(/ugylet=/);
});

test("térkép nézet: jelölők jelennek meg, a rajzolt terület szűri a listát", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Térkép-ellenőrzés desktopon");
  await demoLogin(page);
  await page.goto("/ingatlanok?nezet=terkep");

  await expect(page.locator(".maplibregl-marker").first()).toBeVisible({ timeout: 20_000 });
  const total = await page.locator(".maplibregl-marker").count();
  expect(total).toBeGreaterThan(20);

  const count = async () => Number((await page.getByText(/ingatlan a térkép területén/).first().textContent())!.match(/\d+/)![0]);
  const before = await count();

  await page.getByRole("button", { name: "Terület rajzolása" }).click();
  const box = (await page.getByRole("region", { name: "Ingatlanok térképen" }).boundingBox())!;
  for (const [x, y] of [[0.05, 0.05], [0.4, 0.05], [0.4, 0.4], [0.05, 0.4]]) {
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
  }
  await page.getByRole("button", { name: "Kész" }).click();
  await expect(page.getByRole("button", { name: "Terület törlése" })).toBeVisible();
  await expect.poll(count).toBeLessThan(before);

  await page.getByRole("button", { name: "Terület törlése" }).click();
  await expect(page.getByRole("button", { name: "Terület rajzolása" })).toBeVisible();
  await expect.poll(count).toBe(before);
});
