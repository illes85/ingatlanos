import { getTranslations } from "next-intl/server";
import { Pagination } from "@/components/ui/pagination";
import { propertyFiltersToParams, type PropertyFilters } from "../filters";

function hrefFor(filters: PropertyFilters, page: number): string {
  const qs = propertyFiltersToParams({ ...filters, page }).toString();
  return qs ? `/ingatlanok?${qs}` : "/ingatlanok";
}

/** Az ingatlanlista lapozója; a hivatkozások megőrzik a szűrőket. */
export async function PropertiesPagination({ filters, total, pageSize }: { filters: PropertyFilters; total: number; pageSize: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const t = await getTranslations("properties.pagination");
  const current = Math.min(filters.page, pages);
  return (
    <Pagination
      page={current}
      pages={pages}
      hrefFor={(page) => hrefFor(filters, page)}
      labels={{ label: t("label"), previous: t("previous"), next: t("next"), position: t("page", { page: current, pages }) }}
    />
  );
}
