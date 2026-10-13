"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Dialog, DialogTitle } from "@/components/ui/overlay";
import { PropertyPhoto } from "@/components/domain/property-photo";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string | null;
}

interface PropertyGalleryProps {
  photos: GalleryPhoto[];
  propertyId: string;
  propertyType: Database["public"]["Enums"]["property_type"];
  alt: string;
}

const MOSAIC_SLOTS = 5;

/** Mozaik galéria: nagy borítókép + legfeljebb 4 kicsi; kattintásra teljes képernyős nézegető billentyűzetes lapozással. */
export function PropertyGallery({ photos, propertyId, propertyType, alt }: PropertyGalleryProps) {
  const t = useTranslations("properties.detail.gallery");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const shown = photos.slice(0, MOSAIC_SLOTS);
  const hiddenCount = photos.length - shown.length;

  const step = useCallback(
    (delta: number) => setOpenIndex((index) => (index === null ? index : (index + delta + photos.length) % photos.length)),
    [photos.length],
  );

  if (photos.length === 0) {
    return (
      <div className="relative">
        <PropertyPhoto src={null} alt={alt} seed={propertyId} type={propertyType} sizes="100vw" className="h-[280px] rounded-card-lg md:h-[420px]" glyphSize={96} />
        <p className="absolute inset-x-0 bottom-5 text-center text-13 font-semibold text-ink-2">{t("empty")}</p>
      </div>
    );
  }

  const small = shown.slice(1);
  return (
    <>
      <div className="grid h-[280px] grid-cols-4 grid-rows-2 gap-2.5 md:h-[420px] xl:h-[460px]">
        {shown.map((photo, index) => {
          const isCover = index === 0;
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={t("open", { index: index + 1 })}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-card bg-surface-sunken",
                isCover ? (small.length === 0 ? "col-span-4 row-span-2" : "col-span-4 row-span-2 md:col-span-2") : "hidden md:block",
                index === 1 && small.length === 1 && "md:col-span-2 md:row-span-2",
              )}
            >
              <Image
                src={photo.url}
                alt={photo.caption ?? alt}
                fill
                sizes={isCover ? "(min-width: 1024px) 50vw, 100vw" : "25vw"}
                priority={isCover}
                className="object-cover transition-transform duration-[250ms] ease-out group-hover:scale-[1.03]"
              />
              {index === shown.length - 1 && photos.length > 1 ? (
                <span className="absolute right-3 bottom-3 rounded-control bg-white/95 px-3.5 py-2 text-13 font-bold text-ink shadow-chip">
                  {t("all", { count: photos.length })}
                </span>
              ) : null}
            </button>
          );
        })}
        {hiddenCount > 0 ? <span className="sr-only">{t("all", { count: photos.length })}</span> : null}
      </div>

      <Dialog open={openIndex !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") step(1);
              if (event.key === "ArrowLeft") step(-1);
            }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none md:p-10"
          >
            <DialogTitle className="sr-only">{t("lightbox")}</DialogTitle>
            {openIndex !== null ? (
              <>
                <div className="relative h-full w-full max-w-[1200px]">
                  <Image
                    src={photos[openIndex]!.url}
                    alt={photos[openIndex]!.caption ?? alt}
                    fill
                    sizes="100vw"
                    quality={85}
                    className="object-contain"
                  />
                </div>
                <p className="pt-3 text-13 font-semibold text-white/80" aria-live="polite">
                  {t("position", { index: openIndex + 1, total: photos.length })}
                  {photos[openIndex]!.caption ? ` · ${photos[openIndex]!.caption}` : ""}
                </p>
              </>
            ) : null}
            <DialogPrimitive.Close
              aria-label={t("close")}
              className="absolute top-4 right-4 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <X size={20} aria-hidden="true" />
            </DialogPrimitive.Close>
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={t("previous")}
                  className="absolute top-1/2 left-3 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <ChevronLeft size={24} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={t("next")}
                  className="absolute top-1/2 right-3 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <ChevronRight size={24} aria-hidden="true" />
                </button>
              </>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    </>
  );
}
