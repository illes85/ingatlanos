import { expect, test, type Page } from "@playwright/test";

/**
 * Csomagok és kredit (2. fázis). MOCK fizetési módban fut: a csomagváltás azonnali és szimulált.
 * A teszt módosítja a demó szervezet csomagját; a végén Pro AI-ra állít, a seed újrafuttatása visszaállítja.
 */
async function demoLogin(page: Page) {
  await page.goto("/belepes");
  await page.getByTestId("demo-owner").click();
  await page.waitForURL("**/ma");
}

test.describe.configure({ mode: "serial" });

test.describe("csomagok és kredit", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "A csomagváltó felület desktopon fut");
  });

  test("árazási oldal: nettó árak, éves váltó −20%, ÁFA-megjegyzés", async ({ page }) => {
    await demoLogin(page);
    await page.goto("/csomagok");
    await expect(page.getByRole("heading", { level: 1, name: "Csomagok és számlázás" })).toBeVisible();
    await expect(page.getByTestId("price-pro")).toHaveText(/7\s?900/);
    await page.getByRole("radio", { name: /Éves/ }).click();
    await expect(page.getByTestId("price-pro")).toHaveText(/6\s?320/);
    await expect(page.getByText(/27% ÁFA/).first()).toBeVisible();
  });

  test("csomagváltáskor a funkciók azonnal zárulnak és nyílnak, a kredit látszik", async ({ page }) => {
    await demoLogin(page);
    await page.goto("/csomagok");
    test.skip(!(await page.getByText(/Teszt mód/).isVisible()), "Csak MOCK fizetési módban");

    // Pro: az értékbecslő (Pro AI funkció) zárolt
    await page.locator('[data-plan="pro"]').getByRole("button", { name: "Ezt választom" }).click();
    await expect(page.getByTestId("billing-result")).toBeVisible();
    await page.goto("/ertekbecsles");
    await expect(page.getByText("Csomagok megtekintése")).toBeVisible();

    // Pro AI: ugyanaz az oldal megnyílik
    await page.goto("/csomagok");
    await page.locator('[data-plan="pro_ai"]').getByRole("button", { name: "Ezt választom" }).click();
    await expect(page.getByTestId("billing-result")).toBeVisible();
    await page.goto("/ertekbecsles");
    await expect(page.getByText("Csomagok megtekintése")).toHaveCount(0);
  });

  test("kreditvásárlás: a vásárolt kredit megjelenik a naplóban", async ({ page }) => {
    await demoLogin(page);
    await page.goto("/csomagok");
    test.skip(!(await page.getByText(/Teszt mód/).isVisible()), "Csak MOCK fizetési módban");
    const before = Number((await page.getByTestId("credits-purchased").innerText()).replace(/\D/g, ""));
    await page.getByRole("button", { name: "Vásárlás" }).first().click();
    await expect(page.getByTestId("billing-result")).toContainText("jóváírva");
    const after = Number((await page.getByTestId("credits-purchased").innerText()).replace(/\D/g, ""));
    expect(after).toBe(before + 200);
    await expect(page.getByTestId("credit-ledger")).toContainText("Kreditvásárlás");
  });

  test("lemondás: az időszak végéig aktív marad", async ({ page }) => {
    await demoLogin(page);
    await page.goto("/csomagok");
    test.skip(!(await page.getByText(/Teszt mód/).isVisible()), "Csak MOCK fizetési módban");
    await page.getByText("Előfizetés lemondása").click();
    await page.getByRole("button", { name: "Igen, lemondom" }).click();
    await expect(page.getByTestId("billing-status")).toContainText("aktív marad");
  });

  test("az ügynök nem módosíthatja a csomagot", async ({ page }) => {
    await page.goto("/belepes");
    await page.getByTestId("demo-agent").click();
    await page.waitForURL("**/ma");
    await page.goto("/csomagok");
    await expect(page.getByText("A csomagot az irodavezető (owner) módosíthatja.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ezt választom" })).toHaveCount(0);
  });
});
