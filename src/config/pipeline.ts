import type { Database } from "@/types/database";

export type DealSide = Database["public"]["Enums"]["deal_side"];
export type DealStage = Database["public"]["Enums"]["deal_stage"];

/** Eladói pipeline szakaszai sorrendben (spec 6/5). */
export const SELLER_STAGES = [
  "acquisition",
  "assessment",
  "mandate_signed",
  "listed",
  "offer",
  "deposit",
  "contract",
  "closed",
] as const satisfies readonly DealStage[];

/** Vevői pipeline szakaszai sorrendben. */
export const BUYER_STAGES = [
  "new",
  "needs_assessment",
  "showings",
  "offer",
  "financing",
  "contract",
  "closed",
] as const satisfies readonly DealStage[];

export const STAGES_BY_SIDE: Record<DealSide, readonly DealStage[]> = {
  seller: SELLER_STAGES,
  buyer: BUYER_STAGES,
};

/** Zárás előtti, „pénzszagú” szakaszok — réz színnel jelöljük. */
export const PRE_CLOSE_STAGES: readonly DealStage[] = ["deposit", "contract", "financing"];

export function isPreCloseStage(stage: DealStage): boolean {
  return PRE_CLOSE_STAGES.includes(stage);
}

/** Öregedés-sávok (napok a szakaszban) — Alapelemek: 0–7 / 8–14 / 15+. */
export type AgingLevel = "fresh" | "aging" | "stale";

export function agingLevel(daysInStage: number): AgingLevel {
  if (daysInStage >= 15) return "stale";
  if (daysInStage >= 8) return "aging";
  return "fresh";
}

/** Alapértelmezett lezárási valószínűség szakaszonként (%), ha az ügyletnél nincs megadva (súlyozott érték). */
export const DEFAULT_PROBABILITY: Record<DealStage, number> = {
  acquisition: 10,
  assessment: 20,
  mandate_signed: 35,
  listed: 45,
  new: 5,
  needs_assessment: 15,
  showings: 30,
  offer: 60,
  financing: 80,
  deposit: 80,
  contract: 90,
  closed: 100,
};
