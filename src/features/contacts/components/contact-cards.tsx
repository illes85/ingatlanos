import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { formatMillions, formatShortDate } from "@/lib/format";
import type { ContactDetail } from "../detail-queries";

/** Keresési profilok összefoglalója (a szerkesztés a szerkesztő oldalon van). */
export async function ProfilesCard({ contactId, profiles }: { contactId: string; profiles: ContactDetail["profiles"] }) {
  const t = await getTranslations("contacts.detail.profiles");
  const tEnums = await getTranslations("enums");
  return (
    <Card className="flex flex-col gap-4 p-6">
      <CardHeader
        title={t("title")}
        aside={
          <Link href={`/ugyfelek/${contactId}/szerkesztes#profilok`} className="text-13 font-semibold text-primary">
            {t("add")}
          </Link>
        }
      />
      {profiles.length === 0 ? (
        <p className="text-14 text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {profiles.map((p) => {
            const price =
              p.priceMin !== null && p.priceMax !== null
                ? t("range", { min: formatMillions(p.priceMin, { currency: false }), max: formatMillions(p.priceMax) })
                : p.priceMax !== null
                  ? t("upTo", { amount: formatMillions(p.priceMax) })
                  : p.priceMin !== null
                    ? t("from", { amount: formatMillions(p.priceMin) })
                    : null;
            const facts = [
              tEnums(`transactionType.${p.transactionType}`),
              p.propertyTypes.map((type) => tEnums(`propertyType.${type}`)).join(", ") || null,
              p.places.slice(0, 3).join(", ") || null,
              price,
              p.roomsMin ? t("rooms", { count: p.roomsMin }) : null,
              p.areaMin ? t("area", { min: p.areaMin }) : null,
              p.financing.join(", ") || null,
              p.mortgageApproved ? t("mortgageApproved") : null,
            ].filter(Boolean);
            return (
              <li key={p.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-15 font-bold">{p.name ?? tEnums(`transactionType.${p.transactionType}`)}</span>
                  {!p.active ? (
                    <Badge tone="sunken" size="xs">
                      {t("inactive")}
                    </Badge>
                  ) : null}
                  {p.urgency === "high" ? (
                    <Badge tone="danger" size="xs">
                      {tEnums("urgency.high")}
                    </Badge>
                  ) : null}
                </div>
                <span className="text-13 leading-snug text-muted">{facts.join(" · ")}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const REACTION_TONE: Record<string, BadgeProps["tone"]> = { interested: "primary", not_interested: "sunken", no_response: "neutral" };

/** „Kapott ajánlatok”: melyik ingatlant küldtük már neki (kritikus, hogy ne ajánljuk kétszer). */
export async function RecommendationsCard({ recommendations }: { recommendations: ContactDetail["recommendations"] }) {
  const t = await getTranslations("contacts.detail.recommendations");
  const tChannel = await getTranslations("enums.recommendationChannel");
  return (
    <Card className="flex flex-col gap-4 p-6">
      <CardHeader title={t("title")} />
      {recommendations.length === 0 ? (
        <p className="text-14 text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-subtle">
          {recommendations.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 flex-col">
                <Link href={`/ingatlanok/${r.propertyId}`} className="truncate text-14 font-semibold hover:text-primary">
                  {r.address}
                </Link>
                <span className="text-12 text-muted">
                  {formatShortDate(r.sentAt)} · {tChannel.has(r.channel as never) ? tChannel(r.channel as never) : r.channel}
                </span>
              </div>
              {r.reaction ? (
                <Badge tone={REACTION_TONE[r.reaction]} size="xs">
                  {t(`reaction.${r.reaction}`)}
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const STAGE_TONE: Record<string, BadgeProps["tone"]> = { open: "primary", won: "solid", lost: "sunken" };

export async function DealsCard({ deals, sellerProperties }: { deals: ContactDetail["deals"]; sellerProperties: ContactDetail["sellerProperties"] }) {
  const t = await getTranslations("contacts.detail");
  const tEnums = await getTranslations("enums");
  if (deals.length === 0 && sellerProperties.length === 0) return null;
  return (
    <Card className="flex flex-col gap-4 p-6">
      <CardHeader title={t("deals.title")} />
      <ul className="flex flex-col divide-y divide-line-subtle">
        {deals.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-14 font-semibold">{d.address ?? tEnums(`dealStage.${d.stage}`)}</span>
              <span className="text-12 text-muted">
                {tEnums(`dealStage.${d.stage}`)}
                {d.expectedValue ? ` · ${formatMillions(d.expectedValue)}` : ""}
              </span>
            </div>
            <Badge tone={STAGE_TONE[d.status]} size="xs">
              {d.status === "open" ? tEnums(`dealStage.${d.stage}`) : d.status === "won" ? "✓" : "–"}
            </Badge>
          </li>
        ))}
        {sellerProperties.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
            <Link href={`/ingatlanok/${p.id}`} className="truncate text-14 font-semibold hover:text-primary">
              {p.address}
            </Link>
            <span className="text-13 text-muted">{formatMillions(p.price)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
