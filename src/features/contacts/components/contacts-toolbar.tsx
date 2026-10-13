"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented";
import { FilterChip } from "@/features/properties/components/filter-chip";
import { cn } from "@/lib/utils";
import {
  CONTACT_ROLES,
  CONTACT_VIEWS,
  DEFAULT_CONTACT_FILTERS,
  activeContactFilterCount,
  contactFiltersToParams,
  type ContactFilters,
} from "../filters";

type PanelKey = "role" | "owner";
const SEARCH_DEBOUNCE_MS = 350;

function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex h-10 w-full cursor-pointer items-center rounded-control px-3 text-left text-14",
        selected ? "bg-primary-soft font-semibold text-primary" : "text-ink-2 hover:bg-surface-sunken hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

interface ContactsToolbarProps {
  filters: ContactFilters;
  total: number;
  /** A felelős-szűrő csak azoknak jelenik meg, akik az egész iroda ügyfeleit látják. */
  owners: { id: string; name: string }[] | null;
}

/** Ügyféllista fejléc: cím, keresés, szűrők és nézetváltó. Az állapot az URL-ben él. */
export function ContactsToolbar({ filters, total, owners }: ContactsToolbarProps) {
  const t = useTranslations("contacts");
  const tRoles = useTranslations("enums.contactRole");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [query, setQuery] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (patch: Partial<ContactFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const qs = contactFiltersToParams(next).toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const onSearch = (value: string) => {
    setQuery(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  };
  const panel = (key: PanelKey) => ({ open: openPanel === key, onOpenChange: (open: boolean) => setOpenPanel(open ? key : null) });

  const ownerLabel = (owner: string) => (owner === "mine" ? t("filters.mine") : (owners?.find((o) => o.id === owner)?.name ?? owner));

  return (
    <header className="flex flex-col gap-4" aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex items-baseline gap-3">
          <h1 className="serif text-34 font-medium leading-tight">{t("title")}</h1>
          <span className="text-14 text-muted" aria-live="polite">
            {t("count", { count: total })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedControl
            label={t("viewLabel")}
            value={filters.view}
            onValueChange={(view) => update({ view })}
            options={CONTACT_VIEWS.map((view) => ({ value: view, label: t(`views.${view}`) }))}
          />
          <Button asChild>
            <Link href="/ugyfelek/uj">
              <Plus size={18} aria-hidden="true" />
              {t("newContact")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          type="search"
          value={query}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          leading={<Search size={16} aria-hidden="true" />}
          wrapperClassName="w-full sm:w-[320px]"
        />

        <FilterChip
          label={`+ ${t("filters.role")}`}
          value={filters.role ? tRoles(filters.role) : null}
          onClear={() => update({ role: null })}
          clearLabel={t("filters.remove", { name: t("filters.role") })}
          {...panel("role")}
        >
          <div role="radiogroup" aria-label={t("filters.role")} className="flex flex-col gap-0.5">
            {CONTACT_ROLES.map((role) => (
              <Option
                key={role}
                selected={filters.role === role}
                onClick={() => {
                  update({ role });
                  setOpenPanel(null);
                }}
              >
                {tRoles(role)}
              </Option>
            ))}
          </div>
        </FilterChip>

        {owners ? (
          <FilterChip
            label={`+ ${t("filters.owner")}`}
            value={filters.owner !== DEFAULT_CONTACT_FILTERS.owner ? ownerLabel(filters.owner) : null}
            onClear={() => update({ owner: DEFAULT_CONTACT_FILTERS.owner })}
            clearLabel={t("filters.remove", { name: t("filters.owner") })}
            {...panel("owner")}
          >
            <div role="radiogroup" aria-label={t("filters.owner")} className="flex flex-col gap-0.5">
              {[{ id: "all", name: t("filters.all") }, { id: "mine", name: t("filters.mine") }, ...owners].map((o) => (
                <Option
                  key={o.id}
                  selected={filters.owner === o.id}
                  onClick={() => {
                    update({ owner: o.id });
                    setOpenPanel(null);
                  }}
                >
                  {o.name}
                </Option>
              ))}
            </div>
          </FilterChip>
        ) : null}

        {activeContactFilterCount(filters) > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              update({ ...DEFAULT_CONTACT_FILTERS, view: filters.view });
            }}
          >
            {t("filters.clear")}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
