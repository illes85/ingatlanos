"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, Building2, CalendarPlus, Inbox, KanbanSquare, ListTodo, Plus, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/feedback";
import { AiSpark } from "@/components/ai/ai";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
} from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { useShell, useShortcutLabel } from "./shell-context";

/** Felső sáv: globális kereső (⌘K), Asszisztens, értesítések, „+ Új”. */
export function Topbar() {
  const t = useTranslations("shell");
  const { setPaletteOpen } = useShell();
  const shortcut = useShortcutLabel();

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-bg/85 px-8 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label={t("searchLabel")}
        className="flex h-11 max-w-[560px] flex-[1_1_300px] items-center gap-2.5 rounded-tile border border-line bg-surface px-3.5 text-left text-muted transition-colors hover:border-line-dashed"
      >
        <Search size={18} strokeWidth={1.8} aria-hidden="true" />
        <span className="flex-1 truncate text-14">{t("searchPlaceholder")}</span>
        <Kbd>{shortcut}</Kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <AssistantButton />
        <NotificationsButton />
        <NewMenu />
      </div>
    </header>
  );
}

export function AssistantButton({ className }: { className?: string }) {
  const t = useTranslations();
  return (
    <Button
      variant="ai-soft"
      shape="soft"
      className={cn("px-4", className)}
      onClick={() => toast(t("shell.assistant"), { description: t("common.featureSoon") })}
    >
      <AiSpark size={16} filled={false} />
      {t("shell.assistant")}
    </Button>
  );
}

export function NotificationsButton() {
  const t = useTranslations();
  const { counts } = useShell().data;
  return (
    <Tooltip content={t("shell.notifications")} side="bottom">
      <Button
        variant="secondary"
        size="icon"
        aria-label={t("shell.notifications")}
        className="relative text-ink-2"
        onClick={() => toast(t("shell.notifications"), { description: t("common.featureSoon") })}
      >
        <Bell size={18} strokeWidth={1.8} />
        {counts.unreadNotifications > 0 ? (
          <span className="absolute top-2.5 right-[11px] size-2 rounded-full border-2 border-surface bg-danger box-content" />
        ) : null}
      </Button>
    </Tooltip>
  );
}

const NEW_ACTIONS = [
  { key: "newProperty", icon: Building2 },
  { key: "newContact", icon: UserPlus },
  { key: "newLead", icon: Inbox },
  { key: "newShowing", icon: CalendarPlus },
  { key: "newDeal", icon: KanbanSquare },
  { key: "newTask", icon: ListTodo },
] as const;

export function NewMenu({ iconOnly = false }: { iconOnly?: boolean }) {
  const t = useTranslations();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={iconOnly ? "icon-lg" : "md"} shape="soft" aria-label={t("shell.new")} className={iconOnly ? "" : "font-semibold"}>
          <Plus size={16} strokeWidth={2.2} />
          {iconOnly ? null : t("shell.new")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={iconOnly ? "right" : "bottom"}>
        {NEW_ACTIONS.map(({ key, icon: Icon }) => (
          <DropdownMenuItem key={key} onSelect={() => toast(t(`shell.${key}`), { description: t("common.featureSoon") })}>
            <Icon />
            {t(`shell.${key}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
