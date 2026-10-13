import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { propertyFiltersToParams, type PropertyFilters } from "../filters";

function hrefFor(filters: PropertyFilters, page: number): string {
  const qs = propertyFiltersToParams({ ...filters, page }).toString();
  return qs ? `/ingatlanok?${qs}` : "/ingatlanok";
}

/** Lapozó: csak akkor jelenik meg, ha több oldalnyi találat van. A hivatkozások megőrzik a szűrőket. */
export async function PropertiesPagination({ filters, total, pageSize }: { filters: PropertyFilters; total: number; pageSize: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const t = await getTranslations("properties.pagination");
  const current = Math.min(filters.page, pages);
  const link = (enabled: boolean) =>
    cn(buttonVariants({ variant: "secondary", size: "sm" }), !enabled && "pointer-events-none opacity-50");

  return (
    <nav aria-label={t("label")} className="flex items-center justify-center gap-4 pt-2">
      <Link href={hrefFor(filters, current - 1)} aria-disabled={current <= 1} tabIndex={current <= 1 ? -1 : undefined} className={link(current > 1)}>
        <ChevronLeft size={16} aria-hidden="true" />
        {t("previous")}
      </Link>
      <span className="text-13 text-muted">{t("page", { page: current, pages })}</span>
      <Link href={hrefFor(filters, current + 1)} aria-disabled={current >= pages} tabIndex={current >= pages ? -1 : undefined} className={link(current < pages)}>
        {t("next")}
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </nav>
  );
}
