"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, ExternalLink, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { regeneratePublicLink, setPublicPage } from "../actions";

interface SharePanelProps {
  propertyId: string;
  enabled: boolean;
  slug: string | null;
  siteUrl: string;
  publishable: boolean;
  /** A pontos cím rejtési szintjének címkéje, hogy a megosztás előtt látszódjon, mi lesz kint. */
  addressLevel: string;
}

/** „Megosztás” gomb és párbeszédablak: a nyilvános oldal be/kikapcsolása és a link másolása. */
export function SharePanel({ propertyId, enabled, slug, siteUrl, publishable, addressLevel }: SharePanelProps) {
  const t = useTranslations("publicPage.share");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isOn, setIsOn] = useState(enabled);
  const [currentSlug, setCurrentSlug] = useState(slug);

  const url = currentSlug ? `${siteUrl.replace(/\/$/, "")}/p/${currentSlug}` : "";

  const toggle = () =>
    startTransition(async () => {
      const result = await setPublicPage(propertyId, !isOn);
      if (!result.ok) {
        toast.error(result.error === "notPublishable" ? t("notPublishable") : t("failed"));
        return;
      }
      setIsOn(!isOn);
      setCurrentSlug(result.slug);
      toast.success(isOn ? t("disabled") : t("enabled"));
      router.refresh();
    });

  const renew = () => {
    if (!window.confirm(t("renewConfirm"))) return;
    startTransition(async () => {
      const result = await regeneratePublicLink(propertyId);
      if (!result.ok) {
        toast.error(t("failed"));
        return;
      }
      setCurrentSlug(result.slug);
      toast.success(t("renewed"));
      router.refresh();
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Share2 size={16} aria-hidden="true" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t("close")}>
        <DialogTitle className="serif text-22 font-medium">{t("title")}</DialogTitle>
        <DialogDescription className="mt-1.5 text-14 text-muted">{t("description")}</DialogDescription>

        <div className="mt-5 flex items-center justify-between gap-4 rounded-card border border-line p-4">
          <span className="text-15 font-semibold">{t("switchLabel")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={isOn}
            aria-label={t("switchLabel")}
            disabled={pending || (!isOn && !publishable)}
            onClick={toggle}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
              isOn ? "bg-primary" : "bg-line-strong",
            )}
          >
            <span className={cn("absolute top-1 size-5 rounded-full bg-white transition-all", isOn ? "left-6" : "left-1")} />
          </button>
        </div>
        {!publishable && !isOn ? <p className="mt-2 text-13 text-muted">{t("notPublishable")}</p> : null}

        {isOn && url ? (
          <div className="mt-4 flex flex-col gap-3">
            <input
              readOnly
              value={url}
              aria-label={t("linkLabel")}
              onFocus={(e) => e.currentTarget.select()}
              className="h-11 w-full rounded-control border border-line bg-surface-sunken px-3.5 text-14 text-ink-2"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={copy}>
                <Copy size={16} aria-hidden="true" />
                {t("copy")}
              </Button>
              <Button variant="secondary" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} aria-hidden="true" />
                  {t("open")}
                </a>
              </Button>
              <Button variant="ghost" onClick={renew} disabled={pending}>
                <RefreshCw size={16} aria-hidden="true" />
                {t("renew")}
              </Button>
            </div>
            <p className="text-13 text-muted">{t("addressNote", { level: addressLevel })}</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
