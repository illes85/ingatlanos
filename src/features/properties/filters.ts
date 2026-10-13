import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export const PROPERTY_VIEWS = ["racs", "lista", "terkep"] as const;
export type PropertyView = (typeof PROPERTY_VIEWS)[number];

export const STATUS_GROUPS = ["active", "closed", "all"] as const;
export type StatusGroup = (typeof STATUS_GROUPS)[number];

export const SORTS = ["newest", "price_asc", "price_desc", "area_desc", "mandate"] as const;
export type PropertySort = (typeof SORTS)[number];

export const PROPERTY_TYPES: Enums["property_type"][] = ["flat", "house", "plot", "office", "retail", "holiday_home"];

export const STATUS_BY_GROUP: Record<StatusGroup, Enums["property_status"][] | null> = {
  active: ["draft", "active", "under_offer", "reserved"],
  closed: ["sold", "rented", "withdrawn", "expired"],
  all: null,
};

export const PAGE_SIZE = 24;

export interface PropertyFilters {
  view: PropertyView;
  transaction: Enums["transaction_type"] | null;
  statusGroup: StatusGroup;
  types: Enums["property_type"][];
  /** Millió forintban (a szűrő is így jelenik meg). */
  priceMinM: number | null;
  priceMaxM: number | null;
  roomsMin: number | null;
  q: string;
  sort: PropertySort;
  page: number;
}

export const DEFAULT_FILTERS: PropertyFilters = {
  view: "racs",
  transaction: null,
  statusGroup: "active",
  types: [],
  priceMinM: null,
  priceMaxM: null,
  roomsMin: null,
  q: "",
  sort: "newest",
  page: 1,
};

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function pick(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function positiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** URL-paraméterekből szűrők; ismeretlen vagy hibás érték az alapértelmezésre esik vissza. */
export function parsePropertyFilters(params: RawParams): PropertyFilters {
  const types = (pick(params, "tip") ?? "")
    .split(",")
    .filter((t): t is Enums["property_type"] => PROPERTY_TYPES.includes(t as Enums["property_type"]));
  return {
    view: oneOf(pick(params, "nezet"), PROPERTY_VIEWS) ?? DEFAULT_FILTERS.view,
    transaction: oneOf(pick(params, "ugylet"), ["sale", "rent"] as const) ?? null,
    statusGroup: oneOf(pick(params, "allapot"), STATUS_GROUPS) ?? DEFAULT_FILTERS.statusGroup,
    types,
    priceMinM: positiveNumber(pick(params, "armin")),
    priceMaxM: positiveNumber(pick(params, "armax")),
    roomsMin: positiveNumber(pick(params, "szoba")),
    q: (pick(params, "q") ?? "").trim().slice(0, 80),
    sort: oneOf(pick(params, "rendezes"), SORTS) ?? DEFAULT_FILTERS.sort,
    page: Math.max(1, Math.floor(positiveNumber(pick(params, "oldal")) ?? 1)),
  };
}

/** Szűrők URL-paraméterekké; az alapértelmezett értékek kimaradnak, így a címek rövidek maradnak. */
export function propertyFiltersToParams(filters: PropertyFilters): URLSearchParams {
  const params = new URLSearchParams();
  const d = DEFAULT_FILTERS;
  if (filters.view !== d.view) params.set("nezet", filters.view);
  if (filters.transaction) params.set("ugylet", filters.transaction);
  if (filters.statusGroup !== d.statusGroup) params.set("allapot", filters.statusGroup);
  if (filters.types.length) params.set("tip", filters.types.join(","));
  if (filters.priceMinM !== null) params.set("armin", String(filters.priceMinM));
  if (filters.priceMaxM !== null) params.set("armax", String(filters.priceMaxM));
  if (filters.roomsMin !== null) params.set("szoba", String(filters.roomsMin));
  if (filters.q) params.set("q", filters.q);
  if (filters.sort !== d.sort) params.set("rendezes", filters.sort);
  if (filters.page > 1) params.set("oldal", String(filters.page));
  return params;
}

/** Hány szűrő tér el az alapértelmezéstől (a „Szűrők törlése” gomb megjelenítéséhez). */
export function activeFilterCount(filters: PropertyFilters): number {
  return (
    Number(filters.transaction !== null) +
    Number(filters.statusGroup !== DEFAULT_FILTERS.statusGroup) +
    Number(filters.types.length > 0) +
    Number(filters.priceMinM !== null || filters.priceMaxM !== null) +
    Number(filters.roomsMin !== null) +
    Number(filters.q !== "")
  );
}
