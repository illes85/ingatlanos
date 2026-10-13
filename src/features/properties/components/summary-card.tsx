import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { AiSpark } from "@/components/ai/ai";
import { formatArea, formatHuf, formatMillions, formatRooms, formatShortDateWithYear, formatInteger } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PropertyDetail } from "../detail-types";
import { lookupLabel } from "../lookup-label";

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-tile bg-surface-sunken px-3.5 py-3">
      <span className="text-12 text-muted">{label}</span>
      <span className="text-15 font-bold">{value}</span>
    </div>
  );
}

/** Ragadós összegzőkártya: ár, főbb adatok, megbízás-sáv, felelős ügynök és fő akciók. */
export async function SummaryCard({ detail, className }: { detail: PropertyDetail; className?: string }) {
  const t = await getTranslations("properties.detail.summary");
  const lookups = await lookupLabel();
  const { property: p, commission } = detail;
  const price = Number(p.price);
  const perSqm = p.price_per_sqm === null ? null : Number(p.price_per_sqm);

  const specs: { label: string; value: string | null }[] = [
    { label: t("area"), value: p.area_sqm ? formatArea(Number(p.area_sqm)) : null },
    { label: t("rooms"), value: p.rooms !== null ? formatRooms(p.rooms, p.half_rooms) : null },
    { label: t("lot"), value: p.lot_sqm ? formatArea(Number(p.lot_sqm)) : null },
    { label: t("built"), value: p.year_built ? String(p.year_built) : null },
    { label: t("energy"), value: p.energy_rating },
    { label: t("heating"), value: p.heating ? lookups("heating", p.heating) : null },
  ];

  const mandateProgress =
    detail.mandateDaysLeft !== null && detail.mandateTotalDays
      ? 100 - (Math.max(0, detail.mandateDaysLeft) / detail.mandateTotalDays) * 100
      : 0;

  return (
    <Card variant="raised" className={cn("flex flex-col gap-5 p-6", className)}>
      <div className="flex flex-col gap-1">
        <span className="serif text-38 leading-none font-medium">{formatMillions(price)}</span>
        <span className="text-14 text-muted">
          {[
            perSqm ? t("perSqm", { value: formatInteger(perSqm) }) : null,
            detail.marketAvgPricePerSqm ? t("marketAvg", { value: formatInteger(detail.marketAvgPricePerSqm) }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2.5">
        {specs
          .filter((s): s is { label: string; value: string } => s.value !== null)
          .map((s) => (
            <Spec key={s.label} label={s.label} value={s.value} />
          ))}
      </dl>

      {p.mandate_expires_at ? (
        <div className="flex flex-col gap-2 rounded-tile border border-accent-border bg-accent-tint px-4 py-3.5">
          <div className="flex items-center justify-between gap-3 text-14">
            <span className="font-semibold">{t("mandateUntil", { date: formatShortDateWithYear(p.mandate_expires_at) })}</span>
            <span className="font-bold text-accent-text">
              {detail.mandateDaysLeft !== null && detail.mandateDaysLeft < 0 ? t("mandateExpired") : t("mandateDays", { count: detail.mandateDaysLeft ?? 0 })}
            </span>
          </div>
          <ProgressBar value={mandateProgress} fill="accent" track="accent" className="h-1" />
          {commission?.expectedAmount ? (
            <span className="text-12 text-muted">
              {commission.fixed !== null
                ? t("commissionFixed", { amount: formatHuf(commission.expectedAmount) })
                : t("commissionPct", { pct: String(commission.pct).replace(".", ","), amount: formatHuf(commission.expectedAmount) })}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {detail.responsible ? (
          <div className="flex items-center gap-3">
            <Avatar name={detail.responsible.name} tone="accent" size="xl" />
            <div className="flex flex-col">
              <span className="text-14 font-bold">{detail.responsible.name}</span>
              <span className="text-12 text-muted">{t("agent")}</span>
            </div>
          </div>
        ) : (
          <span />
        )}
        {detail.sellerName ? <span className="text-right text-13 text-muted">{t("owner", { name: detail.sellerName })}</span> : null}
      </div>

      <div className="flex flex-col gap-2.5">
        <Button asChild size="lg">
          <Link href={`/naptar?ingatlan=${p.id}`}>{t("scheduleShowing")}</Link>
        </Button>
        <Button asChild variant="ai-soft" size="lg">
          <Link href="/ertekbecsles">
            <AiSpark size={16} />
            {t("valuation")}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
