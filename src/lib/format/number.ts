/**
 * Magyar szám- és pénzformázás. Ezreselválasztó: nem törhető szóköz (U+00A0),
 * tizedesjel: vessző. Példák a tervből: „1 840 000 Ft”, „94,5 M Ft”, „738 000 Ft/m²”.
 */

export const NBSP = String.fromCharCode(0xa0);


/** Egész szám ezres tagolással: 1284 → „1 284”. A 4 jegyű számokat is tagolja. */
export function formatInteger(value: number): string {
  // Az Intl hu-HU a 4 jegyű számokat nem tagolja (minimumGroupingDigits = 2),
  // a terv viszont „1 284”-et mutat, ezért kézzel tagolunk.
  const sign = value < 0 ? "-" : "";
  const digits = Math.round(Math.abs(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** Tizedes szám vesszővel: 4.3 → „4,3”. */
export function formatDecimal(value: number, decimals = 1): string {
  return value.toFixed(decimals).replace(".", ",");
}

/** Teljes forintösszeg: 1840000 → „1 840 000 Ft”. */
export function formatHuf(value: number): string {
  return `${formatInteger(value)}${NBSP}Ft`;
}

/** m²-ár: 738000 → „738 000 Ft/m²”. */
export function formatPricePerSqm(value: number): string {
  return `${formatInteger(value)}${NBSP}Ft/m²`;
}

export interface MillionsOptions {
  /** Tizedesjegyek száma (alapból 1: „94,5 M”). */
  decimals?: number;
  /** „Ft” utótag. */
  currency?: boolean;
  /** Kerek értéknél elhagyja a tizedest („74 M”), 100 M fölött mindig egészre kerekít („312 M”). */
  compact?: boolean;
}

/**
 * Millió forintos rövid alak. Ingatlanár: „94,5 M Ft”; térképjelölő: „94,5 M”;
 * oszlop-összeg (compact): „312 M”, „79,9 M”; milliárd fölött „1,2 Mrd”.
 */
export function formatMillions(value: number, options: MillionsOptions = {}): string {
  const { decimals = 1, currency = true, compact = false } = options;
  const suffix = currency ? `${NBSP}Ft` : "";

  if (Math.abs(value) >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return `${trimZeros(formatDecimal(billions, compact ? 1 : decimals), compact)}${NBSP}Mrd${suffix}`;
  }

  const millions = value / 1_000_000;
  if (compact && Math.abs(millions) >= 100) {
    return `${formatInteger(millions)}${NBSP}M${suffix}`;
  }
  return `${trimZeros(formatDecimal(millions, decimals), compact)}${NBSP}M${suffix}`;
}

function trimZeros(text: string, enabled: boolean): string {
  return enabled ? text.replace(/,0+$/, "") : text;
}

/** Terület: 128 → „128 m²”, 76.5 → „76,5 m²”. */
export function formatArea(value: number): string {
  const text = Number.isInteger(value) ? formatInteger(value) : formatDecimal(value, 1);
  return `${text}${NBSP}m²`;
}

/** Szobaszám félszobákkal: (4, 1) → „4 + 1”, (2, 0) → „2”. */
export function formatRooms(rooms: number, halfRooms = 0): string {
  return halfRooms > 0 ? `${rooms}${NBSP}+${NBSP}${halfRooms}` : `${rooms}`;
}

/** Százalék: 61 → „61%”, 0.082 (ratio) → „8,2%”. */
export function formatPercent(value: number, decimals = 0): string {
  return `${decimals > 0 ? formatDecimal(value, decimals) : formatInteger(value)}%`;
}

/** Előjeles százalékos változás: 8.2 → „+8,2%”. */
export function formatSignedPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatDecimal(Math.abs(value), decimals)}%`;
}

