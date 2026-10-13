import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { RingProgress } from "@/components/ui/progress";
import { formatHuf, formatInteger, formatMillions, formatSignedPercent } from "@/lib/format";
import type { DashboardData } from "../types";

const kpiCard = "flex flex-col gap-1.5 px-[22px] py-5";

/** KPI-sor: Havi jutalék (réz gyűrű) · Pipeline érték · Aktív megbízások · Új leadek. */
export async function KpiRow({ data }: { data: DashboardData }) {
  const t = await getTranslations("dashboard");
  const { commission, pipeline, mandates, leads } = data;
  const pct = commission.goal ? Math.min(100, Math.round((commission.earned / commission.goal) * 100)) : 0;
  const remaining = commission.goal ? Math.max(0, commission.goal - commission.earned) : 0;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <Card className="flex items-center gap-5 px-[22px] py-5 sm:col-span-2 xl:col-span-1">
        <RingProgress value={pct} label={`${t("commission.title")}: ${pct}%`}>
          <span className="serif text-20 font-semibold">{pct}%</span>
        </RingProgress>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-13 font-semibold text-muted">{t("commission.title")}</span>
          <span className="serif text-32 leading-tight font-medium whitespace-nowrap">{formatHuf(commission.earned)}</span>
          {commission.goal ? (
            <span className="text-13 text-muted">
              {t("commission.goal", { goal: formatHuf(commission.goal) })} ·{" "}
              <span className="font-semibold text-accent-text">
                {remaining > 0
                  ? t("commission.remaining", { amount: formatMillions(remaining, { decimals: 2, currency: false }) })
                  : t("commission.reached")}
              </span>
            </span>
          ) : null}
        </div>
      </Card>

      <Card className={kpiCard}>
        <span className="text-13 font-semibold text-muted">{t("pipelineValue.title")}</span>
        <span className="serif text-32 leading-tight font-medium whitespace-nowrap">{formatMillions(pipeline.value)}</span>
        {pipeline.trendPct !== null ? (
          <span className={pipeline.trendPct >= 0 ? "text-13 font-semibold text-success-text" : "text-13 font-semibold text-danger-text"}>
            {t("pipelineValue.trend", { value: formatSignedPercent(pipeline.trendPct) })}
          </span>
        ) : null}
      </Card>

      <Card className={kpiCard}>
        <span className="text-13 font-semibold text-muted">{t("mandates.title")}</span>
        <span className="serif text-32 leading-tight font-medium">{formatInteger(mandates.active)}</span>
        <span className="text-13 text-muted">{t("mandates.exclusive", { count: mandates.exclusive })}</span>
      </Card>

      <Card className={kpiCard}>
        <span className="text-13 font-semibold text-muted">{t("newLeads.title")}</span>
        <span className="serif text-32 leading-tight font-medium">{formatInteger(leads.fresh)}</span>
        <span className={leads.urgent > 0 ? "text-13 font-semibold text-danger" : "text-13 text-muted"}>
          {leads.urgent > 0 ? t("newLeads.urgent", { count: leads.urgent }) : t("newLeads.none")}
        </span>
      </Card>
    </div>
  );
}
