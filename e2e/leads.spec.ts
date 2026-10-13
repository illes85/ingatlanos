import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

config({ path: ".env.local", quiet: true });

async function demoLogin(page: Page, role: "owner" | "agent" = "owner") {
  await page.goto("/belepes");
  await page.getByTestId(`demo-${role}`).click();
  await page.waitForURL("**/ma");
}

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function cleanup(lastName: string) {
  const db = admin();
  await db.from("leads").delete().like("full_name", `${lastName}%`);
  const { data: rows } = await db.from("contacts").select("id").eq("last_name", lastName);
  for (const row of rows ?? []) {
    await db.from("activities").delete().eq("contact_id", row.id);
    await db.from("contacts").delete().eq("id", row.id);
  }
}

test("új lead rögzítése → olvasottá válik → egy kattintással ügyfél lesz", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A lead-folyamatot desktopon ellenőrizzük");
  const lastName = `Leadteszt${Date.now()}`;
  const phone = `+36 20 ${String(Date.now()).slice(-3)} ${String(Date.now()).slice(-7, -3)}`;

  try {
    await demoLogin(page);
    await page.goto("/leadek/uj");

    // Név nélkül nem lehet menteni.
    await page.getByRole("button", { name: "Lead rögzítése" }).click();
    await expect(page.getByText("Add meg a nevet.")).toBeVisible();

    await page.getByLabel("Név", { exact: true }).fill(`${lastName} Gábor`);
    await page.getByLabel("Telefon").fill(phone);
    await page.getByLabel("Üzenet, megjegyzés").fill("Hétvégén ráérnék megnézni.");
    await page.getByRole("button", { name: "Lead rögzítése" }).click();
    await page.waitForURL("**/leadek");

    const row = page.getByTestId("lead-row").filter({ hasText: lastName });
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute("data-status", "new");

    // Megnyitáskor olvasottá válik.
    await row.getByRole("button", { name: /részletei/ }).click();
    await expect(row.getByText(phone)).toBeVisible();
    await expect(page.getByTestId("lead-row").filter({ hasText: lastName })).toHaveAttribute("data-status", "read");

    // Egy kattintásos átalakítás.
    await row.getByRole("button", { name: "Ügyféllé alakítás" }).click();
    await expect(page.getByText("A lead ügyféllé alakult.")).toBeVisible();

    await page.goto("/leadek?allapot=atalakitott");
    const converted = page.getByTestId("lead-row").filter({ hasText: lastName });
    await expect(converted).toHaveAttribute("data-status", "converted");

    // Az ügyfél létrejött, vevőként.
    await page.goto("/ugyfelek?q=" + encodeURIComponent(lastName));
    await expect(page.getByRole("link", { name: new RegExp(lastName) }).first()).toBeVisible();
  } finally {
    await cleanup(lastName);
  }
});

test("egyező ügyfélnél a lead duplikátum-jelzést kap, és a meglévőhöz kapcsolható", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A lead-folyamatot desktopon ellenőrizzük");
  const lastName = `Duplateszt${Date.now()}`;
  const tail = String(Date.now()).slice(-7);
  const phone = `+3670${tail}`;
  const db = admin();

  try {
    const { data: org } = await db.from("organizations").select("id").eq("name", "Kapu Ingatlaniroda").single();
    const { data: contact } = await db
      .from("contacts")
      .insert({ organization_id: org!.id, last_name: lastName, first_name: "Éva", phone, phone_normalized: phone, roles: ["buyer"] })
      .select("id")
      .single();
    await db.from("leads").insert({ organization_id: org!.id, full_name: `${lastName} Éva`, phone, phone_normalized: phone, source: "portal" });

    await demoLogin(page);
    await page.goto("/leadek");
    const row = page.getByTestId("lead-row").filter({ hasText: lastName });
    await expect(row.getByRole("note")).toContainText("Egyező ügyfél az irodában");
    await row.getByRole("button", { name: "Összekapcsolás a meglévővel" }).click();
    await expect(page.getByText("A lead ügyféllé alakult.")).toBeVisible();

    // Nem jött létre második ügyfél.
    const { data: contacts } = await db.from("contacts").select("id").eq("last_name", lastName);
    expect(contacts).toHaveLength(1);
    const { data: lead } = await db.from("leads").select("contact_id, status").like("full_name", `${lastName}%`).single();
    expect(lead?.contact_id).toBe(contact!.id);
    expect(lead?.status).toBe("converted");
  } finally {
    await cleanup(lastName);
  }
});

test("az ügynök a kiosztatlan leadet magához veheti", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A lead-folyamatot desktopon ellenőrizzük");
  const lastName = `Claimteszt${Date.now()}`;
  const db = admin();

  try {
    const { data: org } = await db.from("organizations").select("id").eq("name", "Kapu Ingatlaniroda").single();
    await db.from("leads").insert({ organization_id: org!.id, full_name: `${lastName} Pál`, phone: "+36301110099", phone_normalized: "+36301110099", source: "phone" });

    await demoLogin(page, "agent");
    await page.goto("/leadek");
    const row = page.getByTestId("lead-row").filter({ hasText: lastName });
    await row.getByRole("button", { name: "Magamhoz veszem" }).click();
    await expect(page.getByText("A felelős frissítve.")).toBeVisible();
    await expect(row.getByText("Hozzám rendelve")).toBeVisible();
  } finally {
    await cleanup(lastName);
  }
});
