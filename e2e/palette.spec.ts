import { expect, test } from "@playwright/test";

test("a Ctrl K keresés leadet talál, a gyorsművelet a valódi oldalra visz", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktopon ellenőrizzük");
  await page.goto("/belepes");
  await page.getByTestId("demo-owner").click();
  await page.waitForURL("**/ma");

  await page.keyboard.press("Control+k");
  await page.getByRole("combobox").fill("Juhász");
  await expect(page.getByRole("group", { name: "Leadek" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Leadek" }).getByRole("option", { name: /Juhász Petra/ })).toBeVisible();

  await page.getByRole("combobox").fill("Új bemutató");
  await page.getByRole("option", { name: /Új bemutató/ }).click();
  await page.waitForURL("**/naptar/uj");
});
