"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { PropertyPhoto } from "@/components/domain/property-photo";
import { formatArea, formatMillions, formatRooms } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PropertyListItem } from "../types";

const EXPIRING_DAYS = 14;
const STALLED_DAYS = 14;
const NEW_DAYS = 7;

interface MapListItemProps {
  property: PropertyListItem;
  selected: boolean;
  onHover: (id: string | null) => void;
}

/** Kompakt kártya a térkép melletti listában; hover és kiválasztás összekapcsolva a jelölővel. */
export const MapListItem = forwardRef<HTMLAnchorElement, MapListItemProps>(function MapListItem({ property: p, selected, onHover }, ref) {
  const t = useTranslations("properties");
  const tEnums = useTranslations("enums");
  const tCommon = useTranslations("common");

  let badge: { tone: BadgeProps["tone"]; label: string } | null = null;
  if (p.mandateDaysLeft !== null && p.mandateDaysLeft >= 0 && p.mandateDaysLeft <= EXPIRING_DAYS) {
    badge = { tone: "warning", label: t("mandateExpires", { days: p.mandateDaysLeft }) };
  } else if (p.status === "under_offer" || p.status === "reserved") {
    badge = { tone: p.status === "reserved" ? "primary" : "accent", label: tEnums(`propertyStatus.${p.status}`) };
  } else if (p.daysInStatus >= STALLED_DAYS && p.status === "active") {
    badge = { tone: "neutral", label: t("stalled", { days: p.daysInStatus }) };
  } else if (p.daysSinceListed !== null && p.daysSinceListed <= NEW_DAYS) {
    badge = { tone: "neutral", label: t("map.badges.new", { days: tCommon("daysAgo", { count: p.daysSinceListed }) }) };
  }

  const details = [
    p.subtype ?? tEnums(`propertyType.${p.propertyType}`),
    p.areaSqm ? formatArea(p.areaSqm) : null,
    p.rooms !== null ? tCommon("rooms", { rooms: formatRooms(p.rooms, p.halfRooms) }) : null,
  ].filter(Boolean);

  return (
    <Link
      ref={ref}
      href={`/ingatlanok/${p.id}`}
      aria-current={selected ? "true" : undefined}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(p.id)}
      onBlur={() => onHover(null)}
      className={cn(
        "flex gap-4 rounded-card border bg-surface p-3 transition-[box-shadow,border-color] duration-150 hover:text-ink",
        selected ? "border-primary shadow-selected" : "border-line-card shadow-card hover:shadow-raised",
      )}
    >
      <PropertyPhoto src={p.photoUrl} alt="" seed={p.id} type={p.propertyType} sizes="96px" className="size-24 shrink-0 rounded-tile" glyphSize={32} />
      <span className="flex min-w-0 flex-col justify-center gap-1">
        <span className="serif text-22 leading-none font-medium">{formatMillions(p.price)}</span>
        <span className="truncate text-14 font-semibold">{p.address}</span>
        <span className="truncate text-13 text-muted">{details.join(" · ")}</span>
        {badge ? (
          <Badge tone={badge.tone} size="xs" className="mt-0.5 self-start">
            {badge.label}
          </Badge>
        ) : null}
      </span>
    </Link>
  );
});
