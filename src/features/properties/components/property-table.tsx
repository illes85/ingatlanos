import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { PropertyPhoto } from "@/components/domain/property-photo";
import { formatArea, formatMillions, formatPricePerSqm, formatRooms } from "@/lib/format";
import type { PropertyListItem } from "../types";

const STATUS_TONE: Record<PropertyListItem["status"], BadgeProps["tone"]> = {
  draft: "neutral",
  active: "primary",
  under_offer: "accent",
  reserved: "accent",
  sold: "sunken",
  rented: "sunken",
  withdrawn: "sunken",
  expired: "danger",
};

function mandateTone(daysLeft: number): BadgeProps["tone"] {
  if (daysLeft < 0) return "danger";
  if (daysLeft <= 14) return "warning";
  return "neutral";
}

/** Sűrű táblázatos nézet. Mobilon vízszintesen görgethető, az ingatlan oszlop rögzített. */
export async function PropertyTable({ items }: { items: PropertyListItem[] }) {
  const t = await getTranslations("properties");
  const tEnums = await getTranslations("enums");

  return (
    <div className="overflow-x-auto rounded-card border border-line-card bg-surface shadow-card">
      <table className="w-full min-w-[960px] border-collapse text-left text-14">
        <thead>
          <tr className="border-b border-line-subtle text-12 font-bold tracking-[0.04em] text-muted uppercase">
            <th scope="col" className="sticky left-0 bg-surface px-4 py-3">{t("table.property")}</th>
            <th scope="col" className="px-3 py-3">{t("table.type")}</th>
            <th scope="col" className="px-3 py-3 text-right">{t("table.price")}</th>
            <th scope="col" className="px-3 py-3 text-right">{t("table.pricePerSqm")}</th>
            <th scope="col" className="px-3 py-3 text-right">{t("table.area")}</th>
            <th scope="col" className="px-3 py-3 text-right">{t("table.rooms")}</th>
            <th scope="col" className="px-3 py-3">{t("table.status")}</th>
            <th scope="col" className="px-3 py-3">{t("table.agent")}</th>
            <th scope="col" className="px-3 py-3">{t("table.mandate")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-b border-line-subtle last:border-b-0 hover:bg-surface-sunken/60">
              <th scope="row" className="sticky left-0 bg-inherit px-4 py-2.5 font-normal">
                <Link href={`/ingatlanok/${p.id}`} className="flex items-center gap-3 hover:text-ink">
                  <PropertyPhoto src={p.photoUrl} alt="" seed={p.id} type={p.propertyType} sizes="64px" className="size-14 shrink-0 rounded-control" glyphSize={24} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{p.address}</span>
                    <span className="text-12 text-muted">
                      {p.code} · {t(`transactionBadge.${p.transactionType}`)}
                    </span>
                  </span>
                </Link>
              </th>
              <td className="px-3 py-2.5 text-ink-2">{p.subtype ?? tEnums(`propertyType.${p.propertyType}`)}</td>
              <td className="serif px-3 py-2.5 text-right text-16 font-medium whitespace-nowrap">{formatMillions(p.price)}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap text-ink-2">{p.pricePerSqm ? formatPricePerSqm(p.pricePerSqm) : "–"}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap text-ink-2">{p.areaSqm ? formatArea(p.areaSqm) : "–"}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap text-ink-2">
                {p.rooms !== null ? formatRooms(p.rooms, p.halfRooms) : "–"}
              </td>
              <td className="px-3 py-2.5">
                <Badge tone={STATUS_TONE[p.status]} size="sm">{tEnums(`propertyStatus.${p.status}`)}</Badge>
              </td>
              <td className="px-3 py-2.5">
                {p.responsibleName ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={p.responsibleName} size="sm" />
                    <span className="whitespace-nowrap text-ink-2">{p.responsibleName}</span>
                  </span>
                ) : (
                  "–"
                )}
              </td>
              <td className="px-3 py-2.5">
                {p.mandateDaysLeft !== null ? (
                  <Badge tone={mandateTone(p.mandateDaysLeft)} size="sm">
                    {p.mandateDaysLeft < 0 ? t("mandateExpired") : t("mandateExpires", { days: p.mandateDaysLeft })}
                  </Badge>
                ) : (
                  <span className="text-muted">–</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
