"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { isWorkspacePath } from "@/config/navigation";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { CommandPalette } from "./command-palette";
import { MobileHeader, MoreSheet } from "./mobile-header";
import { MobileNav } from "./mobile-nav";
import { ShellProvider, type ShellData } from "./shell-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type SidebarState = "expanded" | "collapsed";
type Mode = "default" | "workspace";
/** Alapértelmezés: normál képernyőn kinyitva, munkaigényesen összecsukva. A kézi váltást módonként jegyezzük meg. */
const DEFAULTS: Record<Mode, SidebarState> = { default: "expanded", workspace: "collapsed" };
const storageKey = (mode: Mode) => `kulcs.sidebar.${mode}`;

/**
 * Az alkalmazás kerete.
 * - ≥1280px: 232px-es oldalsáv; munkaigényes képernyőn (térkép, kanban, adatlap) 76px-es ikonsáv.
 * - 768–1279px: mindig ikonsáv.
 * - <768px: mobil fejléc + üveghatású alsó navigáció kiemelt mikrofongombbal.
 * Munkaigényes képernyőn nincs felső sáv (látványterv, DECISIONS D-005); a ⌘K mindenhol működik.
 */
export function AppShell({ data, children }: { data: ShellData; children: React.ReactNode }) {
  const pathname = usePathname();
  const workspace = isWorkspacePath(pathname);
  const [state, setState] = useSidebarState(workspace ? "workspace" : "default");

  const collapsedOnDesktop = state === "collapsed";
  const toggle = () => setState(collapsedOnDesktop ? "expanded" : "collapsed");

  return (
    <ShellProvider data={data}>
      <div className="flex min-h-dvh bg-bg">
        {/* Tablet: mindig ikonsáv */}
        <div className="hidden md:flex xl:hidden">
          <Sidebar collapsed showQuickActions={workspace} />
        </div>
        {/* Desktop */}
        <div className="hidden xl:flex">
          <Sidebar collapsed={collapsedOnDesktop} onToggle={toggle} showQuickActions={workspace && collapsedOnDesktop} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {!workspace ? (
            <div className="hidden md:block">
              <Topbar />
            </div>
          ) : null}
          <MobileHeader />
          <main key={pathname} className="flex-1 animate-page-in pb-[120px] md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
      <MoreSheet />
      <CommandPalette />
    </ShellProvider>
  );
}

function useSidebarState(mode: Mode): [SidebarState, (value: SidebarState) => void] {
  const [stored, setStored] = useLocalStorage(storageKey(mode));
  const value: SidebarState = stored === "expanded" || stored === "collapsed" ? stored : DEFAULTS[mode];
  return [value, setStored];
}
