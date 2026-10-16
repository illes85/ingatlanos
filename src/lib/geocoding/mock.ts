import type { GeocodeQuery, GeocodeResult } from "./types";

/** Budapesti kerületek közelítő középpontja [lat, lng], index = kerület - 1. */
const BUDAPEST_DISTRICTS: readonly (readonly [number, number])[] = [
  [47.4968, 19.0375], [47.54, 19.02], [47.564, 19.043], [47.565, 19.09], [47.5, 19.053], [47.509, 19.064],
  [47.503, 19.075], [47.49, 19.085], [47.47, 19.09], [47.49, 19.15], [47.46, 19.04], [47.495, 18.99],
  [47.535, 19.07], [47.52, 19.11], [47.55, 19.12], [47.51, 19.19], [47.48, 19.25], [47.43, 19.2],
  [47.445, 19.145], [47.43, 19.145], [47.42, 19.07], [47.42, 18.99], [47.39, 19.13],
];

/** Gyakori települések közelítő középpontja [lat, lng] (kisbetűs, ékezetes név). */
const CITIES: Record<string, readonly [number, number]> = {
  "gödöllő": [47.597, 19.355],
  dunakeszi: [47.627, 19.138],
  szentendre: [47.669, 19.075],
  "budaörs": [47.462, 18.954],
  "érd": [47.392, 18.913],
  "vác": [47.776, 19.133],
  "szigetszentmiklós": [47.343, 19.043],
  "gyál": [47.385, 19.221],
  "pécs": [46.0727, 18.2323],
  debrecen: [47.5316, 21.6273],
  szeged: [46.253, 20.1414],
  "győr": [47.6875, 17.6504],
  miskolc: [48.1035, 20.7784],
  "székesfehérvár": [47.186, 18.422],
  "balatonfüred": [46.959, 17.889],
  "siófok": [46.904, 18.058],
};

/** Stabil, gyors szöveg-kivonat (a címhez tartozó eltolás determinisztikus legyen). */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * MOCK geokódoló: a kerület/település középpontját adja, az utca és házszám alapján egy stabil, kis
 * eltolással (hogy az ugyanazon területen lévő ingatlanok ne egy pontra essenek). A pozíció közelítő,
 * NEM valódi címfeloldás. TODO(integráció): valódi szolgáltató (lásd `nominatim.ts`).
 */
export function mockGeocode(query: GeocodeQuery): GeocodeResult | null {
  const city = query.city.trim().toLowerCase();
  let center: readonly [number, number] | undefined;
  if (city === "budapest") {
    center = query.district && query.district >= 1 && query.district <= 23 ? BUDAPEST_DISTRICTS[query.district - 1] : [47.4979, 19.0402];
  } else {
    center = CITIES[city];
  }
  if (!center) return null;

  const seed = hash(`${city}|${query.street ?? ""}|${query.houseNumber ?? ""}`);
  const radius = city === "budapest" ? 0.012 : 0.01; // ~ 1 km
  const dLat = ((seed & 0xffff) / 0xffff - 0.5) * 2 * radius;
  const dLng = (((seed >>> 16) & 0xffff) / 0xffff - 0.5) * 2 * radius * 1.5;
  return { lat: Number((center[0] + dLat).toFixed(6)), lng: Number((center[1] + dLng).toFixed(6)), precision: "approximate", provider: "mock" };
}
