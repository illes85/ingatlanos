import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEAD_TABS, leadFiltersToParams, type LeadTab } from "../filters";
import type { LeadListResult } from "../types";

/** Lead-postaláda fejléce: cím, fülek (az állapotot az URL tárolja) és az új lead gomb. */
export async function LeadsToolbar({ tab, counts }: { tab: LeadTab; counts: LeadListResult["counts"] }) {
  const t = await getTranslations("leads");
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex items-baseline gap-3">
          <h1 className="serif text-34 leading-tight font-medium">{t("title")}</h1>
          <span className="text-14 text-muted" aria-live="polite">
            {t("newCount", { count: counts.uj })}
          </span>
        </div>
        <Button asChild>
          <Link href="/leadek/uj">
            <Plus size={18} aria-hidden="true" />
            {t("newLead")}
          </Link>
        </Button>
      </div>
      <nav aria-label={t("tabsLabel")} className="flex flex-wrap gap-2">
        {LEAD_TABS.map((key) => {
          const qs = leadFiltersToParams({ tab: key, page: 1 }).toString();
          const active = key === tab;
          return (
            <Link
              key={key}
              href={qs ? `/leadek?${qs}` : "/leadek"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full border px-4 text-14 font-semibold transition-colors",
                active ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              {t(`tabs.${key}`)}
              <span className={cn("text-12", active ? "text-primary" : "text-muted")}>{counts[key]}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
