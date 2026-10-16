import "server-only";
import { mockGeocode } from "./mock";
import { nominatimGeocode } from "./nominatim";
import type { GeocodeQuery, GeocodeResult } from "./types";

export type { GeocodeQuery, GeocodeResult } from "./types";

/**
 * Cím → koordináta. Szolgáltató: `GEOCODER_URL` megadva → Nominatim-kompatibilis szerver,
 * különben MOCK (közelítő pozíció, kerület/település közép + stabil eltolás). Hibánál null.
 */
export async function geocodeAddress(query: GeocodeQuery): Promise<GeocodeResult | null> {
  if (!query.city.trim()) return null;
  const url = process.env.GEOCODER_URL;
  if (url) {
    const result = await nominatimGeocode(url, query);
    if (result) return result;
  }
  return mockGeocode(query);
}
