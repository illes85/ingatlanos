/** Seed segédfüggvények: determinisztikus véletlen, időpontok budapesti idő szerint. */
import { budapestDayKey, budapestMidnight } from "../../src/lib/format/date";

/** mulberry32 — determinisztikus PRNG, hogy a seed minden futáskor ugyanazt adja. */
export function createRandom(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
    chance: (p: number) => next() < p,
    jitter: (value: number, spread: number) => value + (next() - 0.5) * 2 * spread,
  };
}

export type Random = ReturnType<typeof createRandom>;

const DAY = 86_400_000;

/** Időhorgony: minden dátum a seed futtatásának pillanatához képest relatív. */
export function createClock(now = new Date()) {
  const todayKey = budapestDayKey(now);
  const todayMidnight = budapestMidnight(todayKey);
  return {
    now,
    todayKey,
    /** n nappal ezelőtt (ugyanabban az időpontban). */
    daysAgo: (n: number) => new Date(now.getTime() - n * DAY),
    daysAhead: (n: number) => new Date(now.getTime() + n * DAY),
    /** A mai budapesti nap adott órája/perce (UTC Date). */
    todayAt: (hour: number, minute = 0) => new Date(todayMidnight.getTime() + (hour * 60 + minute) * 60_000),
    /** n nap múlva (negatív: ezelőtt) adott budapesti órában. */
    dayAt: (offsetDays: number, hour: number, minute = 0) => {
      const key = budapestDayKey(new Date(todayMidnight.getTime() + offsetDays * DAY + 12 * 3_600_000));
      return new Date(budapestMidnight(key).getTime() + (hour * 60 + minute) * 60_000);
    },
    /** Csak dátum (YYYY-MM-DD) n nap múlva. */
    dateAhead: (n: number) => budapestDayKey(new Date(now.getTime() + n * DAY)),
    monthStart: budapestMidnight(`${todayKey.slice(0, 7)}-01`),
  };
}

export type Clock = ReturnType<typeof createClock>;

/** Magyar mobilszám E.164 és megjelenítési alakban. */
export function hungarianPhone(random: Random) {
  const prefix = random.pick(["20", "30", "70"]);
  const a = random.int(100, 999);
  const b = random.int(1000, 9999);
  return { display: `+36 ${prefix} ${a} ${b}`, normalized: `+36${prefix}${a}${b}` };
}

/** Ékezetmentes e-mail-helyi rész: „Varga Bence” → „varga.bence”. */
export function emailLocalPart(fullName: string) {
  return fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");
}

export function slugify(text: string) {
  return emailLocalPart(text).replace(/\./g, "-");
}
