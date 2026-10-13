import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

/** A párosításhoz szükséges ingatlanmezők. */
export interface MatchableProperty {
  transactionType: Enums["transaction_type"];
  propertyType: Enums["property_type"];
  price: number;
  areaSqm: number | null;
  rooms: number | null;
  city: string;
  district: number | null;
}

/** A párosításhoz szükséges keresési profil-mezők. */
export interface MatchableProfile {
  active: boolean;
  transactionType: Enums["transaction_type"];
  propertyTypes: Enums["property_type"][];
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  roomsMin: number | null;
  cities: string[];
  districts: number[];
}

export interface MatchResult {
  /** 0–100; null, ha a profil kizáró feltétele nem teljesül (ügylet típusa, ingatlantípus, túl magas ár). */
  score: number | null;
}

/** Ennyi százalék alatt nem ajánljuk a párosítást. */
export const MIN_MATCH_SCORE = 50;

const WEIGHTS = { price: 35, location: 25, type: 15, rooms: 10, area: 10, size: 5 } as const;

function normalize(text: string): string {
  return text.toLocaleLowerCase("hu").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function priceFit(price: number, min: number | null, max: number | null): number | null {
  if (max !== null && price > max) {
    const over = (price - max) / max;
    if (over <= 0.05) return 0.6;
    if (over <= 0.1) return 0.3;
    return null;
  }
  if (min !== null && price < min) return 0.8;
  return 1;
}

function locationFit(property: MatchableProperty, profile: MatchableProfile): number {
  const hasCities = profile.cities.length > 0;
  const hasDistricts = profile.districts.length > 0;
  if (!hasCities && !hasDistricts) return 0.7; // nincs megadott terület: semleges
  const city = normalize(property.city);
  const cityMatch = hasCities && profile.cities.some((c) => normalize(c) === city);
  const districtMatch = hasDistricts && property.district !== null && profile.districts.includes(property.district);
  return cityMatch || districtMatch ? 1 : 0;
}

function roomsFit(rooms: number | null, min: number | null): number {
  if (min === null || rooms === null) return 1;
  if (rooms >= min) return 1;
  return rooms === min - 1 ? 0.4 : 0;
}

function areaFit(area: number | null, min: number | null, max: number | null): number {
  if (area === null || (min === null && max === null)) return 1;
  if ((min === null || area >= min) && (max === null || area <= max)) return 1;
  const nearMin = min !== null && area < min && area >= min * 0.9;
  const nearMax = max !== null && area > max && area <= max * 1.1;
  return nearMin || nearMax ? 0.5 : 0;
}

/**
 * Szabályalapú párosítás ingatlan és keresési profil között (nem AI): a súlyozott illeszkedés 0–100 pont.
 * Kizáró feltétel: más ügylettípus, más ingatlantípus, a keretet 10%-nál jobban meghaladó ár, inaktív profil.
 */
export function scoreMatch(property: MatchableProperty, profile: MatchableProfile): MatchResult {
  if (!profile.active) return { score: null };
  if (profile.transactionType !== property.transactionType) return { score: null };
  if (profile.propertyTypes.length > 0 && !profile.propertyTypes.includes(property.propertyType)) return { score: null };

  const price = priceFit(property.price, profile.priceMin, profile.priceMax);
  if (price === null) return { score: null };

  const total =
    WEIGHTS.price * price +
    WEIGHTS.location * locationFit(property, profile) +
    WEIGHTS.type +
    WEIGHTS.rooms * roomsFit(property.rooms, profile.roomsMin) +
    WEIGHTS.area * areaFit(property.areaSqm, profile.areaMin, profile.areaMax) +
    WEIGHTS.size;
  return { score: Math.round(total) };
}
