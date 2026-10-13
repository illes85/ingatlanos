import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { PeopleIllustration } from "@/components/illustrations";
import { leadFiltersToParams, parseLeadFilters } from "@/features/leads/filters";
import { getLeads } from "@/features/leads/queries";
import { getOwnerOptions } from "@/features/contacts/queries";
import { LeadsToolbar } from "@/features/leads/components/leads-toolbar";
import { LeadList } from "@/features/leads/components/lead-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("leads") };
}

/** Lead-postaláda: beérkezett érdeklődők, kiosztás és egykattintásos átalakítás ügyféllé. */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireAppContext();
  const filters = parseLeadFilters(await searchParams);
  const canAssign = ctx.role !== "agent";
  const [{ items, total, pageSize, counts }, assignees, t, tPage] = await Promise.all([
    getLeads(ctx, filters),
    canAssign ? getOwnerOptions(ctx) : Promise.resolve([]),
    getTranslations("leads"),
    getTranslations("leads.pagination"),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(filters.page, pages);

  return (
    <div className="flex max-w-[1100px] flex-col gap-6 p-5 md:p-8">
      <LeadsToolbar tab={filters.tab} counts={counts} />
      {items.length === 0 ? (
        <EmptyState illustration={<PeopleIllustration />} title={t(`empty.${filters.tab}.title`)} description={t(`empty.${filters.tab}.body`)} className="py-16" />
      ) : (
        <LeadList items={items} canAssign={canAssign} userId={ctx.userId} assignees={assignees} nowIso={new Date().toISOString()} />
      )}
      <Pagination
        page={current}
        pages={pages}
        hrefFor={(page) => {
          const qs = leadFiltersToParams({ ...filters, page }).toString();
          return qs ? `/leadek?${qs}` : "/leadek";
        }}
        labels={{ label: tPage("label"), previous: tPage("previous"), next: tPage("next"), position: tPage("page", { page: current, pages }) }}
      />
    </div>
  );
}
