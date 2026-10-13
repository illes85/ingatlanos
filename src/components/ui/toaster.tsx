"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

/**
 * Toast értesítések. Törlésnél a hívó `toast("…", { action: { label: t("common.undo"), onClick } })`
 * formában ad „Visszavonás” lehetőséget.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      offset={{ bottom: 24, right: 24 }}
      mobileOffset={{ bottom: 104 }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-panel !border !border-line-card !bg-surface !text-ink !shadow-popover !font-sans !text-14",
          description: "!text-muted",
          actionButton: "!bg-primary !text-on-primary !font-bold !rounded-control",
        },
      }}
    />
  );
}
