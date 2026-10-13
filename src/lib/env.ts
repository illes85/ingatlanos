/**
 * Környezeti változók egy helyen. A szerveroldali kulcsok soha nem kerülnek a kliensbe
 * (csak NEXT_PUBLIC_ előtaggal ellátott értékek publikusak). Lásd .env.example.
 */

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  googleAuthEnabled: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
  /** Térképcsempék (raszter). Az alapértelmezett OSM-szerver csak fejlesztéshez és kis forgalomhoz való (D-021). */
  mapTileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  mapAttribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "© OpenStreetMap-közreműködők",
};

/** Csak szerveren olvasható értékek. */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() csak szerveroldalon hívható.");
  }
  return {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    demoMode: (process.env.DEMO_MODE ?? (process.env.NODE_ENV === "production" ? "false" : "true")) === "true",
    demoPassword: process.env.DEMO_USER_PASSWORD ?? "",
  };
}

export function assertSupabaseConfigured() {
  if (!publicEnv.supabaseAnonKey) {
    throw new Error(
      "Hiányzik a NEXT_PUBLIC_SUPABASE_ANON_KEY. Indítsd el a helyi Supabase-t (npm run db:start), " +
        "és másold be a kulcsokat a .env.local fájlba (lásd README).",
    );
  }
}
