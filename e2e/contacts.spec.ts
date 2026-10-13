import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

config({ path: ".env.local", quiet: true });

async function demoLogin(page: Page, role: "owner" | "agent" = "owner") {
  await page.goto("/belepes");
  await page.getByTestId(`demo-${role}`).click();
  await page.waitForURL("**/ma");
}

async function cleanup(lastName: string) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: rows } = await admin.from("contacts").select("id").eq("last_name", lastName);
  for (const row of rows ?? []) {
    await admin.from("activities").delete().eq("contact_id", row.id);
    await admin.from("contacts").delete().eq("id", row.id);
  }
}

test("új ügyfél felvétele → duplikátum-jelzés → jegyzet → keresési profil", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Az ügyfélfolyamatot desktopon ellenőrizzük");
  const lastName = `Tesztelő${Date.now()}`;
  const phone = `+36 30 ${String(Date.now()).slice(-3)} ${String(Date.now()).slice(-7, -3)}`;

  try {
    await demoLogin(page);
    await page.goto("/ugyfelek/uj");

    // Név nélkül nem lehet menteni.
    await page.getByRole("button", { name: "Ügyfél felvétele" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Adj meg legalább egy nevet vagy céget." })).toBeVisible();

    await page.getByLabel("Vezetéknév").fill(lastName);
    await page.getByLabel("Keresztnév").fill("Béla");
    await page.getByLabel("Telefon").fill(phone);
    await page.getByLabel("E-mail").fill(`teszt${Date.now()}@example.com`);
    await page.getByRole("checkbox", { name: "vevő" }).check();
    await page.getByRole("button", { name: "Ügyfél felvétele" }).click();

    await page.waitForURL(/\/ugyfelek\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: new RegExp(lastName) })).toBeVisible();

    // Ugyanazzal a telefonszámmal újra felvéve duplikátumot jelez.
    await page.goto("/ugyfelek/uj");
    await page.getByLabel("Vezetéknév").fill("Másik");
    await page.getByLabel("Telefon").fill(phone);
    await page.getByRole("button", { name: "Ügyfél felvétele" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "már szerepelhet az irodában" })).toBeVisible();
    await expect(page.getByRole("alert").getByText(new RegExp(lastName))).toBeVisible();

    // Jegyzet az idővonalra.
    await page.goBack();
    await page.goto("/ugyfelek?q=" + encodeURIComponent(lastName));
    await page.getByRole("link", { name: new RegExp(lastName) }).first().click();
    await page.getByRole("radio", { name: "Hívás" }).click();
    await page.getByLabel("Mi történt?").fill("Visszahívott, hétvégén ráér.");
    await page.getByRole("button", { name: "Rögzítés" }).click();
    await expect(page.getByText("Visszahívott, hétvégén ráér.")).toBeVisible();

    // Keresési profil felvétele a szerkesztő oldalon.
    await page.getByRole("link", { name: "Szerkesztés" }).click();
    await page.getByLabel("Elnevezés").fill("Gödöllői ház");
    await page.getByLabel("Települések").fill("Gödöllő");
    await page.getByLabel("Ár legfeljebb (M Ft)").fill("100");
    await page.getByRole("button", { name: "Profil mentése" }).click();
    await expect(page.getByText("Gödöllői ház")).toBeVisible();
  } finally {
    await cleanup(lastName);
  }
});

test("ügyféllista: keresés és táblázatos nézet; az ügynök csak a sajátjait látja", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Listaellenőrzés desktopon");
  await demoLogin(page, "agent");
  await page.goto("/ugyfelek");
  await expect(page.getByRole("heading", { level: 1, name: "Ügyfelek" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Felelős/ })).toHaveCount(0);

  await page.getByRole("radio", { name: "Táblázat" }).click();
  await expect(page).toHaveURL(/nezet=tabla/);
  await expect(page.getByRole("columnheader", { name: "Telefon" })).toBeVisible();
});
