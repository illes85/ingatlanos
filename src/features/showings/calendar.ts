import { budapestDayKey } from "@/lib/format";

export const CALENDAR_VIEWS = ["het", "nap"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export interface CalendarParams {
  view: CalendarView;
  /** A megjelenített nap („2026-10-14”); hétnézetben az ezt tartalmazó hét. */
  dateKey: string;
}

const KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Napkulcs ± napok (tiszta naptári számítás, időzónától független). */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A hét hétfője (a magyar naptár hétfővel kezdődik). */
export function weekStart(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = vasárnap
  return addDays(key, -((weekday + 6) % 7));
}

export function parseCalendarParams(raw: Record<string, string | string[] | undefined>, now: Date = new Date()): CalendarParams {
  const pick = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : raw[k]);
  const view = pick("nezet") === "nap" ? "nap" : "het";
  const date = pick("datum");
  const valid = date && KEY.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);
  return { view, dateKey: valid ? date : budapestDayKey(now) };
}

/** A nézet napjai: egy nap vagy a hét hét napja. */
export function visibleDays({ view, dateKey }: CalendarParams): string[] {
  if (view === "nap") return [dateKey];
  const start = weekStart(dateKey);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function calendarHref({ view, dateKey }: CalendarParams, today: string): string {
  const params = new URLSearchParams();
  if (view === "nap") params.set("nezet", "nap");
  if (dateKey !== today) params.set("datum", dateKey);
  const qs = params.toString();
  return qs ? `/naptar?${qs}` : "/naptar";
}
