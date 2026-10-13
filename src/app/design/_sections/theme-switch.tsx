"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { SegmentedControl } from "@/components/ui/segmented";
import { useIsClient } from "@/lib/hooks/use-local-storage";

type ThemeValue = "light" | "dark" | "system";

export function ThemeSwitch() {
  const t = useTranslations("shell");
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  return (
    <SegmentedControl<ThemeValue>
      label={t("theme")}
      value={mounted ? ((theme as ThemeValue) ?? "system") : "system"}
      onValueChange={setTheme}
      options={[
        { value: "light", label: t("themeLight") },
        { value: "dark", label: t("themeDark") },
        { value: "system", label: t("themeSystem") },
      ]}
    />
  );
}
