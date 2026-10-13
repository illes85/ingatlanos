export type NavKey =
  | "today"
  | "properties"
  | "contacts"
  | "leads"
  | "deals"
  | "calendar"
  | "tasks"
  | "documents"
  | "valuation"
  | "acquisition"
  | "marketing";

export interface NavItem {
  key: NavKey;
  href: string;
  /** Munkaigényes képernyő: az oldalsáv automatikusan 76px-es ikonsávra csukódik. */
  workspace?: boolean;
}

/** Fő menü (oldalsáv, Main.dc.html sorrend). */
export const MAIN_NAV: NavItem[] = [
  { key: "today", href: "/ma" },
  { key: "properties", href: "/ingatlanok", workspace: true },
  { key: "contacts", href: "/ugyfelek" },
  { key: "leads", href: "/leadek" },
  { key: "deals", href: "/ugyletek", workspace: true },
  { key: "calendar", href: "/naptar" },
  { key: "tasks", href: "/feladatok" },
  { key: "documents", href: "/dokumentumok" },
];

/** PRÉMIUM szekció — ✦ ikonokkal. */
export const PREMIUM_NAV: NavItem[] = [
  { key: "valuation", href: "/ertekbecsles" },
  { key: "acquisition", href: "/megbizasszerzes" },
  { key: "marketing", href: "/marketing" },
];

/** Mobil alsó navigáció: Ma · Ingatlanok · [mikrofon] · Lead · Naptár. */
export const MOBILE_NAV_LEFT: NavKey[] = ["today", "properties"];
export const MOBILE_NAV_RIGHT: NavKey[] = ["leads", "calendar"];

export const ALL_NAV = [...MAIN_NAV, ...PREMIUM_NAV];

export function navItem(key: NavKey): NavItem {
  return ALL_NAV.find((item) => item.key === key)!;
}

/** Az adott útvonal munkaigényes-e (pl. /ingatlanok/…, /ugyletek). Adatlap, térkép, kanban. */
export function isWorkspacePath(pathname: string): boolean {
  return ALL_NAV.some((item) => item.workspace && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
