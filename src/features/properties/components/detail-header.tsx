import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiSpark } from "@/components/ai/ai";
import { formatPostalAddress } from "@/lib/format";
import type { PropertyDetail } from "../detail-types";

const STATUS_TONE: Record<PropertyDetail["property"]["status"], BadgeProps["tone"]> = {
  draft: "neutral",
  active: "solid",
  under_offer: "accent",
  reserved: "accent",
  sold: "sunken",
  rented: "sunken",
  withdrawn: "sunken",
  expired: "danger",
};

/** Adatlap fejléc: morzsamenü, állapot-chipek, Fraunces cím, cím + piacon töltött idő és a fő műveletek. */
export async function DetailHeader({ detail, shareSlot }: { detail: PropertyDetail; shareSlot?: React.ReactNode }) {
  const t = await getTranslations("properties.detail");
  const tEnums = await getTranslations("enums");
  const tProps = await getTranslations("properties");
  const { property: p } = detail;
  const shortAddress = [p.city, p.street].filter(Boolean).join(", ");

  return (
    <header className="flex flex-col gap-3">
      <nav aria-label={t("breadcrumb")} className="text-14 text-muted">
        <Link href="/ingatlanok" className="hover:text-ink">
          {t("breadcrumb")}
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-2" aria-current="page">
          {shortAddress}
        </span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[p.status]} size="md">
          {tEnums(`propertyStatus.${p.status}`)}
        </Badge>
        {p.mandate_type ? (
          <Badge tone="accent" size="md">
            {t(`mandateBadge.${p.mandate_type}`)}
          </Badge>
        ) : null}
        <Badge tone="neutral" size="md">
          {tProps(`transactionBadge.${p.transaction_type}`)} · {p.code}
        </Badge>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="serif text-34 leading-tight font-medium md:text-[40px]">{p.title}</h1>
          <p className="text-15 text-muted">
            {formatPostalAddress(p)}
            {detail.daysOnMarket !== null ? ` · ${t("daysOnMarket", { count: detail.daysOnMarket })}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {shareSlot}
          <Button variant="ai-soft" asChild>
            <Link href={`/ingatlanok/${p.id}?ful=attekintes#hirdetesszoveg`}>
              <AiSpark size={16} />
              {t("actions.listingText")}
            </Link>
          </Button>
          <Button variant="inverse" asChild>
            <Link href={`/ingatlanok/${p.id}/szerkesztes`}>
              <Pencil size={16} aria-hidden="true" />
              {t("actions.edit")}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
