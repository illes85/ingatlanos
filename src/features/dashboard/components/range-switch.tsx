"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SegmentedControl } from "@/components/ui/segmented";

type Range = "today" | "week" | "month";

/** Ma · Hét · Hónap váltó. A heti/havi nézet az 1. fázisban kap adatot. */
export function RangeSwitch() {
  const t = useTranslations();
  const [value, setValue] = React.useState<Range>("today");

  return (
    <SegmentedControl<Range>
      label={t("dashboard.range.label")}
      value={value}
      onValueChange={(next) => {
        if (next !== "today") {
          toast(t(`dashboard.range.${next}`), { description: t("common.featureSoon") });
          return;
        }
        setValue(next);
      }}
      options={[
        { value: "today", label: t("dashboard.range.today") },
        { value: "week", label: t("dashboard.range.week") },
        { value: "month", label: t("dashboard.range.month") },
      ]}
    />
  );
}
