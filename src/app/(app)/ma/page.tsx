import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { dayPart, formatDateWithWeekday } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { HouseIllustration } from "@/components/illustrations";
import { PropertyCard } from "@/components/domain/property-card";
import { getDashboardData } from "@/features/dashboard/queries";
import { KpiRow } from "@/features/dashboard/components/kpi-cards";
import { CallListCard } from "@/features/dashboard/components/call-list-card";
import { NextShowingCard, ShowingsCard } from "@/features/dashboard/components/showings-card";
import { AlertsCard, PipelineCard } from "@/features/dashboard/components/pipeline-alerts";
import { MobileKpiPair } from "@/features/dashboard/components/mobile-kpis";
import { RangeSwitch } from "@/features/dashboard/components/range-switch";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("today") };
}

/** „Ma” irányítópult — Main.dc.html (desktop) és Mobil.dc.html (mobil) szerint. */
export default async function TodayPage() {
  const ctx = await requireAppContext();
  const now = new Date();
  const data = await getDashboardData(ctx, now);
  const t = await getTranslations("dashboard");
  const nextShowing = data.showings.find((s) => s.status === "scheduled" && new Date(s.startsAt) >= now);

  return (
    <>
      {/* ------------------------------------------------------------ Mobil */}
      <section className="flex flex-col gap-4 px-5 pt-2 md:hidden">
        <MobileKpiPair data={data} />
        <NextShowingCard showing={nextShowing} now={now} />
        <CallListCard callList={data.callList} compact />
        <AlertsCard alerts={data.alerts} />
      </section>

      {/* ----------------------------------------------------------- Desktop */}
      <section className="hidden w-full max-w-[1240px] flex-col gap-6 p-8 md:flex">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="serif text-44 leading-[1.05] font-medium">
              {t(`greeting.${dayPart(now)}`, { name: data.firstName })}
            </h1>
            <p className="text-15 text-muted">
              {formatDateWithWeekday(now)} ·{" "}
              <span className="font-semibold text-ink">{t("todoCount", { count: data.todoCount })}</span>
            </p>
          </div>
          <RangeSwitch />
        </div>

        <KpiRow data={data} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
          <CallListCard callList={data.callList} />
          <ShowingsCard showings={data.showings} now={now} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
          <PipelineCard stages={data.stages} />
          <AlertsCard alerts={data.alerts} />
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h2 className="serif text-22 font-medium">{t("recent.title")}</h2>
            <Link href="/ingatlanok" className="text-13 font-semibold text-primary hover:text-ink">
              {t("recent.link")}
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <EmptyState
              illustration={<HouseIllustration />}
              title={t("recent.empty")}
              description={t("recent.emptyBody")}
              action={<Button>{t("recent.emptyCta")}</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.recent.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
