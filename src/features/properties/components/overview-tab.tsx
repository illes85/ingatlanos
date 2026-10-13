import { getTranslations } from "next-intl/server";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { FeatureChip } from "@/components/ui/badge";
import { formatInteger } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PropertyDetail } from "../detail-types";
import { ActivityList } from "./activity-list";
import { MatchesPanel } from "./matches-panel";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1 px-5 py-4">
      <span className="text-13 text-muted">{label}</span>
      <span className="serif text-28 leading-none font-medium">{value}</span>
    </Card>
  );
}

/** Áttekintés fül: mutatók, leírás kiemelésekkel, idővonal-kivonat és a passzoló vevők panel. */
export async function OverviewTab({ detail, className }: { detail: PropertyDetail; className?: string }) {
  const t = await getTranslations("properties.detail");
  const { property: p, stats } = detail;

  return (
    <div className={cn("grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]", className)}>
      <div className="flex min-w-0 flex-col gap-6">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={t("stats.views")} value={formatInteger(stats.views)} />
          <Stat label={t("stats.leads")} value={formatInteger(stats.leads)} />
          <Stat label={t("stats.showings")} value={formatInteger(stats.showings)} />
          <Stat
            label={t("stats.rating")}
            value={stats.avgRating === null ? "–" : t("stats.ratingValue", { value: stats.avgRating.toFixed(1).replace(".", ",") })}
          />
        </dl>

        <Card id="hirdetesszoveg" className="scroll-mt-24 p-6">
          <CardHeader title={t("description.title")} />
          {p.description ? (
            <p className="mt-3 max-w-[72ch] text-16 leading-relaxed whitespace-pre-line text-ink-2">{p.description}</p>
          ) : (
            <p className="mt-3 text-14 text-muted">{t("description.empty")}</p>
          )}
          {p.highlights.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {p.highlights.map((highlight) => (
                <li key={highlight}>
                  <FeatureChip>{highlight}</FeatureChip>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card className="p-6">
          <CardHeader title={t("timeline.title")} />
          <div className="mt-4">
            {detail.activities.length === 0 ? (
              <EmptyState title={t("timeline.empty")} framed={false} />
            ) : (
              <ActivityList items={detail.activities.slice(0, 5)} />
            )}
          </div>
        </Card>
      </div>

      <aside className="min-w-0">
        <MatchesPanel matches={detail.matches} />
      </aside>
    </div>
  );
}
