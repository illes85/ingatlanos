import type { Database } from "@/types/database";

type Role = Database["public"]["Enums"]["contact_role"];

export const CONTACT_VIEWS = ["kartya", "tabla"] as const;
export type ContactView = (typeof CONTACT_VIEWS)[number];

export const CONTACT_SORTS = ["name", "recent", "contacted"] as const;
export type ContactSort = (typeof CONTACT_SORTS)[number];

export const CONTACT_ROLES: Role[] = ["seller", "buyer", "tenant", "landlord", "investor", "lawyer", "mortgage_broker", "other"];

export const CONTACT_PAGE_SIZE = 24;

export interface ContactFilters {
  view: ContactView;
  q: string;
  role: Role | null;
  /** „mine” = a saját ügyfelek; „all” = mind (az owner és az asszisztens számára); egyébként egy ügynök azonosítója. */
  owner: "mine" | "all" | string;
  sort: ContactSort;
  page: number;
}

export const DEFAULT_CONTACT_FILTERS: ContactFilters = { view: "kartya", q: "", role: null, owner: "all", sort: "name", page: 1 };

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pick(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export function parseContactFilters(params: RawParams): ContactFilters {
  const owner = pick(params, "felelos");
  const page = Number(pick(params, "oldal"));
  return {
    view: oneOf(pick(params, "nezet"), CONTACT_VIEWS) ?? DEFAULT_CONTACT_FILTERS.view,
    q: (pick(params, "q") ?? "").trim().slice(0, 80),
    role: oneOf(pick(params, "szerep"), CONTACT_ROLES) ?? null,
    owner: owner === "mine" || owner === "all" || (owner && UUID.test(owner)) ? owner : DEFAULT_CONTACT_FILTERS.owner,
    sort: oneOf(pick(params, "rendezes"), CONTACT_SORTS) ?? DEFAULT_CONTACT_FILTERS.sort,
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

export function contactFiltersToParams(filters: ContactFilters): URLSearchParams {
  const params = new URLSearchParams();
  const d = DEFAULT_CONTACT_FILTERS;
  if (filters.view !== d.view) params.set("nezet", filters.view);
  if (filters.q) params.set("q", filters.q);
  if (filters.role) params.set("szerep", filters.role);
  if (filters.owner !== d.owner) params.set("felelos", filters.owner);
  if (filters.sort !== d.sort) params.set("rendezes", filters.sort);
  if (filters.page > 1) params.set("oldal", String(filters.page));
  return params;
}

export function activeContactFilterCount(filters: ContactFilters): number {
  return Number(filters.q !== "") + Number(filters.role !== null) + Number(filters.owner !== DEFAULT_CONTACT_FILTERS.owner);
}
