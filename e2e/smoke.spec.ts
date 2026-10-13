import { expect, test, type Page } from "@playwright/test";

async function demoLogin(page: Page) {
  await page.goto("/belepes");
  await page.getByTestId("demo-owner").click();
  await page.waitForURL("**/ma");
}

test("demó belépés → „Ma” irányítópult", async ({ page }, testInfo) => {
  await demoLogin(page);

  if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("heading", { level: 1, name: /Anna/ })).toBeVisible();
    await expect(page.getByText("Havi jutalék").locator("visible=true").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ma kit hívj?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mai bemutatók" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pipeline szakaszonként" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Fő navigáció" })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "Mobil navigáció" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hangjegyzet rögzítése" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ma kit hívj?" })).toBeVisible();
  }
});

test("parancspaletta Ctrl+K-val nyílik és keres", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Billentyűparancs csak desktopon");
  await demoLogin(page);
  await page.keyboard.press("Control+k");
  const input = page.getByPlaceholder("Írj be egy nevet, címet vagy műveletet…");
  await expect(input).toBeVisible();
  await input.fill("Gödöllő");
  await expect(page.getByRole("option", { name: /Gödöllő, Szabadság út/ })).toBeVisible();
});

test("/design oldal betölt, a téma váltható", async ({ page }) => {
  await demoLogin(page);
  await page.goto("/design");
  await expect(page.getByRole("heading", { name: "Kulcs alapelemek" })).toBeVisible();
  await page.getByRole("radio", { name: "Sötét" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
