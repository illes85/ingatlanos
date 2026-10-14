"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Command } from "cmdk";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarPlus, Inbox, KanbanSquare, ListTodo, Search, UserPlus } from "lucide-react";
import { ALL_NAV } from "@/config/navigation";
import { Dialog, DialogTitle } from "@/components/ui/overlay";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/feedback";
import { formatMillions } from "@/lib/format";
import { searchEverything, type SearchResult } from "@/app/(app)/search-action";
import { NavIcon } from "./nav-icons";
import { useShell } from "./shell-context";

const ACTIONS = [
  { key: "newProperty", icon: Building2, href: "/ingatlanok/uj" },
  { key: "newContact", icon: UserPlus, href: "/ugyfelek/uj" },
  { key: "newLead", icon: Inbox, href: "/leadek/uj" },
  { key: "newShowing", icon: CalendarPlus, href: "/naptar/uj" },
  { key: "newDeal", icon: KanbanSquare, href: "/ugyletek/uj" },
  { key: "newTask", icon: ListTodo, href: "/feladatok/uj" },
] as const;

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-14 text-ink-2 data-[selected=true]:bg-surface-sunken data-[selected=true]:text-ink";
const groupClass =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-11 [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase";

/** Parancspaletta (⌘K / Ctrl+K): ugrás, műveletek, ingatlan- és ügyfélkeresés. Üveghatású lebegő panel. */
export function CommandPalette() {
  const t = useTranslations();
  const router = useRouter();
  const { paletteOpen, setPaletteOpen } = useShell();
  const [query, setQuery] = React.useState("");
  const debounced = useDebounced(query.trim(), 200);

  const { data: results, isFetching } = useQuery<SearchResult>({
    queryKey: ["palette-search", debounced],
    queryFn: () => searchEverything(debounced),
    enabled: paletteOpen && debounced.length >= 2,
  });

  const close = () => {
    setPaletteOpen(false);
    setQuery("");
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <Dialog open={paletteOpen} onOpenChange={(open) => (open ? setPaletteOpen(true) : close())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="glass fixed top-[12vh] left-1/2 z-50 w-[min(640px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-card-lg !bg-glass-strong !shadow-popover"
        >
          <DialogTitle className="sr-only">{t("shell.searchLabel")}</DialogTitle>
          <Command label={t("shell.searchLabel")} shouldFilter={debounced.length < 2}>
            <div className="flex items-center gap-2.5 border-b border-line px-4">
              <Search size={18} className="text-muted" aria-hidden="true" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={t("palette.placeholder")}
                className="h-14 flex-1 bg-transparent text-15 text-ink outline-none placeholder:text-muted"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-14 text-muted">
                {isFetching ? t("palette.searching") : t("palette.empty")}
              </Command.Empty>

              {results && results.properties.length > 0 ? (
                <Command.Group heading={t("palette.groupProperties")} className={groupClass}>
                  {results.properties.map((p) => (
                    <Command.Item key={p.id} value={`p-${p.id}`} onSelect={() => go(`/ingatlanok/${p.id}`)} className={itemClass}>
                      <Building2 size={18} className="text-muted" />
                      <span className="flex-1 truncate font-semibold text-ink">{p.label}</span>
                      <span className="text-12 text-muted">{p.code}</span>
                      <span className="serif text-14 font-semibold">{formatMillions(p.price, { currency: false })}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {results && results.contacts.length > 0 ? (
                <Command.Group heading={t("palette.groupContacts")} className={groupClass}>
                  {results.contacts.map((c) => (
                    <Command.Item key={c.id} value={`c-${c.id}`} onSelect={() => go(`/ugyfelek/${c.id}`)} className={itemClass}>
                      <Avatar name={c.name} size="sm" />
                      <span className="flex-1 truncate font-semibold text-ink">{c.name}</span>
                      <span className="text-12 text-muted">{c.detail}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {results && results.leads.length > 0 ? (
                <Command.Group heading={t("palette.groupLeads")} className={groupClass}>
                  {results.leads.map((l) => (
                    <Command.Item key={l.id} value={`l-${l.id}`} onSelect={() => go("/leadek")} className={itemClass}>
                      <Inbox size={18} className="text-muted" />
                      <span className="flex-1 truncate font-semibold text-ink">{l.name}</span>
                      <span className="text-12 text-muted">{l.detail}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              <Command.Group heading={t("palette.groupActions")} className={groupClass}>
                {ACTIONS.map(({ key, icon: Icon, href }) => (
                  <Command.Item
                    key={key}
                    value={t(`shell.${key}`)}
                    onSelect={() => go(href)}
                    className={itemClass}
                  >
                    <Icon size={18} className="text-primary" />
                    {t(`shell.${key}`)}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading={t("palette.groupNavigation")} className={groupClass}>
                {ALL_NAV.map((item) => (
                  <Command.Item key={item.key} value={t(`nav.${item.key}`)} onSelect={() => go(item.href)} className={itemClass}>
                    <NavIcon name={item.key} />
                    {t(`nav.${item.key}`)}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <div className="border-t border-line px-4 py-2.5 text-12 text-muted">{t("palette.hint")}</div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}
