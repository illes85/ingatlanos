import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { PropertyDetail } from "../detail-types";

export const DETAIL_TABS = ["attekintes", "fotok", "erdeklodok", "bemutatok", "dokumentumok", "idovonal"] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

const LABEL_KEY: Record<DetailTab, "overview" | "photos" | "leads" | "showings" | "documents" | "timeline"> = {
  attekintes: "overview",
  fotok: "photos",
  erdeklodok: "leads",
  bemutatok: "showings",
  dokumentumok: "documents",
  idovonal: "timeline",
};

export function parseDetailTab(value: string | undefined): DetailTab {
  return DETAIL_TABS.includes(value as DetailTab) ? (value as DetailTab) : "attekintes";
}

/** Fülsor hivatkozásokkal: a fül az URL-ben él (`?ful=`), így megosztható és a szerver csak az aktív fület rendereli. */
export async function DetailTabs({ propertyId, active, detail }: { propertyId: string; active: DetailTab; detail: PropertyDetail }) {
  const t = await getTranslations("properties.detail.tabs");
  const counts: Partial<Record<DetailTab, number>> = {
    erdeklodok: detail.stats.leads,
    bemutatok: detail.stats.showings,
  };

  return (
    <nav aria-label={t("label")} className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
      {DETAIL_TABS.map((tab) => {
        const selected = tab === active;
        const count = counts[tab];
        return (
          <Link
            key={tab}
            href={tab === "attekintes" ? `/ingatlanok/${propertyId}` : `/ingatlanok/${propertyId}?ful=${tab}`}
            scroll={false}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "-mb-px flex h-11 items-center border-b-2 px-3.5 text-14 whitespace-nowrap transition-colors duration-150",
              selected ? "border-primary font-bold text-ink" : "border-transparent font-semibold text-muted hover:text-ink",
            )}
          >
            {t(LABEL_KEY[tab])}
            {count !== undefined && count > 0 ? <span className="ml-1">{count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
