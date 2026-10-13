"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FILTERS,
  PROPERTY_TYPES,
  PROPERTY_VIEWS,
  STATUS_GROUPS,
  activeFilterCount,
  propertyFiltersToParams,
  type PropertyFilters,
} from "../filters";
import { FilterChip, ToggleChip } from "./filter-chip";

type PanelKey = "status" | "type" | "price" | "rooms";
const ROOM_OPTIONS = [1, 2, 3, 4, 5];
const SEARCH_DEBOUNCE_MS = 350;

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
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

/** Ingatlanlista fejléc: cím, szűrő-chipek, keresés és nézetváltó. Az állapot az URL-ben él (megosztható, visszaléphető). */
export function PropertiesToolbar({ filters, total }: { filters: PropertyFilters; total: number }) {
  const t = useTranslations("properties");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [priceDraft, setPriceDraft] = useState({ min: "", max: "" });
  const [query, setQuery] = useState(filters.q);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const update = (patch: Partial<PropertyFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const qs = propertyFiltersToParams(next).toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const onSearch = (value: string) => {
    setQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  };

  const openPrice = (open: boolean) => {
    if (open) setPriceDraft({ min: filters.priceMinM?.toString() ?? "", max: filters.priceMaxM?.toString() ?? "" });
    setOpenPanel(open ? "price" : null);
  };
  const applyPrice = () => {
    const toNumber = (v: string) => (v.trim() === "" || Number.isNaN(Number(v.replace(",", "."))) ? null : Math.max(0, Number(v.replace(",", "."))));
    update({ priceMinM: toNumber(priceDraft.min), priceMaxM: toNumber(priceDraft.max) });
    setOpenPanel(null);
  };

  const panel = (key: PanelKey) => ({ open: openPanel === key, onOpenChange: (open: boolean) => setOpenPanel(open ? key : null) });

  const typeValue = filters.types.length
    ? filters.types.length === 1
      ? tEnums(`propertyType.${filters.types[0]!}`)
      : t("filters.typeCount", { count: filters.types.length })
    : null;
  const { priceMinM: min, priceMaxM: max } = filters;
  const priceValue =
    min !== null && max !== null
      ? t("filters.priceRange", { min, max })
      : min !== null
        ? t("filters.priceFrom", { min })
        : max !== null
          ? t("filters.priceTo", { max })
          : null;

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
            options={PROPERTY_VIEWS.map((view) => ({ value: view, label: t(`views.${view}`) }))}
          />
          <Button asChild>
            <Link href="/ingatlanok/uj">
              <Plus size={18} aria-hidden="true" />
              {t("newProperty")}
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
          wrapperClassName="w-full sm:w-[280px]"
        />
        <ToggleChip pressed={filters.transaction === "sale"} onPressedChange={(on) => update({ transaction: on ? "sale" : null })}>
          {t("filters.sale")}
        </ToggleChip>
        <ToggleChip pressed={filters.transaction === "rent"} onPressedChange={(on) => update({ transaction: on ? "rent" : null })}>
          {t("filters.rent")}
        </ToggleChip>

        <FilterChip
          label={`+ ${t("filters.status")}`}
          value={filters.statusGroup !== DEFAULT_FILTERS.statusGroup ? t(`filters.statusGroups.${filters.statusGroup}`) : null}
          onClear={() => update({ statusGroup: DEFAULT_FILTERS.statusGroup })}
          clearLabel={t("filters.remove", { name: t("filters.status") })}
          {...panel("status")}
        >
          <div role="radiogroup" aria-label={t("filters.status")} className="flex flex-col gap-0.5">
            {STATUS_GROUPS.map((group) => (
              <OptionButton
                key={group}
                selected={filters.statusGroup === group}
                onClick={() => {
                  update({ statusGroup: group });
                  setOpenPanel(null);
                }}
              >
                {t(`filters.statusGroups.${group}`)}
              </OptionButton>
            ))}
          </div>
        </FilterChip>

        <FilterChip
          label={`+ ${t("filters.type")}`}
          value={typeValue}
          onClear={() => update({ types: [] })}
          clearLabel={t("filters.remove", { name: t("filters.type") })}
          {...panel("type")}
        >
          <fieldset className="flex flex-col gap-0.5">
            <legend className="sr-only">{t("filters.type")}</legend>
            {PROPERTY_TYPES.map((type) => {
              const checked = filters.types.includes(type);
              return (
                <label key={type} className="flex h-10 cursor-pointer items-center gap-3 rounded-control px-3 text-14 text-ink-2 hover:bg-surface-sunken hover:text-ink">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => update({ types: checked ? filters.types.filter((x) => x !== type) : [...filters.types, type] })}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {tEnums(`propertyType.${type}`)}
                </label>
              );
            })}
          </fieldset>
        </FilterChip>

        <FilterChip
          label={`+ ${t("filters.price")}`}
          value={priceValue}
          onClear={() => update({ priceMinM: null, priceMaxM: null })}
          clearLabel={t("filters.remove", { name: t("filters.price") })}
          open={openPanel === "price"}
          onOpenChange={openPrice}
        >
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              applyPrice();
            }}
          >
            <label className="flex flex-col gap-1.5 text-13 font-semibold">
              {t("filters.priceMin")}
              <Input inputMode="decimal" value={priceDraft.min} onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1.5 text-13 font-semibold">
              {t("filters.priceMax")}
              <Input inputMode="decimal" value={priceDraft.max} onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value }))} />
            </label>
            <Button type="submit" size="sm">
              {t("filters.apply")}
            </Button>
          </form>
        </FilterChip>

        <FilterChip
          label={`+ ${t("filters.rooms")}`}
          value={filters.roomsMin !== null ? t("filters.roomsMin", { count: filters.roomsMin }) : null}
          onClear={() => update({ roomsMin: null })}
          clearLabel={t("filters.remove", { name: t("filters.rooms") })}
          {...panel("rooms")}
        >
          <div role="radiogroup" aria-label={t("filters.rooms")} className="flex flex-col gap-0.5">
            {ROOM_OPTIONS.map((count) => (
              <OptionButton
                key={count}
                selected={filters.roomsMin === count}
                onClick={() => {
                  update({ roomsMin: count });
                  setOpenPanel(null);
                }}
              >
                {t("filters.roomsMin", { count })}
              </OptionButton>
            ))}
          </div>
        </FilterChip>

        {activeFilterCount(filters) > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              update({ ...DEFAULT_FILTERS, view: filters.view });
            }}
          >
            {t("filters.clear")}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
