"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";

/** Barátságos magyar hibaállapot az alkalmazáson belül — soha nyers stack trace. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <ErrorState
        title={t("errors.title")}
        description={t("errors.body")}
        action={
          <Button variant="secondary" onClick={reset}>
            {t("common.retry")}
          </Button>
        }
      />
    </div>
  );
}
