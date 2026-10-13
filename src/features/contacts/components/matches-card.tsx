"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AiCard, AiChip } from "@/components/ai/ai";
import { ProgressBar } from "@/components/ui/progress";
import { formatMillions } from "@/lib/format";
import { recordRecommendation } from "../actions";
import type { ContactMatchItem } from "../detail-queries";

/** „Neki passzoló ingatlanok”: a keresési profil és a kínálat egyezése; az ajánlás egy kattintással rögzíthető. */
export function MatchesCard({ contactId, matches }: { contactId: string; matches: ContactMatchItem[] }) {
  const t = useTranslations("contacts.detail.matches");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const send = (propertyId: string) => {
    setBusyId(propertyId);
    startTransition(async () => {
      const result = await recordRecommendation(contactId, propertyId);
      setBusyId(null);
      if (!result.ok) {
        toast.error(t("failed"));
        return;
      }
      toast.success(t("sent"));
      router.refresh();
    });
  };

  return (
    <AiCard className="gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="serif text-22 font-medium">{t("title")}</h2>
        <AiChip size="sm">{t("chip")}</AiChip>
      </div>
      {matches.length === 0 ? (
        <p className="text-14 text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {matches.map((m) => (
            <li key={m.propertyId} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/ingatlanok/${m.propertyId}`} className="min-w-0 truncate text-15 font-bold hover:text-primary">
                  {m.address}
                </Link>
                <span className="serif shrink-0 text-18 font-medium text-primary" aria-label={t("scoreLabel", { score: m.score })}>
                  {m.score}%
                </span>
              </div>
              <ProgressBar value={m.score} label={t("scoreLabel", { score: m.score })} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-13 text-muted">{formatMillions(m.price)}</span>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => send(m.propertyId)}>
                  {busyId === m.propertyId ? "…" : t("send")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AiCard>
  );
}
