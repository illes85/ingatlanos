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

test("feladat felvétele, elvégzése és ismétlődő feladat újraképződése", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktopon ellenőrizzük");
  const title = `Feladatteszt${Date.now()}`;
  try {
    await demoLogin(page, "agent");
    await page.goto("/feladatok/uj");
    await page.getByRole("button", { name: "Feladat felvétele" }).click();
    await expect(page.getByText("Ez a mező kötelező").first()).toBeVisible();

    await page.getByLabel("Mi a teendő?").fill(title);
    await page.getByLabel("Határidő (nap)").fill("2030-01-15");
    await page.getByLabel("Ismétlődés").selectOption("weekly");
    await page.getByRole("button", { name: "Feladat felvétele" }).click();
    await page.waitForURL(/\/feladatok$/);

    const row = page.getByTestId("task-row").filter({ hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole("checkbox", { name: "Elvégzettnek jelölés" }).click();
    await expect(page.getByText("Feladat elvégezve.")).toBeVisible();

    // Az ismétlődő feladat következő példánya egy héttel később jön létre.
    await expect
      .poll(async () => (await admin().from("tasks").select("status, due_at").eq("title", title)).data?.length, { timeout: 15_000 })
      .toBe(2);
    const { data } = await admin().from("tasks").select("status").eq("title", title);
    expect(data?.map((t) => t.status).sort()).toEqual(["done", "open"]);
  } finally {
    await admin().from("tasks").delete().eq("title", title);
  }
});

test("bemutató rögzítése megjelenik a naptárban, lezajlottként jelölhető és visszajelzés menthető", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktopon ellenőrizzük");
  const note = `Bemutatóteszt${Date.now()}`;
  try {
    await demoLogin(page, "owner");
    await page.goto("/naptar/uj?datum=2030-01-15");
    await page.getByRole("button", { name: "Bemutató rögzítése" }).click();
    await expect(page.getByText("Ez a mező kötelező").first()).toBeVisible();

    await page.getByLabel("Ingatlan", { exact: true }).selectOption({ index: 1 });
    await page.getByLabel("Időpont").fill("10:30");
    await page.getByLabel("Megjegyzés").fill(note);
    await page.getByRole("button", { name: "Bemutató rögzítése" }).click();
    await page.waitForURL(/\/naptar[?]datum=2030-01-15/);

    const item = page.getByTestId("day-2030-01-15").getByTestId("calendar-showing");
    await expect(item).toBeVisible();
    await expect(item).toContainText("10:30");
    await item.click();
    await page.waitForURL(/\/naptar\/[0-9a-f-]+$/);

    await page.getByRole("button", { name: "Lezajlott", exact: true }).click();
    await expect(page.getByText("Bemutató lezajlottként rögzítve.")).toBeVisible();
    await page.getByRole("radio", { name: "4 csillag" }).click();
    await page.getByLabel("Visszajelzés szövege").fill("Tetszett a konyha");
    await page.getByRole("button", { name: "Visszajelzés mentése" }).click();
    await expect(page.getByText("Visszajelzés mentve.")).toBeVisible();

    const { data } = await admin().from("showings").select("status, feedback_rating, feedback_text").eq("notes", note).single();
    expect(data).toMatchObject({ status: "completed", feedback_rating: 4, feedback_text: "Tetszett a konyha" });

    await page.getByRole("link", { name: "Bemutatási lap" }).click();
    await expect(page.getByTestId("showing-sheet")).toBeVisible();
  } finally {
    await admin().from("showings").delete().eq("notes", note);
  }
});

test("a naptár hét- és napnézete között lehet váltani", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktopon ellenőrizzük");
  await demoLogin(page, "assistant");
  await page.goto("/naptar");
  await expect(page.getByRole("heading", { level: 1, name: "Naptár" })).toBeVisible();
  await expect(page.locator("[data-testid^=day-]")).toHaveCount(7);
  await page.getByRole("link", { name: "Nap", exact: true }).click();
  await expect(page).toHaveURL(/nezet=nap/);
  await expect(page.locator("[data-testid^=day-]")).toHaveCount(1);
});
