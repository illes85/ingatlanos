import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Printer } from "lucide-react";
import { requireAppContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { budapestDayKey, formatDateWithWeekday, formatTime } from "@/lib/format";
import { getShowingDetail } from "@/features/showings/queries";
import { ShowingActions } from "@/features/showings/components/showing-actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_TONE = { scheduled: "primary", completed: "neutral", cancelled: "danger", no_show: "warning" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("showings.detail");
  return { title: t("title") };
}

/** Bemutató adatlapja: állapot, visszajelzés, bemutatási lap. */
export default async function ShowingPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppContext();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const showing = await getShowingDetail(ctx, id);
  if (!showing) notFound();
  const [t, tStatus] = await Promise.all([getTranslations("showings.detail"), getTranslations("enums.showingStatus")]);

  return (
    <div className="flex max-w-[760px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-2">
        <Link href={`/naptar?datum=${budapestDayKey(showing.startsAt)}&nezet=nap`} className="text-14 text-muted hover:text-ink">
          ← {t("back")}
        </Link>
        <h1 className="serif text-34 leading-tight font-medium">{showing.property?.address || showing.property?.code || t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2 text-14 text-muted">
          <Badge tone={STATUS_TONE[showing.status]} size="sm">
            {tStatus(showing.status)}
          </Badge>
          <span>
            {formatDateWithWeekday(showing.startsAt)}, {formatTime(showing.startsAt)}
            {showing.endsAt ? `–${formatTime(showing.endsAt)}` : ""}
          </span>
          {showing.agentName ? <span>· {showing.agentName}</span> : null}
        </div>
      </header>

      <Card className="flex flex-col gap-3 p-6 text-15">
        {showing.property ? (
          <p>
            <span className="text-muted">{t("property")}: </span>
            <Link href={`/ingatlanok/${showing.property.id}`} className="font-semibold text-primary hover:underline">
              {showing.property.code} · {showing.property.title}
            </Link>
          </p>
        ) : null}
        {showing.buyer ? (
          <p>
            <span className="text-muted">{t("buyer")}: </span>
            <Link href={`/ugyfelek/${showing.buyer.id}`} className="font-semibold text-primary hover:underline">
              {showing.buyer.name}
            </Link>
            {showing.buyer.phone ? <span className="text-muted"> · {showing.buyer.phone}</span> : null}
          </p>
        ) : null}
        {showing.notes ? <p className="whitespace-pre-line">{showing.notes}</p> : null}
        {showing.feedbackRequestedAt ? <p className="text-14 text-muted">{t("feedbackRequested")}</p> : null}
        <div>
          <Button variant="secondary" asChild>
            <Link href={`/naptar/${showing.id}/lap`}>
              <Printer size={17} aria-hidden="true" />
              {t("sheet")}
            </Link>
          </Button>
        </div>
      </Card>

      <ShowingActions
        showingId={showing.id}
        status={showing.status}
        feedbackRequested={Boolean(showing.feedbackRequestedAt)}
        rating={showing.feedbackRating}
        feedbackText={showing.feedbackText ?? ""}
      />
    </div>
  );
}
