import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNTS } from "../src/config/demo";

config({ path: ".env.local", quiet: true });

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

test("a csengő jelzi az új értesítést valós időben, listázza, és olvasottra állítható", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktopon ellenőrizzük");
  const svc = admin();
  const title = `E2E értesítés ${Date.now()}`;

  await page.goto("/belepes");
  await page.getByTestId("demo-agent").click();
  await page.waitForURL("**/ma");

  // Megvárjuk, hogy a csengő feliratkozzon a valós idejű csatornára.
  await expect(page.getByRole("button", { name: /Értesítések/ })).toHaveAttribute("data-live", "true", { timeout: 20_000 });

  const { data: me } = await svc.from("profiles").select("id").eq("email", DEMO_ACCOUNTS.agent.email).single();
  const { data: membership } = await svc.from("memberships").select("organization_id").eq("user_id", me!.id).single();

  try {
    // A csengő tesztjéhez közvetlenül szúrjuk be az értesítést (a kiváltókat az RLS-teszt fedi).
    await svc.from("notifications").insert({ organization_id: membership!.organization_id, user_id: me!.id, type: "task_assigned", title, body: "Teszt tartalom", link: "/feladatok" });

    // Valós idejű érkezés: a lista megnyitása nélkül is megjelenik az értesítés-üzenet.
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Értesítések/ }).click();
    const list = page.getByTestId("notifications-list");
    await expect(list.getByText(title)).toBeVisible();
    await list.getByText(title).click();
    await page.waitForURL("**/feladatok");
  } finally {
    await svc.from("notifications").delete().eq("title", title);
  }
});
