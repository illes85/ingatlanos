import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader } from "@/components/ui/card";
import { StatBarRow } from "@/components/ui/progress";
import { formatMillions } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AlertItem, StageBar } from "../types";

/** Pipeline szakaszonként: zöld sávok, a zárás előtti szakaszok rézzel. */
export async function PipelineCard({ stages }: { stages: StageBar[] }) {
  const t = await getTranslations();
  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <Card className="flex h-full flex-col gap-4 px-[22px] py-[18px]">
      <CardHeader
        title={t("dashboard.pipeline.title")}
        aside={
          <Link href="/ugyletek" className="text-13 font-semibold text-primary hover:text-ink">
            {t("dashboard.pipeline.link")}
          </Link>
        }
      />
      <div className="flex flex-col gap-2.5">
        {stages.map((s) => {
          const label = s.stage === "mandate_signed" ? t("enums.dealStageShort.mandate_signed") : t(`enums.dealStage.${s.stage}`);
          return (
            <StatBarRow
              key={s.stage}
              label={t("dashboard.pipeline.row", { stage: label, count: s.count })}
              value={formatMillions(s.value, { compact: true, currency: false })}
              pct={(s.value / max) * 100}
              tone={s.preClose ? "accent" : "primary"}
            />
          );
        })}
      </div>
      <span className="text-12 text-muted">{t("dashboard.pipeline.legend")}</span>
    </Card>
  );
}

const ALERT_STYLE = {
  danger: { box: "bg-danger-soft", dot: "bg-danger" },
  warning: { box: "bg-warning-soft", dot: "bg-warning" },
  neutral: { box: "bg-surface-sunken", dot: "bg-muted" },
} as const;

/** Figyelmeztetések: foglaló-határidő (piros), lejáró megbízás (sárga), álló ügylet (semleges). */
export async function AlertsCard({ alerts }: { alerts: AlertItem[] }) {
  const t = await getTranslations("dashboard.alerts");

  const text = (a: AlertItem) => {
    switch (a.kind) {
      case "deposit": {
        const when = a.daysLeft === 0 ? t("today") : a.daysLeft === 1 ? t("tomorrow") : t("inDays", { count: a.daysLeft });
        return { title: t("depositDeadline", { when }), body: a.address };
      }
      case "mandate":
        return { title: t("mandateExpires", { count: a.daysLeft }), body: t("extendQuestion", { address: a.address }) };
      case "stale":
        return { title: t("stale", { count: a.days }), body: t("priceQuestion", { address: a.address }) };
    }
  };

  return (
    <Card className="flex h-full flex-col gap-3 px-[22px] py-[18px]">
      <CardHeader title={t("title")} />
      {alerts.length === 0 ? <p className="py-4 text-14 text-muted">{t("empty")}</p> : null}
      {alerts.map((alert, i) => {
        const { title, body } = text(alert);
        const style = ALERT_STYLE[alert.severity];
        return (
          <Link
            key={`${alert.kind}-${i}`}
            href={alert.href}
            className={cn("flex gap-3 rounded-tile p-3 transition-[filter] hover:brightness-[0.98] hover:text-ink", style.box)}
          >
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
            <span className="flex flex-col gap-0.5">
              <span className="text-14 font-semibold">{title}</span>
              <span className="text-13 text-ink-3">{body}</span>
            </span>
          </Link>
        );
      })}
    </Card>
  );
}
