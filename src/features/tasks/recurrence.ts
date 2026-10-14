import { budapestMidnight } from "@/lib/format";

export const REPEATS = ["none", "daily", "weekly", "monthly"] as const;
export type Repeat = (typeof REPEATS)[number];

/** A napvégi határidő jelzése: ha nincs óra megadva, a feladat aznap 23:59-ig esedékes. */
export const END_OF_DAY = "23:59";

const RULES: Record<Exclude<Repeat, "none">, string> = {
  daily: "FREQ=DAILY",
  weekly: "FREQ=WEEKLY",
  monthly: "FREQ=MONTHLY",
};

export function repeatToRule(repeat: Repeat): string | null {
  return repeat === "none" ? null : RULES[repeat];
}

/** Az RRULE gyakoriságát olvassa ki („FREQ=WEEKLY;BYDAY=MO” → weekly); ismeretlen szabály: none. */
export function ruleToRepeat(rule: string | null | undefined): Repeat {
  const freq = /(?:^|;)FREQ=(DAILY|WEEKLY|MONTHLY)(?:;|$)/.exec(rule ?? "")?.[1];
  return freq === "DAILY" ? "daily" : freq === "WEEKLY" ? "weekly" : freq === "MONTHLY" ? "monthly" : "none";
}

/** Budapesti „2026-10-14” + „15:30” → pontos időpont. */
export function combineDueAt(dateKey: string, time: string | undefined): Date {
  const [h, m] = (time || END_OF_DAY).split(":").map(Number);
  return new Date(budapestMidnight(dateKey).getTime() + ((h ?? 23) * 60 + (m ?? 59)) * 60_000);
}
