import { getTranslations } from "next-intl/server";
import { CREDIT_PACKS, quoteCreditPack } from "@/config/plans";
import type { AppContext } from "@/lib/auth/session";
import { formatDate, formatHuf, formatInteger } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { buyCredits } from "../actions";
import type { BillingOverview } from "../queries";

/** Kreditegyenleg két zsebben (havi + vásárolt), vásárlás és a kreditmozgások naplója. */
export async function CreditPanel({ ctx, overview }: { ctx: AppContext; overview: BillingOverview }) {
  const t = await getTranslations("billing.credits");
  const org = ctx.organization;
  const isTrial = ctx.effectivePlan !== org.plan;
  const monthlyTotal = isTrial ? 400 : org.aiCreditMonthly;
  const isOwner = ctx.role === "owner";
  const knownReasons = ["opening_balance", "trial_grant", "trial_expire", "monthly_grant", "monthly_expire", "plan_change_grant", "plan_change_expire", "purchase", "purchase_refund", "adjustment", "ai_usage", "ai_refund"] as const;
  type Reason = (typeof knownReasons)[number];

  return (
    <Card className="flex flex-col gap-5 p-5" data-testid="credit-panel">
      <CardHeader title={t("title")} as="h2" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-12 font-bold text-muted">{t("monthly")}</span>
          <span className="text-28 font-bold" data-testid="credits-monthly">
            {formatInteger(org.aiCreditBalance)} <span className="text-14 font-normal text-muted">/ {formatInteger(monthlyTotal)}</span>
          </span>
          <ProgressBar value={monthlyTotal > 0 ? (org.aiCreditBalance / monthlyTotal) * 100 : 0} fill="ai" label={t("monthly")} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-12 font-bold text-muted">{t("purchased")}</span>
          <span className="text-28 font-bold" data-testid="credits-purchased">
            {formatInteger(org.aiCreditPurchased)}
          </span>
        </div>
      </div>
      <p className="text-12 text-muted">{t("monthlyHint")}</p>

      {isOwner ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-14 font-bold">{t("buy")}</h3>
          <div className="flex flex-wrap gap-3">
            {CREDIT_PACKS.map((pack) => (
              <form key={pack.id} action={buyCredits} className="flex min-w-[180px] flex-1 flex-col gap-2 rounded-tile border border-line p-4">
                <input type="hidden" name="pack" value={pack.id} />
                <span className="text-16 font-bold">{t("pack", { credits: formatInteger(pack.credits) })}</span>
                <span className="text-12 text-muted">{t("packPrice", { net: formatHuf(quoteCreditPack(pack.netPrice).net) })}</span>
                <Button type="submit" variant="ai-soft" size="sm">
                  {t("buyCta")}
                </Button>
              </form>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-14 font-bold">{t("history")}</h3>
        {!isOwner ? (
          <p className="text-13 text-muted">{t("ownerOnlyHistory")}</p>
        ) : overview.ledger.length === 0 ? (
          <p className="text-13 text-muted">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-line text-13" data-testid="credit-ledger">
            {overview.ledger.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {(knownReasons as readonly string[]).includes(row.reason) ? t(`reason.${row.reason as Reason}`) : row.reason}
                  <span className="ml-2 text-12 text-muted">{formatDate(row.createdAt)}</span>
                </span>
                <span className={row.delta < 0 ? "font-semibold text-ink-2" : "font-semibold text-accent-text"}>
                  {row.delta > 0 ? "+" : ""}
                  {formatInteger(row.delta)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
