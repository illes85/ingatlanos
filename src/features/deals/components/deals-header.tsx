"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented";
import { formatMillions } from "@/lib/format";
import type { DealSide } from "@/config/pipeline";

interface DealsHeaderProps {
  side: DealSide;
  openCount: number;
  weightedValue: number;
  canCreate: boolean;
}

/** Ügyletek fejléce: oldalváltó (eladói/vevői), összesítők és az új ügylet gomb. Az oldal az URL-ben él. */
export function DealsHeader({ side, openCount, weightedValue, canCreate }: DealsHeaderProps) {
  const t = useTranslations("deals");
  const router = useRouter();
  const pathname = usePathname();
  const key = side === "seller" ? "elado" : "vevo";

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <h1 className="serif text-34 leading-tight font-medium">{t("title")}</h1>
        <SegmentedControl
          label={t("sideLabel")}
          value={side}
          onValueChange={(next) => router.replace(next === "seller" ? pathname : `${pathname}?oldal=vevo`, { scroll: false })}
          options={[
            { value: "seller", label: t("sides.seller") },
            { value: "buyer", label: t("sides.buyer") },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <dl className="flex gap-8">
          <div className="flex flex-col">
            <dt className="text-13 text-muted">{t("stats.open")}</dt>
            <dd className="serif text-26 font-medium" data-testid="open-count">
              {openCount}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-13 text-muted">{t("stats.weighted")}</dt>
            <dd className="serif text-26 font-medium">{formatMillions(weightedValue)}</dd>
          </div>
        </dl>
        {canCreate ? (
          <Button asChild>
            <Link href={`/ugyletek/uj?oldal=${key}`}>
              <Plus size={18} aria-hidden="true" />
              {t("newDeal")}
            </Link>
          </Button>
        ) : null}
      </div>
    </header>
  );
}
