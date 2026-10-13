"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { MAIN_NAV, PREMIUM_NAV, isActivePath, type NavItem } from "@/config/navigation";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/overlay";
import { BrandMark, NavIcon } from "./nav-icons";
import { PlanCard } from "./plan-card";
import { UserMenu } from "./user-menu";
import { NotificationsButton, NewMenu } from "./topbar";
import { useShell } from "./shell-context";

interface SidebarProps {
  collapsed: boolean;
  /** Hiányában (tablet) nincs kinyitás/összecsukás gomb. */
  onToggle?: () => void;
  /** Munkaigényes képernyőn (nincs felső sáv) az ikonsáv aljára kerül az „Új” és az értesítés. */
  showQuickActions: boolean;
}

/** Desktop/tablet oldalsáv: 232px felirattal, vagy 76px-es ikonsáv. */
export function Sidebar({ collapsed, onToggle, showQuickActions }: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { counts } = useShell().data;

  const badgeFor = (item: NavItem) => (item.key === "leads" ? counts.newLeads : 0);

  if (collapsed) {
    return (
      <nav
        aria-label={t("mainLabel")}
        className="sticky top-0 flex h-dvh w-[76px] shrink-0 flex-col items-center gap-1.5 border-r border-line bg-surface-nav px-3 py-5"
      >
        <Link href="/ma" aria-label={brand.name} className="mb-[18px]">
          <BrandMark size={40} />
        </Link>
        {MAIN_NAV.map((item) => (
          <RailLink key={item.key} item={item} label={t(item.key)} active={isActivePath(pathname, item.href)} badge={badgeFor(item)} />
        ))}
        <div className="my-2 h-px w-8 bg-line" />
        {PREMIUM_NAV.map((item) => (
          <RailLink key={item.key} item={item} label={t(item.key)} active={isActivePath(pathname, item.href)} />
        ))}
        <div className="mt-auto flex flex-col items-center gap-2">
          {showQuickActions ? (
            <>
              <NewMenu iconOnly />
              <NotificationsButton />
            </>
          ) : null}
          {onToggle ? (
          <Tooltip content={t("expand")}>
            <button
              type="button"
              onClick={onToggle}
              aria-label={t("expand")}
              className="flex size-10 items-center justify-center rounded-tile text-muted hover:bg-surface-sunken hover:text-ink"
            >
              <PanelLeftOpen size={18} />
            </button>
          </Tooltip>
          ) : null}
          <UserMenu compact side="right" />
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label={t("mainLabel")}
      className="sticky top-0 flex h-dvh w-[232px] shrink-0 flex-col gap-[22px] overflow-y-auto border-r border-line bg-surface-nav px-3.5 py-5"
    >
      <div className="flex items-center gap-2.5 px-2.5 py-1">
        <Link href="/ma" className="flex items-center gap-2.5 hover:text-ink">
          <BrandMark size={34} />
          <span className="serif text-24 font-semibold">{brand.name}</span>
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label={t("collapse")}
          className="ml-auto flex size-8 items-center justify-center rounded-control text-muted opacity-60 hover:bg-surface-sunken hover:text-ink hover:opacity-100"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        {MAIN_NAV.map((item) => (
          <SideLink key={item.key} item={item} label={t(item.key)} active={isActivePath(pathname, item.href)} badge={badgeFor(item)} />
        ))}
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="px-3 pb-1.5 text-11 font-bold tracking-[0.08em] text-muted">{t("premium")}</div>
        {PREMIUM_NAV.map((item) => (
          <SideLink key={item.key} item={item} label={t(item.key)} active={isActivePath(pathname, item.href)} />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-3.5">
        <PlanCard />
        <UserMenu />
      </div>
    </nav>
  );
}

function SideLink({ item, label, active, badge = 0 }: { item: NavItem; label: string; active: boolean; badge?: number }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-control p-3 text-14 transition-colors duration-150",
        active ? "bg-primary-soft font-semibold text-primary" : "font-medium text-ink-2 hover:bg-surface-sunken hover:text-ink",
      )}
    >
      <NavIcon name={item.key} />
      {label}
      {badge > 0 ? <CountBadge count={badge} className="ml-auto" /> : null}
    </Link>
  );
}

function RailLink({ item, label, active, badge = 0 }: { item: NavItem; label: string; active: boolean; badge?: number }) {
  return (
    <Tooltip content={label}>
      <Link
        href={item.href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex size-12 shrink-0 items-center justify-center rounded-tile transition-colors duration-150",
          active ? "bg-primary-soft text-primary" : "text-ink-2 hover:bg-surface-sunken hover:text-ink",
        )}
      >
        <NavIcon name={item.key} size={20} />
        {badge > 0 ? <CountBadge count={badge} className="absolute -top-0.5 -right-0.5 min-w-[18px] px-1 text-11" /> : null}
      </Link>
    </Tooltip>
  );
}

