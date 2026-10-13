"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Eraser, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { formatMillions, formatPricePerSqm } from "@/lib/format";
import { inBounds, pointInPolygon, type Bounds, type LngLat } from "@/lib/geo";
import type { PropertySort } from "../filters";
import type { PropertyListItem } from "../types";
import { MapListItem } from "./map-list-item";
import { PropertiesMap, type MapMarker } from "./properties-map";

const MIN_POLYGON_POINTS = 3;

/** Térkép + lista osztott nézet: a lista azt mutatja, ami a térképrészletben (vagy a rajzolt területen) látszik. */
export function MapView({ items, sort }: { items: PropertyListItem[]; sort: PropertySort }) {
  const t = useTranslations("properties");
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [polygon, setPolygon] = useState<LngLat[]>([]);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());

  const located = useMemo(() => items.filter((p) => p.lat !== null && p.lng !== null), [items]);
  const missing = items.length - located.length;
  const hasArea = !drawing && polygon.length >= MIN_POLYGON_POINTS;

  const visible = useMemo(
    () =>
      located.filter((p) => {
        const point: LngLat = [p.lng!, p.lat!];
        if (hasArea) return pointInPolygon(point, polygon);
        return bounds ? inBounds(point, bounds) : true;
      }),
    [located, bounds, hasArea, polygon],
  );

  const markers: MapMarker[] = useMemo(
    () => located.map((p) => ({ id: p.id, position: [p.lng!, p.lat!] as LngLat, label: formatMillions(p.price, { currency: false }), description: p.address })),
    [located],
  );

  const avgPerSqm = useMemo(() => {
    const values = visible.map((p) => p.pricePerSqm).filter((v): v is number => v !== null);
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  }, [visible]);

  const select = (id: string) => {
    setSelectedId(id);
    itemRefs.current.get(id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const startDrawing = () => {
    setPolygon([]);
    setDrawing(true);
  };
  const finishDrawing = () => {
    setDrawing(false);
    if (polygon.length < MIN_POLYGON_POINTS) setPolygon([]);
  };
  const clearArea = () => {
    setDrawing(false);
    setPolygon([]);
  };

  return (
    <div className="grid h-[calc(100dvh-220px)] min-h-[520px] grid-cols-1 gap-5 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
      <section aria-label={t("map.listLabel")} className="order-2 flex min-h-0 flex-col gap-3 lg:order-1">
        <div className="flex items-baseline justify-between gap-3 text-14 text-muted">
          <span aria-live="polite">
            {t.rich("map.countInArea", { count: visible.length, strong: (chunks) => <strong className="font-bold text-ink">{chunks}</strong> })}
          </span>
          <span>{t("map.sortedBy", { sort: t(`sorts.${sort}`) })}</span>
        </div>
        <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {visible.length === 0 ? (
            <li>
              <EmptyState title={t("map.empty")} />
            </li>
          ) : (
            visible.map((p) => (
              <li key={p.id}>
                <MapListItem
                  property={p}
                  selected={p.id === selectedId}
                  onHover={setHoverId}
                  ref={(node) => {
                    if (node) itemRefs.current.set(p.id, node);
                    else itemRefs.current.delete(p.id);
                  }}
                />
              </li>
            ))
          )}
        </ul>
        {missing > 0 ? <p className="text-12 text-muted">{t("map.noCoords", { count: missing })}</p> : null}
      </section>

      <div className="relative order-1 h-[46dvh] min-h-[320px] lg:order-2 lg:h-full">
        <PropertiesMap
          markers={markers}
          selectedId={selectedId}
          hoverId={hoverId}
          onSelect={select}
          onBoundsChange={setBounds}
          polygon={polygon}
          drawing={drawing}
          onDrawPoint={(point) => setPolygon((points) => [...points, point])}
        />

        <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
          {drawing ? (
            <div className="glass flex flex-col gap-2 rounded-tile p-2.5">
              <span className="max-w-[220px] px-1 text-12 text-ink-2">{t("map.drawHint")}</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={finishDrawing} disabled={polygon.length < MIN_POLYGON_POINTS}>
                  <Check size={16} aria-hidden="true" />
                  {t("map.finish")}
                </Button>
                <Button size="sm" variant="secondary" onClick={clearArea}>
                  <X size={16} aria-hidden="true" />
                  {t("map.cancel")}
                </Button>
              </div>
            </div>
          ) : hasArea ? (
            <Button size="sm" variant="glass" onClick={clearArea}>
              <Eraser size={16} aria-hidden="true" />
              {t("map.clearArea")}
            </Button>
          ) : (
            <Button size="sm" variant="glass" onClick={startDrawing}>
              <Pencil size={16} aria-hidden="true" />
              {t("map.draw")}
            </Button>
          )}
        </div>

        <div className="glass absolute right-3 bottom-8 left-3 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-card px-5 py-3 sm:right-auto">
          <div className="flex flex-col">
            <span className="text-12 text-muted">{t("map.avgPerSqm")}</span>
            <span className="serif text-22 leading-tight font-medium">{avgPerSqm ? formatPricePerSqm(avgPerSqm) : "–"}</span>
          </div>
          {hasArea ? (
            <div className="flex flex-col">
              <span className="text-12 text-muted">{t("map.drawnArea")}</span>
              <span className="serif text-22 leading-tight font-medium">{t("map.propertiesCount", { count: visible.length })}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
