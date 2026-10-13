"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { InverseCard } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { useShell } from "./shell-context";

/** Csomag/kredit kártya az oldalsáv alján (sötét, AI-átmenetes kreditsávval). */
export function PlanCard() {
  const t = useTranslations();
  const { plan } = useShell().data;
  const planName = t(`plans.${plan.tier}`);
  const pct = plan.creditTotal > 0 ? (plan.creditBalance / plan.creditTotal) * 100 : 0;

  return (
    <InverseCard className="flex flex-col gap-2.5 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-13 font-bold">
          {plan.isTrial ? t("shell.planTrial", { plan: planName }) : t("shell.planActive", { plan: planName })}
        </span>
        {plan.isTrial ? (
          <span className="text-12 text-inverse-muted">{t("shell.trialDaysLeft", { count: plan.trialDaysLeft })}</span>
        ) : null}
      </div>
      <div className="text-12 text-inverse-muted">
        {t("shell.aiCredits", { balance: plan.creditBalance, total: plan.creditTotal })}
      </div>
      <ProgressBar value={pct} fill="ai-inverse" track="inverse" label={t("shell.aiCredits", { balance: plan.creditBalance, total: plan.creditTotal })} />
      <Link
        href="/csomagok"
        className="mt-1 flex h-10 items-center justify-center rounded-control bg-white text-13 font-bold text-[#16181D] transition-opacity hover:opacity-90"
      >
        {t("shell.choosePlan")}
      </Link>
    </InverseCard>
  );
}
