import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { CalendarIllustration } from "@/components/illustrations";
import { PropertyPhoto } from "@/components/domain/property-photo";
import { cn } from "@/lib/utils";
import { formatMillions, formatTime } from "@/lib/format";
import type { ShowingItem } from "../types";

/** Mai bemutatók idővonalon: lezajlott (teli pont), következő (zöld karika), később (szürke karika). */
export async function ShowingsCard({ showings, now }: { showings: ShowingItem[]; now: Date }) {
  const t = await getTranslations("dashboard.showings");
  const nextIndex = showings.findIndex((s) => s.status === "scheduled" && new Date(s.startsAt) >= now);

  return (
    <Card className="flex h-full flex-col gap-3.5 px-[22px] py-[18px]">
      <CardHeader title={t("title")} aside={<span className="text-13 text-muted">{t("count", { count: showings.length })}</span>} />
      {showings.length === 0 ? (
        <EmptyState framed={false} illustration={<CalendarIllustration />} title={t("empty")} className="flex-1" />
      ) : (
        <ol className="flex flex-col">
          {showings.map((s, index) => {
            const done = s.status === "completed" || (s.status === "scheduled" && new Date(s.startsAt) < now && index < nextIndex);
            const isNext = index === nextIndex;
            const last = index === showings.length - 1;
            return (
              <li key={s.id} className="flex gap-3.5">
                <div className="flex w-3.5 flex-col items-center" aria-hidden="true">
                  <span
                    className={cn(
                      "mt-1 size-3 rounded-full",
                      done ? "bg-primary" : isNext ? "border-2 border-primary bg-surface" : "border-2 border-line-dashed bg-surface",
                    )}
                  />
                  {!last ? <span className="my-1 w-0.5 flex-1 bg-line" /> : null}
                </div>
                <div className={cn("flex flex-1 flex-col gap-1", !last && "pb-[18px]")}>
                  <span className="serif text-18 font-semibold">{formatTime(s.startsAt)}</span>
                  <Link href={`/ingatlanok/${s.propertyId}`} className="text-14 font-semibold">
                    {s.address}
                  </Link>
                  <span className="text-13 text-muted">{[s.propertyLabel, s.buyerName].filter(Boolean).join(" · ")}</span>
                  {s.status === "completed" ? (
                    <Badge tone="primary" className="self-start font-semibold">
                      {s.feedbackRequested ? t("feedbackRequested") : t("completed")}
                    </Badge>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <Button variant="dashed" shape="soft" className="mt-auto w-full">
        {t("add")}
      </Button>
    </Card>
  );
}

/** Mobil: KÖVETKEZŐ BEMUTATÓ kártya fotóval, Navigáció + Bemutatási lap gombbal. */
export async function NextShowingCard({ showing, now }: { showing: ShowingItem | undefined; now: Date }) {
  if (!showing) return null;
  const t = await getTranslations();
  const minutes = Math.max(0, Math.round((new Date(showing.startsAt).getTime() - now.getTime()) / 60_000));
  const until = minutes < 60 ? t("common.inMinutes", { count: minutes }) : t("common.inHours", { count: Math.round(minutes / 60) });

  return (
    <Card className="flex flex-col gap-3 rounded-card-lg p-4 shadow-raised">
      <div className="flex items-center justify-between">
        <Eyebrow className="tracking-[0.06em]">{t("dashboard.showings.next")}</Eyebrow>
        <Badge tone="primary" size="sm">
          {until}
        </Badge>
      </div>
      <div className="flex gap-3">
        <PropertyPhoto src={showing.photoUrl} alt={showing.address} seed={showing.propertyId} sizes="72px" className="size-[72px] shrink-0 rounded-tile" glyphSize={28} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="serif text-20 font-semibold">{formatTime(showing.startsAt)}</span>
          <span className="truncate text-14 font-semibold">{showing.address}</span>
          <span className="truncate text-13 text-muted">
            {[showing.buyerName, showing.price ? formatMillions(showing.price) : null].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button asChild shape="soft" className="flex-1">
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(showing.mapsQuery)}`} target="_blank" rel="noreferrer">
            {t("dashboard.showings.navigate")}
          </a>
        </Button>
        <Button variant="secondary" shape="soft" className="flex-1">
          {t("dashboard.showings.sheet")}
        </Button>
      </div>
    </Card>
  );
}
