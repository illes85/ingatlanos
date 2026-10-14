import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckSquare, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { budapestMidnight, formatDateWithWeekday, formatShortDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addDays, calendarHref, visibleDays, type CalendarParams } from "../calendar";
import type { CalendarItem } from "../queries";

const STATUS_TONE = { scheduled: "primary", completed: "neutral", cancelled: "danger", no_show: "warning" } as const;

const weekday = new Intl.DateTimeFormat("hu-HU", { timeZone: "Europe/Budapest", weekday: "short" });

/** Hét- és napnézet: a navigáció és a nézetváltó az URL-ben él, a nap kártyáin a bemutatók és a határidős feladatok láthatók. */
export async function CalendarView({ params, today, items }: { params: CalendarParams; today: string; items: Map<string, CalendarItem[]> }) {
  const t = await getTranslations("calendar");
  const tStatus = await getTranslations("enums.showingStatus");
  const days = visibleDays(params);
  const step = params.view === "nap" ? 1 : 7;
  const link = (dateKey: string, view = params.view) => calendarHref({ view, dateKey }, today);
  const heading =
    params.view === "nap"
      ? formatDateWithWeekday(budapestMidnight(params.dateKey).getTime() + 12 * 3_600_000)
      : `${formatShortDate(budapestMidnight(days[0]!).getTime() + 12 * 3_600_000)} – ${formatShortDate(budapestMidnight(days[6]!).getTime() + 12 * 3_600_000)}`;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex flex-col gap-1">
          <h1 className="serif text-34 leading-tight font-medium">{t("title")}</h1>
          <p className="text-15 text-muted" data-testid="calendar-range">
            {heading}
          </p>
        </div>
        <Button asChild>
          <Link href={`/naptar/uj${params.dateKey !== today ? `?datum=${params.dateKey}` : ""}`}>
            <Plus size={18} aria-hidden="true" />
            {t("newShowing")}
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label={t("navLabel")} className="flex items-center gap-2">
          <Button variant="secondary" size="icon-sm" asChild>
            <Link href={link(addDays(params.dateKey, -step))} aria-label={t("prev")}>
              <ChevronLeft size={18} aria-hidden="true" />
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={link(today)}>{t("today")}</Link>
          </Button>
          <Button variant="secondary" size="icon-sm" asChild>
            <Link href={link(addDays(params.dateKey, step))} aria-label={t("next")}>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </Button>
        </nav>
        <div role="group" aria-label={t("viewLabel")} className="flex gap-2">
          {(["het", "nap"] as const).map((view) => (
            <Link
              key={view}
              href={link(params.dateKey, view)}
              aria-current={view === params.view ? "page" : undefined}
              className={cn(
                "flex h-10 items-center rounded-full border px-4 text-14 font-semibold transition-colors",
                view === params.view ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              {t(`views.${view}`)}
            </Link>
          ))}
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-3", params.view === "het" && "md:grid-cols-7")} data-testid="calendar-grid">
        {days.map((day) => {
          const dayItems = items.get(day) ?? [];
          const isToday = day === today;
          const noon = budapestMidnight(day).getTime() + 12 * 3_600_000;
          return (
            <Card key={day} data-testid={`day-${day}`} className={cn("flex min-h-24 flex-col gap-2.5 p-3.5", isToday && "border-primary")}>
              <Link href={link(day, "nap")} className="flex items-baseline gap-2 text-14">
                <span className={cn("font-bold capitalize", isToday && "text-primary")}>{weekday.format(noon)}</span>
                <span className="text-muted">{formatShortDate(noon)}</span>
              </Link>
              {dayItems.length === 0 ? <span className="text-13 text-muted">{params.view === "nap" ? t("emptyDay") : "–"}</span> : null}
              <ul className="flex flex-col gap-2">
                {dayItems.map((item) =>
                  item.kind === "showing" ? (
                    <li key={`s-${item.id}`}>
                      <Link
                        href={`/naptar/${item.id}`}
                        data-testid="calendar-showing"
                        className={cn(
                          "flex flex-col gap-1 rounded-control border border-line bg-surface-sunken p-2.5 hover:border-primary",
                          item.status === "cancelled" && "opacity-60",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="serif text-17 font-medium">{formatTime(item.at)}</span>
                          <Badge tone={STATUS_TONE[item.status]} size="xs">
                            {tStatus(item.status)}
                          </Badge>
                        </span>
                        <span className="text-14 font-semibold">{item.address || item.code}</span>
                        {item.buyerName ? <span className="text-13 text-muted">{item.buyerName}</span> : null}
                        {params.view === "nap" && item.agentName ? <span className="text-13 text-muted">{item.agentName}</span> : null}
                      </Link>
                    </li>
                  ) : (
                    <li key={`t-${item.id}`}>
                      <Link href="/feladatok" className="flex items-start gap-2 rounded-control px-1 py-1 text-13 text-ink-2 hover:text-primary">
                        <CheckSquare size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
