"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, CalendarPlus, Inbox } from "lucide-react";
import { MOBILE_NAV_LEFT, MOBILE_NAV_RIGHT, isActivePath, navItem, type NavKey } from "@/config/navigation";
import { CountBadge } from "@/components/ui/badge";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { MicIcon, NavIcon } from "./nav-icons";
import { useShell } from "./shell-context";

const HOLD_MS = 350;

/**
 * Mobil (PWA) alsó navigáció üveghatással: Ma · Ingatlanok · [mikrofon] · Lead · Naptár.
 * A mikrofon nyomva tartva hangjegyzetet rögzít, rövid koppintásra gyorsmenüt nyit.
 */
export function MobileNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const { counts } = useShell().data;
  const [quickOpen, setQuickOpen] = React.useState(false);

  const showHint = pathname === "/ma";

  return (
    <>
      {showHint ? <MicHint label={t("shell.micHint")} /> : null}
      <nav
        aria-label={t("nav.mobileLabel")}
        className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(88px+env(safe-area-inset-bottom)/2)] items-end justify-around border-t border-line-card bg-glass-strong px-2.5 pt-2 pb-[max(20px,env(safe-area-inset-bottom))] backdrop-blur-[16px] md:hidden"
      >
        {MOBILE_NAV_LEFT.map((key) => (
          <MobileLink key={key} navKey={key} label={t(`nav.${key}`)} active={isActivePath(pathname, navItem(key).href)} />
        ))}
        <MicFab onTap={() => setQuickOpen(true)} />
        {MOBILE_NAV_RIGHT.map((key) => (
          <MobileLink
            key={key}
            navKey={key}
            label={key === "leads" ? t("nav.leadShort") : t(`nav.${key}`)}
            active={isActivePath(pathname, navItem(key).href)}
            badge={key === "leads" ? counts.newLeads : 0}
          />
        ))}
      </nav>
      <QuickActions open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}

function MobileLink({ navKey, label, active, badge = 0 }: { navKey: NavKey; label: string; active: boolean; badge?: number }) {
  return (
    <Link
      href={navItem(navKey).href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex w-[60px] flex-col items-center gap-1 text-11",
        active ? "font-bold text-primary" : "font-semibold text-muted",
      )}
    >
      <NavIcon name={navKey} size={22} />
      {label}
      {badge > 0 ? <CountBadge count={badge} className="absolute -top-1 right-3 min-w-[18px] px-1 py-[3px] text-11" /> : null}
    </Link>
  );
}

function MicFab({ onTap }: { onTap: () => void }) {
  const t = useTranslations("shell");
  const [recording, setRecording] = React.useState(false);
  const timer = React.useRef<number | null>(null);
  const held = React.useRef(false);

  const start = () => {
    held.current = false;
    timer.current = window.setTimeout(() => {
      held.current = true;
      setRecording(true);
      navigator.vibrate?.(15);
    }, HOLD_MS);
  };

  const end = () => {
    if (timer.current) window.clearTimeout(timer.current);
    if (held.current) {
      setRecording(false);
      // TODO(3. fázis): MediaRecorder → átírás → CRM. Addig csak a felület működik.
      toast(t("micLabel"), { description: t("micSoon") });
    } else {
      onTap();
    }
    held.current = false;
  };

  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    held.current = false;
    setRecording(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label={t("micLabel")}
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={cancel}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "mb-1.5 flex size-16 touch-none items-center justify-center rounded-full border-4 border-bg bg-primary text-on-primary shadow-fab select-none",
          "transition-transform duration-200 ease-out active:scale-95",
          recording && "scale-110 animate-pulse",
        )}
      >
        <MicIcon size={26} />
      </button>
      {recording ? (
        <div role="status" className="fixed inset-x-0 bottom-28 z-50 flex justify-center md:hidden">
          <span className="rounded-full bg-danger px-3.5 py-2 text-12 font-semibold text-white shadow-popover">
            ● {t("micRecording")}
          </span>
        </div>
      ) : null}
    </>
  );
}

const HINT_KEY = "kulcs.micHintSeen";
let hintSeenAtLoad: number | undefined;

/** Az első pillanatkép rögzítése: ennyiszer látta korábban a tippet (legfeljebb 3-szor mutatjuk). */
function readHintSeen() {
  if (hintSeenAtLoad === undefined) {
    try {
      hintSeenAtLoad = Number(window.localStorage.getItem(HINT_KEY) ?? "0");
    } catch {
      hintSeenAtLoad = 0;
    }
  }
  return hintSeenAtLoad;
}

function MicHint({ label }: { label: string }) {
  const seen = React.useSyncExternalStore(() => () => {}, readHintSeen, () => 99);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (seen >= 3) return;
    try {
      window.localStorage.setItem(HINT_KEY, String(seen + 1));
    } catch {
      // nem kritikus
    }
  }, [seen]);

  if (dismissed || seen >= 3) return null;
  return (
    <button
      type="button"
      onClick={() => setDismissed(true)}
      className="fixed bottom-28 left-1/2 z-40 -translate-x-1/2 rounded-full bg-inverse px-3.5 py-2 text-12 font-semibold whitespace-nowrap text-inverse-text shadow-popover md:hidden"
    >
      {label}
    </button>
  );
}

const QUICK = [
  { key: "newLead", icon: Inbox },
  { key: "newShowing", icon: CalendarPlus },
  { key: "newProperty", icon: Building2 },
] as const;

function QuickActions({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" closeLabel={t("common.close")} className="gap-2 p-5" aria-describedby={undefined}>
        <DialogTitle className="serif mb-2 text-22 font-medium">{t("shell.quickActions")}</DialogTitle>
        {QUICK.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              onOpenChange(false);
              toast(t(`shell.${key}`), { description: t("common.featureSoon") });
            }}
            className="flex h-14 items-center gap-3 rounded-tile border border-line-card bg-surface px-4 text-15 font-semibold"
          >
            <span className="flex size-9 items-center justify-center rounded-control bg-primary-soft text-primary">
              <Icon size={18} />
            </span>
            {t(`shell.${key}`)}
          </button>
        ))}
      </SheetContent>
    </Dialog>
  );
}
