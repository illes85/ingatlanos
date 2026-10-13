import { getTranslations } from "next-intl/server";
import { Card, InverseCard } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { formatInteger, formatMillions } from "@/lib/format";
import type { DashboardData } from "../types";

/** Mobil KPI-pár: sötét jutalékkártya réz sávval + új leadek. */
export async function MobileKpiPair({ data }: { data: DashboardData }) {
  const t = await getTranslations("dashboard");
  const pct = data.commission.goal ? (data.commission.earned / data.commission.goal) * 100 : 0;

  return (
    <div className="flex gap-2.5">
      <InverseCard className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="text-12 text-inverse-muted">{t("commission.title")}</span>
        <span className="serif text-22 font-medium">{formatMillions(data.commission.earned, { decimals: 2 })}</span>
        <ProgressBar value={pct} fill="accent-inverse" track="inverse" className="h-[5px]" label={t("commission.title")} />
      </InverseCard>
      <Card variant="flat" className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="text-12 text-muted">{t("newLeads.title")}</span>
        <span className="serif text-22 font-medium">{formatInteger(data.leads.fresh)}</span>
        <span className={data.leads.urgent > 0 ? "text-12 font-semibold text-danger" : "text-12 text-muted"}>
          {data.leads.urgent > 0 ? t("newLeads.urgentShort", { count: data.leads.urgent }) : t("newLeads.none")}
        </span>
      </Card>
    </div>
  );
}
