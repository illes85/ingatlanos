export const LEAD_TABS = ["aktiv", "uj", "atalakitott", "lezart"] as const;
export type LeadTab = (typeof LEAD_TABS)[number];

export const LEAD_PAGE_SIZE = 20;

export interface LeadFilters {
  tab: LeadTab;
  page: number;
}

export const DEFAULT_LEAD_FILTERS: LeadFilters = { tab: "aktiv", page: 1 };

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function pick(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function parseLeadFilters(params: RawParams): LeadFilters {
  const tab = pick(params, "allapot");
  const page = Number(pick(params, "oldal"));
  return {
    tab: (LEAD_TABS as readonly string[]).includes(tab ?? "") ? (tab as LeadTab) : DEFAULT_LEAD_FILTERS.tab,
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

export function leadFiltersToParams(filters: LeadFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tab !== DEFAULT_LEAD_FILTERS.tab) params.set("allapot", filters.tab);
  if (filters.page > 1) params.set("oldal", String(filters.page));
  return params;
}

/** Az egyes fülekhez tartozó lead-állapotok. */
export const TAB_STATUSES: Record<LeadTab, readonly ("new" | "read" | "contacted" | "converted" | "archived" | "spam")[]> = {
  aktiv: ["new", "read", "contacted"],
  uj: ["new"],
  atalakitott: ["converted"],
  lezart: ["archived", "spam"],
};
