import { defineConfig, devices } from "@playwright/test";

/**
 * Fő folyamatok smoke tesztjei. Előfeltétel: futó helyi Supabase + seed (npm run db:setup).
 * A telepített Google Chrome-ot használja (channel: "chrome"), külön böngészőletöltés nélkül.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  retries: 0,
  // A fejlesztői szerver első oldalfordítása lassú lehet; ne ez bukassa el a tesztet.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    locale: "hu-HU",
    timezoneId: "Europe/Budapest",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 1000 } } },
    { name: "mobil", use: { ...devices["Pixel 7"], channel: "chrome", viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/belepes",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
