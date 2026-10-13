"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { publicEnv } from "@/lib/env";
import { boundsOf, type Bounds, type LngLat } from "@/lib/geo";
import { cn } from "@/lib/utils";

export interface MapMarker {
  id: string;
  position: LngLat;
  /** Rövid árcímke (pl. „94,5 M”). */
  label: string;
  description: string;
}

interface PropertiesMapProps {
  markers: MapMarker[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string) => void;
  onBoundsChange: (bounds: Bounds) => void;
  /** A rajzolt terület csúcsai (nyitott lánc); rajzolás közben bővül. */
  polygon: LngLat[];
  drawing: boolean;
  onDrawPoint: (point: LngLat) => void;
  className?: string;
}

const HUNGARY_CENTER: LngLat = [19.5, 47.2];
const PILL = "cursor-pointer rounded-full border-0 bg-surface px-3 py-1.5 text-13 font-bold text-ink shadow-popover transition-transform duration-150 hover:scale-105";
const PILL_ACTIVE = "bg-primary text-on-primary scale-110";

/** Egy jelölő kinézete: a kiválasztott és a fölé húzott ingatlan kiemelt.  */
function styleMarker(entry: { marker: Marker; element: HTMLButtonElement }, active: boolean) {
  entry.element.className = cn(PILL, active && PILL_ACTIVE);
  entry.marker.getElement().style.zIndex = active ? "10" : "";
}

/** MapLibre-térkép árcímkés jelölőkkel. A csempék forrása és a mód (rajzolás) kívülről vezérelt. */
export function PropertiesMap({ markers, selectedId, hoverId, onSelect, onBoundsChange, polygon, drawing, onDrawPoint, className }: PropertiesMapProps) {
  const t = useTranslations("properties.map");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef(new Map<string, { marker: Marker; element: HTMLButtonElement }>());
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);

  // A visszahívások mindig a legfrissebb változatot érjék el anélkül, hogy a térképet újra kellene építeni.
  const callbacks = useRef({ onSelect, onBoundsChange, onDrawPoint, drawing });
  useEffect(() => {
    callbacks.current = { onSelect, onBoundsChange, onDrawPoint, drawing };
  });

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    const markerMap = markerRefs.current;
    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !containerRef.current) return;
      maplibreRef.current = maplibre;
      // A háttérszál statikus fájlként érkezik (scripts/dev/copy-maplibre-worker.mjs), mert a Turbopack nem csomagolja be.
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new maplibre.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            base: { type: "raster", tiles: [publicEnv.mapTileUrl], tileSize: 256, attribution: publicEnv.mapAttribution, maxzoom: 19 },
          },
          layers: [{ id: "base", type: "raster", source: "base" }],
        },
        center: HUNGARY_CENTER,
        zoom: 7,
        attributionControl: { compact: true },
        locale: { "NavigationControl.ZoomIn": t("zoomIn"), "NavigationControl.ZoomOut": t("zoomOut") },
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      // A jelölők és a rajzolt terület rétege akkor készül el, amint a stílus kész (nem a csempék megérkezésére
      // várunk: a `load` lassú hálózaton sokára jönne). A stílus betöltése nem mindig eseményre történik, ezért
      // több eseményen és azonnal is megpróbáljuk; amíg nem sikerül, az addSource kivételt dob.
      let initialized = false;
      const initialize = () => {
        if (initialized || !map) return;
        try {
          map.addSource("area", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        } catch {
          return;
        }
        initialized = true;
        map.addLayer({ id: "area-fill", type: "fill", source: "area", paint: { "fill-color": "#1f5c4a", "fill-opacity": 0.14 } });
        map.addLayer({ id: "area-line", type: "line", source: "area", paint: { "line-color": "#1f5c4a", "line-width": 2.5, "line-dasharray": [2, 2] } });
        mapRef.current = map;
        setReady(true);
      };
      map.on("style.load", initialize);
      map.on("styledata", initialize);
      map.on("load", initialize);
      initialize();
      map.on("moveend", () => {
        const b = map!.getBounds();
        callbacks.current.onBoundsChange({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() });
      });
      map.on("click", (event) => {
        if (callbacks.current.drawing) callbacks.current.onDrawPoint([event.lngLat.lng, event.lngLat.lat]);
      });
    });

    return () => {
      cancelled = true;
      markerMap.clear();
      mapRef.current = null;
      setReady(false);
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a térképet csak egyszer építjük fel
  }, []);

  // Jelölők: az ingatlanlista változásakor újraépítjük, és a térképet a találatokra igazítjuk.
  const markerKey = markers.map((m) => m.id).join();
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!ready || !map || !maplibre) return;
    for (const { marker } of markerRefs.current.values()) marker.remove();
    markerRefs.current.clear();

    for (const m of markers) {
      // A tartóelem a MapLibre-é (az ő osztályát és pozícionálását nem írjuk felül), az árcímke a benne lévő gomb.
      const container = document.createElement("div");
      const element = document.createElement("button");
      element.type = "button";
      element.className = PILL;
      element.textContent = m.label;
      element.setAttribute("aria-label", t("markerLabel", { price: m.label, address: m.description }));
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        callbacks.current.onSelect(m.id);
      });
      container.appendChild(element);
      const marker = new maplibre.Marker({ element: container }).setLngLat(m.position).addTo(map);
      markerRefs.current.set(m.id, { marker, element });
    }

    const bounds = boundsOf(markers.map((m) => m.position));
    if (bounds) {
      map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 70, maxZoom: 14, duration: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a markerKey a markers tartalmának ujjlenyomata
  }, [ready, markerKey]);

  // Kiemelés: a kiválasztott és a listában fölé húzott ingatlan jelölője.
  useEffect(() => {
    for (const [id, entry] of markerRefs.current) styleMarker(entry, id === selectedId || id === hoverId);
  }, [selectedId, hoverId, ready, markerKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const source = map.getSource("area") as GeoJSONSource | undefined;
    const ring = polygon.length >= 3 ? [...polygon, polygon[0]!] : polygon;
    source?.setData({
      type: "FeatureCollection",
      features:
        polygon.length >= 3
          ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } }]
          : polygon.length === 2
            ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: polygon } }]
            : [],
    });
  }, [polygon, ready]);

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = drawing ? "crosshair" : "";
  }, [drawing, ready]);

  return <div ref={containerRef} role="region" aria-label={t("label")} className={cn("h-full w-full overflow-hidden rounded-card bg-surface-sunken", className)} />;
}
