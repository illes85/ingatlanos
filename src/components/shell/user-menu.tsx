"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { LogOut, Monitor, Moon, Palette, Sun } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlay";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

/** Felhasználói blokk (avatar + név + szervezet) legördülő menüvel: téma, design oldal, kilépés. */
export function UserMenu({ compact = false, side = "top" }: { compact?: boolean; side?: "top" | "right" | "bottom" }) {
  const t = useTranslations();
  const { user, organization } = useShell().data;
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2.5 rounded-tile text-left transition-colors hover:bg-surface-sunken",
          compact ? "justify-center p-1" : "w-full px-1.5 py-1",
        )}
        aria-label={user.name}
      >
        <Avatar name={user.name} tone="accent" size="md" />
        {!compact ? (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-13 font-semibold">{user.name}</span>
            <span className="truncate text-12 text-muted">{organization.name}</span>
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="start" className="w-60">
        <DropdownMenuLabel>{t(`shell.roles.${user.role}`)}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("shell.theme")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <span className="flex items-center gap-2.5"><Sun />{t("shell.themeLight")}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <span className="flex items-center gap-2.5"><Moon />{t("shell.themeDark")}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <span className="flex items-center gap-2.5"><Monitor />{t("shell.themeSystem")}</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/design">
            <Palette />
            {t("nav.design")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut />
          {t("shell.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
