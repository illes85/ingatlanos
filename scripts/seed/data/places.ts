/** Települések és budapesti kerületek közelítő koordinátái, irányítószámai és m²-ár szintjei (2026, seed). */
export interface Place {
  city: string;
  district?: number;
  postal: string;
  lat: number;
  lng: number;
  /** Tipikus m²-ár Ft-ban (lakás / ház átlag) — csak a seed és a piaci pillanatképek számára. */
  sqmPrice: number;
}

export const PLACES: Record<string, Place> = {
  "bp-2": { city: "Budapest", district: 2, postal: "1025", lat: 47.528, lng: 19.003, sqmPrice: 1_620_000 },
  "bp-3": { city: "Budapest", district: 3, postal: "1032", lat: 47.556, lng: 19.041, sqmPrice: 1_180_000 },
  "bp-6": { city: "Budapest", district: 6, postal: "1063", lat: 47.507, lng: 19.065, sqmPrice: 1_420_000 },
  "bp-8": { city: "Budapest", district: 8, postal: "1083", lat: 47.488, lng: 19.08, sqmPrice: 1_150_000 },
  "bp-11": { city: "Budapest", district: 11, postal: "1114", lat: 47.473, lng: 19.045, sqmPrice: 1_210_000 },
  "bp-12": { city: "Budapest", district: 12, postal: "1122", lat: 47.499, lng: 18.99, sqmPrice: 1_590_000 },
  "bp-13": { city: "Budapest", district: 13, postal: "1133", lat: 47.53, lng: 19.068, sqmPrice: 1_120_000 },
  "bp-14": { city: "Budapest", district: 14, postal: "1146", lat: 47.518, lng: 19.105, sqmPrice: 1_020_000 },
  "bp-15": { city: "Budapest", district: 15, postal: "1152", lat: 47.562, lng: 19.12, sqmPrice: 860_000 },
  godollo: { city: "Gödöllő", postal: "2100", lat: 47.597, lng: 19.355, sqmPrice: 720_000 },
  dunakeszi: { city: "Dunakeszi", postal: "2120", lat: 47.635, lng: 19.14, sqmPrice: 760_000 },
  szentendre: { city: "Szentendre", postal: "2000", lat: 47.669, lng: 19.075, sqmPrice: 930_000 },
  budaors: { city: "Budaörs", postal: "2040", lat: 47.461, lng: 18.958, sqmPrice: 840_000 },
  veresegyhaz: { city: "Veresegyház", postal: "2112", lat: 47.655, lng: 19.29, sqmPrice: 820_000 },
  fot: { city: "Fót", postal: "2151", lat: 47.612, lng: 19.189, sqmPrice: 690_000 },
  mogyorod: { city: "Mogyoród", postal: "2146", lat: 47.6, lng: 19.24, sqmPrice: 680_000 },
  kerepes: { city: "Kerepes", postal: "2144", lat: 47.562, lng: 19.283, sqmPrice: 640_000 },
  erd: { city: "Érd", postal: "2030", lat: 47.378, lng: 18.92, sqmPrice: 620_000 },
  torokbalint: { city: "Törökbálint", postal: "2045", lat: 47.433, lng: 18.913, sqmPrice: 780_000 },
  pomaz: { city: "Pomáz", postal: "2013", lat: 47.645, lng: 19.026, sqmPrice: 700_000 },
  vac: { city: "Vác", postal: "2600", lat: 47.776, lng: 19.134, sqmPrice: 610_000 },
};

export type PlaceKey = keyof typeof PLACES;
