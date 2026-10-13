import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatShortDate, formatTime } from "@/lib/format";
import type { Database } from "@/types/database";
import type { PropertyDetail } from "../detail-types";
import { ActivityList } from "./activity-list";

type Enums = Database["public"]["Enums"];

const LEAD_TONE: Record<Enums["lead_status"], BadgeProps["tone"]> = {
  new: "accent",
  read: "neutral",
  contacted: "primary",
  converted: "solid",
  archived: "sunken",
  spam: "danger",
};

const SHOWING_TONE: Record<Enums["showing_status"], BadgeProps["tone"]> = {
  scheduled: "primary",
  completed: "neutral",
  cancelled: "sunken",
  no_show: "danger",
};

const DOCUMENT_TONE: Record<Enums["document_status"], BadgeProps["tone"]> = { draft: "neutral", final: "primary", signed: "solid" };

export async function LeadsTab({ leads }: { leads: PropertyDetail["leads"] }) {
  const t = await getTranslations("properties.detail.leadsTab");
  const tEnums = await getTranslations("enums");
  if (leads.length === 0) return <EmptyState title={t("empty")} />;
  return (
    <Card>
      <ul className="divide-y divide-line-subtle">
        {leads.map((lead) => (
          <li key={lead.id} className="flex items-start gap-3.5 px-5 py-4">
            <Avatar name={lead.name ?? "?"} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-15 font-bold">{lead.name ?? "–"}</span>
                {lead.urgent ? (
                  <Badge tone="danger" size="xs">
                    {t("urgent")}
                  </Badge>
                ) : null}
                <Badge tone={LEAD_TONE[lead.status]} size="xs">
                  {tEnums(`leadStatus.${lead.status}`)}
                </Badge>
              </div>
              {lead.message ? <p className="text-14 text-ink-2">{lead.message}</p> : null}
              <span className="text-12 text-muted">
                {tEnums(`leadSource.${lead.source}`)} · {formatShortDate(lead.receivedAt)} {formatTime(lead.receivedAt)}
              </span>
            </div>
            {lead.contactId ? (
              <Link href={`/ugyfelek/${lead.contactId}`} className="text-13 font-semibold text-primary">
                →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export async function ShowingsTab({ showings }: { showings: PropertyDetail["showings"] }) {
  const t = await getTranslations("properties.detail.showingsTab");
  const tEnums = await getTranslations("enums");
  if (showings.length === 0) return <EmptyState title={t("empty")} />;
  return (
    <Card>
      <ul className="divide-y divide-line-subtle">
        {showings.map((s) => (
          <li key={s.id} className="flex flex-wrap items-start gap-x-5 gap-y-2 px-5 py-4">
            <div className="flex w-28 shrink-0 flex-col">
              <span className="serif text-18 font-medium">{formatTime(s.startsAt)}</span>
              <span className="text-12 text-muted">{formatShortDate(s.startsAt)}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-15 font-bold">{s.buyerName ?? t("noBuyer")}</span>
              {s.feedbackText ? <p className="text-14 text-ink-2">„{s.feedbackText}”</p> : null}
              {s.agentName ? <span className="text-12 text-muted">{s.agentName}</span> : null}
            </div>
            <div className="flex items-center gap-3">
              {s.feedbackRating !== null ? (
                <span className="flex items-center gap-1 text-14 font-bold text-accent-text" aria-label={t("rating", { value: s.feedbackRating })}>
                  <Star size={14} fill="currentColor" aria-hidden="true" />
                  {t("rating", { value: s.feedbackRating })}
                </span>
              ) : null}
              <Badge tone={SHOWING_TONE[s.status]} size="sm">
                {tEnums(`showingStatus.${s.status}`)}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export async function DocumentsTab({ documents }: { documents: PropertyDetail["documents"] }) {
  const t = await getTranslations("properties.detail.documentsTab");
  const tEnums = await getTranslations("enums");
  if (documents.length === 0) return <EmptyState title={t("empty")} />;
  return (
    <Card>
      <ul className="divide-y divide-line-subtle">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 flex-col">
              <span className="text-15 font-bold">{d.title}</span>
              <span className="text-12 text-muted">
                {tEnums(`documentKind.${d.kind}`)} · {formatShortDate(d.createdAt)}
              </span>
            </div>
            <Badge tone={DOCUMENT_TONE[d.status]} size="sm">
              {tEnums(`documentStatus.${d.status}`)}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export async function TimelineTab({ activities }: { activities: PropertyDetail["activities"] }) {
  const t = await getTranslations("properties.detail.timeline");
  if (activities.length === 0) return <EmptyState title={t("empty")} />;
  return (
    <Card className="p-6">
      <ActivityList items={activities} />
    </Card>
  );
}

/** Fotók fül (csak megtekintés; a feltöltés és átrendezés a szerkesztő oldalon van). */
export async function PhotosTab({ media, alt }: { media: PropertyDetail["media"]; alt: string }) {
  const t = await getTranslations("properties.detail.photosTab");
  const photos = media.filter((m) => m.kind === "photo" && m.url);
  if (photos.length === 0) return <EmptyState title={t("empty")} />;
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {photos.map((m) => (
        <li key={m.id} className="relative aspect-[4/3] overflow-hidden rounded-card bg-surface-sunken">
          <Image src={m.url!} alt={m.caption ?? alt} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-cover" />
          {m.isCover ? (
            <Badge overlay size="xs" className="absolute top-2.5 left-2.5 text-ink">
              {t("cover")}
            </Badge>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
