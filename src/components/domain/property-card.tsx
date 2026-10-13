import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { formatArea, formatMillions, formatRooms } from "@/lib/format";
import type { RecentProperty } from "@/features/dashboard/types";
import { PropertyPhoto } from "./property-photo";

/** Nagy fotós ingatlankártya (Legutóbbi ingatlanok, rácsnézet). Hover: enyhe emelkedés + fotó 1.03 zoom. */
export async function PropertyCard({ property }: { property: RecentProperty }) {
  const t = await getTranslations();
  const isNew = property.daysSinceListed !== null && property.daysSinceListed <= 7 && (property.status === "draft" || property.status === "active");

  let badgeLabel: string;
  let badgeClass: BadgeProps["className"] = "text-primary";
  if (isNew) {
    badgeLabel = t("dashboard.recent.newBadge", { days: t("common.daysAgo", { count: property.daysSinceListed ?? 0 }) });
    badgeClass = "text-ink-2";
  } else {
    badgeLabel = t(`enums.propertyStatus.${property.status}`);
    if (property.status === "under_offer" || property.status === "reserved") badgeClass = "text-accent-text";
  }

  const details = [
    property.areaSqm ? formatArea(property.areaSqm) : null,
    property.rooms !== null ? t("common.rooms", { rooms: formatRooms(property.rooms, property.halfRooms) }) : null,
    property.propertyType === "flat" && property.floor !== null
      ? property.floor === 0
        ? t("common.groundFloor")
        : t("common.floorN", { floor: property.floor })
      : null,
    property.energyRating,
  ].filter(Boolean);

  return (
    <Link
      href={`/ingatlanok/${property.id}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line-card bg-surface shadow-card transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-raised hover:text-ink"
    >
      <div className="relative">
        <PropertyPhoto
          src={property.photoUrl}
          alt={property.address}
          seed={property.id}
          type={property.propertyType}
          sizes="(min-width: 1280px) 380px, (min-width: 768px) 50vw, 100vw"
          className="h-[168px]"
          zoomOnHover
        />
        <Badge overlay className={`absolute top-3 left-3 ${badgeClass}`}>
          {badgeLabel}
        </Badge>
      </div>
      <div className="flex flex-col gap-1 px-4 pt-3.5 pb-4">
        <span className="serif text-24 font-medium">{formatMillions(property.price)}</span>
        <span className="text-14 font-semibold">{property.address}</span>
        <span className="text-13 text-muted">{details.join(" · ")}</span>
      </div>
    </Link>
  );
}
