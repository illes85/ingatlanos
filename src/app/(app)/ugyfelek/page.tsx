import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { PeopleIllustration } from "@/components/illustrations";
import { activeContactFilterCount, contactFiltersToParams, parseContactFilters } from "@/features/contacts/filters";
import { getContacts, getOwnerOptions } from "@/features/contacts/queries";
import { ContactsToolbar } from "@/features/contacts/components/contacts-toolbar";
import { ContactCards, ContactTable, DirectoryNotice } from "@/features/contacts/components/contact-views";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("contacts") };
}

/** Ügyfelek (CRM): kártya- és táblanézet, URL-ben tárolt szűrők. */
export default async function ContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireAppContext();
  const filters = parseContactFilters(await searchParams);
  // Az ügynök csak a saját ügyfeleit látja, ezért neki nincs felelős-szűrő.
  const seesAll = ctx.role !== "agent";
  const [{ items, total, pageSize, directory }, owners, t, tPage] = await Promise.all([
    getContacts(ctx, filters),
    seesAll ? getOwnerOptions(ctx) : Promise.resolve(null),
    getTranslations("contacts"),
    getTranslations("contacts.pagination"),
  ]);
  const filtered = activeContactFilterCount(filters) > 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(filters.page, pages);

  return (
    <div className="flex max-w-[1400px] flex-col gap-6 p-5 md:p-8">
      <ContactsToolbar filters={filters} total={total} owners={owners} />
      <DirectoryNotice hits={directory} />
      {items.length === 0 ? (
        directory.length > 0 ? null : (
          <EmptyState
            illustration={<PeopleIllustration />}
            title={filtered ? t("empty.filteredTitle") : t("empty.title")}
            description={filtered ? t("empty.filteredBody") : t("empty.body")}
            action={
              filtered ? undefined : (
                <Button asChild>
                  <Link href="/ugyfelek/uj">{t("newContact")}</Link>
                </Button>
              )
            }
            className="py-16"
          />
        )
      ) : filters.view === "tabla" ? (
        <ContactTable items={items} />
      ) : (
        <ContactCards items={items} />
      )}
      <Pagination
        page={current}
        pages={pages}
        hrefFor={(page) => {
          const qs = contactFiltersToParams({ ...filters, page }).toString();
          return qs ? `/ugyfelek?${qs}` : "/ugyfelek";
        }}
        labels={{ label: tPage("label"), previous: tPage("previous"), next: tPage("next"), position: tPage("page", { page: current, pages }) }}
      />
    </div>
  );
}
