import type { GeocodeQuery, GeocodeResult } from "./types";

const TIMEOUT_MS = 4000;

/**
 * Nominatim-kompatibilis geokódoló (az URL környezeti változóból jön: `GEOCODER_URL`).
 * Az ingyenes nyilvános OSM-szerver használati szabályzata (max. 1 kérés/mp, kötelező azonosító User-Agent,
 * nincs tömeges használat) élesben nem elég: saját példány vagy szolgáltató kell. Hiba esetén null,
 * a mentést ez soha nem akadályozza.
 */
export async function nominatimGeocode(baseUrl: string, query: GeocodeQuery): Promise<GeocodeResult | null> {
  const street = [query.street, query.houseNumber].filter(Boolean).join(" ");
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    countrycodes: "hu",
    city: query.city,
    ...(street ? { street } : {}),
    ...(query.postalCode ? { postalcode: query.postalCode } : {}),
  });
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/search?${params}`, {
      headers: { "User-Agent": "Kulcs/1.0 (ingatlan CRM; geokódolás)", Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "error",
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as { lat?: string; lon?: string; addresstype?: string }[];
    const hit = rows[0];
    const lat = Number(hit?.lat);
    const lng = Number(hit?.lon);
    if (!hit || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    const exact = Boolean(query.street) && ["house", "building", "road"].includes(hit.addresstype ?? "");
    return { lat, lng, precision: exact ? "exact" : "approximate", provider: "nominatim" };
  } catch {
    return null;
  }
}
