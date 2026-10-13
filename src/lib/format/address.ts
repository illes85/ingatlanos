/**
 * Magyar címformázás. Budapesti kerület római számmal: „Budapest XIII., Váci út”.
 */

const ROMAN: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** 13 → „XIII” (1–23 közötti kerületekre). */
export function toRoman(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 39) {
    throw new RangeError(`Érvénytelen kerületszám: ${value}`);
  }
  let rest = value;
  let out = "";
  for (const [n, numeral] of ROMAN) {
    while (rest >= n) {
      out += numeral;
      rest -= n;
    }
  }
  return out;
}

/** 13 → „XIII.” */
export function districtLabel(district: number): string {
  return `${toRoman(district)}.`;
}

export interface AddressParts {
  city: string;
  district?: number | null;
  street?: string | null;
  postalCode?: string | null;
}

/** Település (+ kerület): „Budapest XIII.” vagy „Gödöllő”. */
export function formatLocality({ city, district }: AddressParts): string {
  return district ? `${city} ${districtLabel(district)}` : city;
}

/** Rövid cím listákhoz: „Budapest XIII., Váci út” / „Gödöllő, Szabadság út”. */
export function formatShortAddress(parts: AddressParts): string {
  const locality = formatLocality(parts);
  return parts.street ? `${locality}, ${parts.street}` : locality;
}

/** Irányítószámos cím: „2100 Gödöllő, Szabadság út”. */
export function formatPostalAddress(parts: AddressParts): string {
  const short = formatShortAddress(parts);
  return parts.postalCode ? `${parts.postalCode} ${short}` : short;
}

/** Monogram: „Kiss Anna” → „KA”. */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Magyar névből keresztnév (vezetéknév az első tag): „Kiss Anna” → „Anna”. */
export function givenName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : parts[0] ?? "";
}
