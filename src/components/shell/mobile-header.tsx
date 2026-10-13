"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { LogOut, Monitor, Moon, Palette, Search, Sun } from "lucide-react";
import { ALL_NAV, MAIN_NAV, PREMIUM_NAV, isActivePath } from "@/config/navigation";
import { formatWeekdayMonthDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { CountBadge } from "@/components/ui/badge";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/overlay";
import { signOut } from "@/app/(auth)/actions";
import { NavIcon } from "./nav-icons";
import { PlanCard } from "./plan-card";
import { useShell } from "./shell-context";

/** Mobil fejléc: dátum + oldalcím, kereső és avatar (a „Több” menü innen nyílik). */
export function MobileHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const { data, setPaletteOpen, setMoreOpen } = useShell();
  const current = ALL_NAV.find((item) => isActivePath(pathname, item.href));
  const isToday = pathname === "/ma";

  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-6 pb-2 md:hidden">
      <div className="flex min-w-0 flex-col gap-0.5">
        {isToday ? <span className="text-13 text-muted">{formatWeekdayMonthDay(new Date())}</span> : null}
        <h1 className="serif truncate text-32 font-medium">{current ? t(`nav.${current.key}`) : t("common.appName")}</h1>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          aria-label={t("shell.searchLabel")}
          onClick={() => setPaletteOpen(true)}
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink-2"
        >
          <Search size={18} strokeWidth={1.8} />
        </button>
        <button type="button" aria-label={t("common.more")} onClick={() => setMoreOpen(true)} className="rounded-full">
          <Avatar name={data.user.name} tone="accent" size="xl" />
        </button>
      </div>
    </header>
  );
}

/** „Több” menü mobilon: teljes navigáció, csomag, téma, kilépés. */
export function MoreSheet() {
  const t = useTranslations();
  const pathname = usePathname();
  const { data, moreOpen, setMoreOpen } = useShell();
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", label: t("shell.themeLight"), icon: Sun },
    { value: "dark", label: t("shell.themeDark"), icon: Moon },
    { value: "system", label: t("shell.themeSystem"), icon: Monitor },
  ];

  return (
    <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
      <SheetContent side="bottom" closeLabel={t("common.close")} className="overflow-y-auto p-5" aria-describedby={undefined}>
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={data.user.name} tone="accent" size="xl" />
          <div className="flex flex-col">
            <DialogTitle className="text-15 font-bold">{data.user.name}</DialogTitle>
            <span className="text-13 text-muted">
              {data.organization.name} · {t(`shell.roles.${data.user.role}`)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[...MAIN_NAV, ...PREMIUM_NAV].map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-control p-3 text-14",
                isActivePath(pathname, item.href) ? "bg-primary-soft font-semibold text-primary" : "font-medium text-ink-2",
              )}
            >
              <NavIcon name={item.key} />
              {t(`nav.${item.key}`)}
              {item.key === "leads" ? <CountBadge count={data.counts.newLeads} className="ml-auto" /> : null}
            </Link>
          ))}
        </div>
        <div className="my-4">
          <PlanCard />
        </div>
        <div className="flex gap-1 rounded-tile bg-surface-muted p-1" role="radiogroup" aria-label={t("shell.theme")}>
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-2 rounded-seg text-13 font-semibold",
                theme === value ? "bg-surface text-ink shadow-chip" : "text-muted",
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col">
          <Link href="/design" onClick={() => setMoreOpen(false)} className="flex items-center gap-2.5 rounded-control p-3 text-14 font-medium text-ink-2">
            <Palette size={18} className="text-muted" />
            {t("nav.design")}
          </Link>
          <button type="button" onClick={() => void signOut()} className="flex items-center gap-2.5 rounded-control p-3 text-left text-14 font-medium text-danger-text">
            <LogOut size={18} />
            {t("shell.signOut")}
          </button>
        </div>
      </SheetContent>
    </Dialog>
  );
}
