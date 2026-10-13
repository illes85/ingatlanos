/**
 * Magyar dátumformázás, Europe/Budapest időzónában, 24 órás idővel.
 * Példák: „2026. október 2.”, „2026. október 2., péntek”, „szept. 28.”, „13:30”.
 */

export const TIME_ZONE = "Europe/Budapest";

type DateInput = Date | string | number;

const toDate = (input: DateInput) => (input instanceof Date ? input : new Date(input));

const fullDate = new Intl.DateTimeFormat("hu-HU", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
});

const weekday = new Intl.DateTimeFormat("hu-HU", { timeZone: TIME_ZONE, weekday: "long" });

const monthDayLong = new Intl.DateTimeFormat("hu-HU", {
  timeZone: TIME_ZONE,
  month: "long",
  day: "numeric",
});

const monthDayShort = new Intl.DateTimeFormat("hu-HU", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
});

const time = new Intl.DateTimeFormat("hu-HU", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const hourOnly = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** „2026. október 2.” */
export function formatDate(input: DateInput): string {
  return fullDate.format(toDate(input));
}

/** „2026. október 2., péntek” */
export function formatDateWithWeekday(input: DateInput): string {
  return `${formatDate(input)}, ${weekday.format(toDate(input))}`;
}

/** „Péntek, október 2.” — mobil fejléc */
export function formatWeekdayMonthDay(input: DateInput): string {
  const day = weekday.format(toDate(input));
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${monthDayLong.format(toDate(input))}`;
}

/** „okt. 8.” — rövid hivatkozás idővonalon, kártyán */
export function formatShortDate(input: DateInput): string {
  return monthDayShort.format(toDate(input));
}

/** „2027. jan. 14.” — évvel, rövid hónappal (megbízás lejárata) */
export function formatShortDateWithYear(input: DateInput): string {
  const d = toDate(input);
  return `${dayKey.format(d).slice(0, 4)}. ${monthDayShort.format(d)}`;
}

/** „13:30” */
export function formatTime(input: DateInput): string {
  return time.format(toDate(input));
}

/** Óra (0–23) budapesti idő szerint — köszönéshez. */
export function budapestHour(input: DateInput = new Date()): number {
  return Number(hourOnly.format(toDate(input)));
}

/** Napkulcs („2026-10-02”) budapesti idő szerint — napi csoportosításhoz. */
export function budapestDayKey(input: DateInput): string {
  return dayKey.format(toDate(input));
}

/** Egész napok különbsége két időpont között budapesti naptári napok szerint (b − a). */
export function calendarDaysBetween(a: DateInput, b: DateInput): number {
  const ka = Date.parse(`${budapestDayKey(a)}T00:00:00Z`);
  const kb = Date.parse(`${budapestDayKey(b)}T00:00:00Z`);
  return Math.round((kb - ka) / 86_400_000);
}

export type DayPart = "morning" | "day" | "evening";

/** Napszak a köszönéshez: 5–9 reggel, 9–18 nap, egyébként este. */
export function dayPart(input: DateInput = new Date()): DayPart {
  const h = budapestHour(input);
  if (h >= 5 && h < 9) return "morning";
  if (h >= 9 && h < 18) return "day";
  return "evening";
}

/** Budapest időzóna eltolása (ms) egy adott pillanatban (nyári időszámítással). */
function budapestOffsetMs(instant: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Budapesti naptári nap éjfele UTC időpontként (napKulcs: „2026-10-02”). */
export function budapestMidnight(dayKeyValue: string): Date {
  const guess = new Date(`${dayKeyValue}T00:00:00Z`);
  return new Date(guess.getTime() - budapestOffsetMs(guess));
}

/** A budapesti „ma” [kezdet, vég) intervalluma UTC-ben. */
export function budapestDayRange(input: DateInput = new Date()): { start: Date; end: Date } {
  const start = budapestMidnight(budapestDayKey(input));
  const next = new Date(start.getTime() + 36 * 3_600_000); // biztosan a következő napra esik (DST is)
  return { start, end: budapestMidnight(budapestDayKey(next)) };
}

/** Az aktuális budapesti hónap első napjának éjfele UTC-ben. */
export function budapestMonthStart(input: DateInput = new Date()): Date {
  return budapestMidnight(`${budapestDayKey(input).slice(0, 7)}-01`);
}
