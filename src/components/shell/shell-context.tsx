"use client";

import * as React from "react";
import type { MemberRole, PlanTier } from "@/lib/auth/session";

export interface ShellData {
  user: { name: string; email: string | null; role: MemberRole };
  organization: { name: string; type: "individual" | "office"; isDemo: boolean };
  plan: {
    tier: PlanTier;
    isTrial: boolean;
    trialDaysLeft: number;
    creditBalance: number;
    creditTotal: number;
  };
  counts: { newLeads: number; unreadNotifications: number };
}

interface ShellContextValue {
  data: ShellData;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
}

const ShellContext = React.createContext<ShellContextValue | null>(null);

export function ShellProvider({ data, children }: { data: ShellData; children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);

  // ⌘K / Ctrl+K globálisan
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = React.useMemo(
    () => ({ data, paletteOpen, setPaletteOpen, moreOpen, setMoreOpen }),
    [data, paletteOpen, moreOpen],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = React.useContext(ShellContext);
  if (!ctx) throw new Error("useShell() csak ShellProvider-en belül használható.");
  return ctx;
}

/** Mac-en ⌘K, máshol Ctrl K. */
export function useShortcutLabel() {
  return React.useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    () => "⌘K",
  );
}
