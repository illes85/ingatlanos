import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { HouseIllustration } from "@/components/illustrations";
import { activeFilterCount, parsePropertyFilters } from "@/features/properties/filters";
import { getProperties } from "@/features/properties/queries";
import { PropertiesToolbar } from "@/features/properties/components/properties-toolbar";
import { PropertyGrid } from "@/features/properties/components/property-grid";
import { PropertyTable } from "@/features/properties/components/property-table";
import { PropertiesPagination } from "@/features/properties/components/properties-pagination";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("properties") };
}

/** Ingatlanok: rács- és listanézet URL-ben tárolt szűrőkkel (a térkép nézet a következő lépésben jön). */
export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireAppContext();
  const filters = parsePropertyFilters(await searchParams);
  const { items, total, pageSize } = await getProperties(ctx, filters);
  const t = await getTranslations("properties");
  const filtered = activeFilterCount(filters) > 0;

  return (
    <div className="flex max-w-[1400px] flex-col gap-6 p-5 md:p-8">
      <PropertiesToolbar filters={filters} total={total} />
      {items.length === 0 ? (
        <EmptyState
          illustration={<HouseIllustration />}
          title={filtered ? t("empty.filteredTitle") : t("empty.title")}
          description={filtered ? t("empty.filteredBody") : t("empty.body")}
          action={
            filtered ? undefined : (
              <Button asChild>
                <Link href="/ingatlanok/uj">{t("newProperty")}</Link>
              </Button>
            )
          }
          className="py-16"
        />
      ) : filters.view === "lista" ? (
        <PropertyTable items={items} />
      ) : (
        <PropertyGrid items={items} />
      )}
      <PropertiesPagination filters={filters} total={total} pageSize={pageSize} />
    </div>
  );
}
