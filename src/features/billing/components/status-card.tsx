import { getTranslations } from "next-intl/server";
import { activeListingLimit } from "@/config/plans";
import type { AppContext } from "@/lib/auth/session";
import { calendarDaysBetween, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { cancelSubscription } from "../actions";
import type { BillingOverview } from "../queries";

/** A jelenlegi csomag állapota: próbaidő, következő számlázás, lemondás, aktív ingatlan limit. */
export async function StatusCard({ ctx, overview, mock }: { ctx: AppContext; overview: BillingOverview; mock: boolean }) {
  const t = await getTranslations("billing.status");
  const tp = await getTranslations("plans");
  const org = ctx.organization;
  const isTrial = ctx.effectivePlan !== org.plan;
  const trialDays = org.trialEndsAt ? Math.max(0, calendarDaysBetween(new Date(), org.trialEndsAt)) : 0;
  const sub = overview.subscription;
  const limit = activeListingLimit(org.plan);
  const overLimit = limit !== null && overview.activeListings > limit;

  return (
    <Card className="flex flex-col gap-4 p-5" data-testid="billing-status">
      <CardHeader
        title={t("title")}
        as="h2"
        adornment={<Badge tone={isTrial ? "ai" : "primary"}>{isTrial ? t("trial", { plan: tp(ctx.effectivePlan), count: trialDays }) : t("active", { plan: tp(org.plan) })}</Badge>}
      />
      {isTrial ? <p className="text-13 text-ink-3">{t("trialEnd")}</p> : null}
      {sub?.cancelAtPeriodEnd && sub.periodEnd ? (
        <p className="text-13 text-warning-text">{t("canceling", { date: formatDate(sub.periodEnd) })}</p>
      ) : sub?.periodEnd ? (
        <p className="text-13 text-ink-3">{t("renews", { date: formatDate(sub.periodEnd) })}</p>
      ) : null}

      {limit !== null ? (
        <div className="flex flex-col gap-2">
          <span className="text-13 font-semibold">{t("limitUsed", { used: overview.activeListings, limit })}</span>
          <ProgressBar value={Math.min(100, (overview.activeListings / limit) * 100)} label={t("limitUsed", { used: overview.activeListings, limit })} />
          {overLimit ? <p className="text-12 text-warning-text">{t("limitOver", { limit })}</p> : null}
        </div>
      ) : null}

      {mock ? <p className="rounded-tile bg-surface-sunken p-3 text-12 text-ink-3">{t("mockNotice")}</p> : null}

      {sub && !sub.cancelAtPeriodEnd && ctx.role === "owner" ? (
        <details className="text-13">
          <summary className="cursor-pointer font-semibold text-muted hover:text-ink">{t("cancel")}</summary>
          <form action={cancelSubscription} className="mt-3 flex flex-col gap-3">
            <p className="text-ink-3">{t("cancelConfirm")}</p>
            <div>
              <Button type="submit" variant="danger" size="sm">
                {t("cancelYes")}
              </Button>
            </div>
          </form>
        </details>
      ) : null}
    </Card>
  );
}
