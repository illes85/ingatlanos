"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { requestShowingFeedback, saveShowingFeedback, setShowingStatus, type ShowingStatus } from "../actions";

interface ShowingActionsProps {
  showingId: string;
  status: ShowingStatus;
  feedbackRequested: boolean;
  rating: number | null;
  feedbackText: string;
}

/** Állapotváltó gombok, visszajelzés-kérés és a vevő visszajelzésének rögzítése. */
export function ShowingActions({ showingId, status, feedbackRequested, rating: initialRating, feedbackText }: ShowingActionsProps) {
  const t = useTranslations("showings.detail");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState<number | null>(initialRating);
  const [text, setText] = useState(feedbackText);

  const run = (action: () => Promise<{ ok: boolean }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(t("toast.failed"));
        return;
      }
      toast.success(success);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {status === "scheduled" ? (
          <>
            <Button disabled={pending} onClick={() => run(() => setShowingStatus(showingId, "completed"), t("toast.completed"))}>
              {t("actions.completed")}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => run(() => setShowingStatus(showingId, "no_show"), t("toast.no_show"))}>
              {t("actions.no_show")}
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                if (window.confirm(t("confirmCancel"))) run(() => setShowingStatus(showingId, "cancelled"), t("toast.cancelled"));
              }}
            >
              {t("actions.cancelled")}
            </Button>
          </>
        ) : (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => setShowingStatus(showingId, "scheduled"), t("toast.scheduled"))}>
            {t("actions.scheduled")}
          </Button>
        )}
        {status === "completed" && !feedbackRequested ? (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => requestShowingFeedback(showingId), t("toast.feedbackRequested"))}>
            {t("actions.requestFeedback")}
          </Button>
        ) : null}
      </div>

      {status === "completed" ? (
        <section className="flex flex-col gap-3" aria-labelledby="feedback-heading">
          <h2 id="feedback-heading" className="serif text-22 font-medium">
            {t("feedback.title")}
          </h2>
          <div role="radiogroup" aria-label={t("feedback.rating")} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={t("feedback.stars", { count: n })}
                onClick={() => setRating(rating === n ? null : n)}
                className="flex size-10 items-center justify-center rounded-control hover:bg-surface-muted"
              >
                <Star size={24} className={cn(rating !== null && n <= rating ? "fill-accent text-accent" : "text-line-strong")} aria-hidden="true" />
              </button>
            ))}
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t("feedback.placeholder")} aria-label={t("feedback.text")} />
          <div>
            <Button variant="secondary" disabled={pending} onClick={() => run(() => saveShowingFeedback(showingId, rating, text), t("toast.feedbackSaved"))}>
              {t("feedback.save")}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
