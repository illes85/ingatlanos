import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

config({ path: ".env.local", quiet: true });

async function demoLogin(page: Page, role: "owner" | "agent" | "assistant" = "owner") {
  await page.goto("/belepes");
  await page.getByTestId(`demo-${role}`).click();
  await page.waitForURL("**/ma");
}

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function cleanup(title: string) {
  await admin().from("deals").delete().eq("title", title);
}

test("az ügyletek tábla mindkét oldalon megjelenik, az asszisztens nem vehet fel újat", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A kanbant desktopon ellenőrizzük");
  await demoLogin(page, "owner");
  await page.goto("/ugyletek");
  await expect(page.getByRole("heading", { level: 1, name: "Ügyletek" })).toBeVisible();
  await expect(page.getByTestId("column-seller-listed")).toBeVisible();
  await expect(page.getByTestId("deal-card").first()).toBeVisible();

  await page.getByRole("radio", { name: "Vevői oldal" }).click();
  await expect(page).toHaveURL(/oldal=vevo/);
  await expect(page.getByTestId("column-buyer-showings")).toBeVisible();

  await page.context().clearCookies();
  await demoLogin(page, "assistant");
  await page.goto("/ugyletek");
  await expect(page.getByRole("link", { name: "Új ügylet" })).toHaveCount(0);
});

test("új ügylet felvétele, áthúzás másik szakaszba, adatlap és elvesztés", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A kanbant desktopon ellenőrizzük");
  const title = `Kanbanteszt${Date.now()}`;

  try {
    await demoLogin(page, "owner");
    await page.goto("/ugyletek/uj");

    // Elnevezés (vagy ingatlan/ügyfél) nélkül nem lehet menteni.
    await page.getByRole("button", { name: "Ügylet felvétele" }).click();
    await expect(page.getByText("Add meg az elnevezést")).toBeVisible();

    await page.getByLabel("Elnevezés").fill(title);
    await page.getByLabel("Várható érték (M Ft)").fill("42,5");
    await page.getByRole("button", { name: "Ügylet felvétele" }).click();
    await page.waitForURL(/ugyletek[?]oldal=elado/);

    const card = page.getByTestId("deal-card").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(page.getByTestId("column-seller-acquisition").getByText(title)).toBeVisible();

    // Áthúzás az „Értékelés” szakaszba egérrel.
    const from = await card.boundingBox();
    const to = await page.getByTestId("column-seller-assessment").boundingBox();
    expect(from && to).toBeTruthy();
    await page.mouse.move(from!.x + 30, from!.y + 20);
    await page.mouse.down();
    await page.mouse.move(from!.x + 60, from!.y + 30, { steps: 5 });
    await page.mouse.move(to!.x + to!.width / 2, to!.y + 80, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId("column-seller-assessment").getByText(title)).toBeVisible();

    await expect
      .poll(async () => (await admin().from("deals").select("stage").eq("title", title).single()).data?.stage, { timeout: 15_000 })
      .toBe("assessment");

    // Adatlap, majd elvesztés.
    await page.getByRole("link", { name: title }).click();
    await page.waitForURL(/\/ugyletek\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("Akvizíció → Felmérés")).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept("Másnál kötött ki"));
    await page.getByRole("button", { name: "Elveszett", exact: true }).click();
    await expect(page.getByText("Az ügylet elveszettként lezárva.")).toBeVisible();

    const { data: lost } = await admin().from("deals").select("status, lost_reason").eq("title", title).single();
    expect(lost?.status).toBe("lost");
    expect(lost?.lost_reason).toBe("Másnál kötött ki");
  } finally {
    await cleanup(title);
  }
});
