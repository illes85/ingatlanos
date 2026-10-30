"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import {
  FEATURES,
  PAID_PLANS,
  PLAN_FEATURES,
  PLAN_LIMITS,
  PLAN_ORDER,
  PLAN_PRICING,
  featureMessageKey,
  monthlyCreditAllowance,
  quotePlan,
  type BillingInterval,
} from "@/config/plans";
import type { PlanTier } from "@/lib/auth/session";
import { formatHuf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented";
import { startSubscription } from "../actions";

function SubmitButton({ children, variant }: { children: React.ReactNode; variant: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className="w-full">
      {children}
    </Button>
  );
}

export interface PricingGridProps {
  currentPlan: PlanTier;
  canManage: boolean;
  highlight?: PlanTier;
  initialInterval?: BillingInterval;
  initialSeats?: number;
}

/** Csomagok összehasonlítása havi/éves váltóval; az árak a konfigurációból jönnek (nettó + ÁFA = bruttó). */
export function PricingGrid({ currentPlan, canManage, highlight, initialInterval = "month", initialSeats = 3 }: PricingGridProps) {
  const t = useTranslations("billing");
  const tp = useTranslations("plans");
  const tf = useTranslations("features");
  const [interval, setInterval] = React.useState<BillingInterval>(initialInterval);
  const [seats, setSeats] = React.useState(initialSeats);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          label={t("intervalLabel")}
          value={interval}
          onValueChange={setInterval}
          options={[
            { value: "month", label: t("month") },
            {
              value: "year",
              label: (
                <span className="inline-flex items-center gap-2">
                  {t("year")}
                  <Badge tone="accent" size="xs">
                    {t("yearBadge")}
                  </Badge>
                </span>
              ),
            },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((plan) => {
          const quote = quotePlan(plan, interval, seats);
          const isCurrent = plan === currentPlan;
          const paid = (PAID_PLANS as readonly PlanTier[]).includes(plan);
          const features = FEATURES.filter((f) => PLAN_FEATURES[plan].includes(f));
          const listings = PLAN_LIMITS[plan].activeListings;
          return (
            <Card
              key={plan}
              variant={plan === highlight ? "raised" : "default"}
              className={cn("flex flex-col gap-4 p-5", plan === highlight && "ring-2 ring-primary")}
              data-plan={plan}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="serif text-22 font-medium">{tp(plan)}</h3>
                {isCurrent ? (
                  <Badge tone="primary" size="sm">
                    {t("current")}
                  </Badge>
                ) : null}
              </div>
              <p className="text-13 text-ink-3">{t(`plan.${plan}`)}</p>

              <div className="flex flex-col gap-1">
                {paid ? (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-28 font-bold" data-testid={`price-${plan}`}>
                        {formatHuf(quote.netMonthly)}
                      </span>
                      <span className="text-13 text-muted">
                        {t("netLabel")} {t("perMonth")}
                      </span>
                    </div>
                    <span className="text-12 text-muted">
                      {t("vatNote", { gross: formatHuf(quote.grossPeriod), period: t(interval === "year" ? "periodYear" : "periodMonth") })}
                    </span>
                    {interval === "year" ? <span className="text-12 text-muted">{t("billedYearly", { amount: formatHuf(quote.netPeriod) })}</span> : null}
                    {plan === "office" ? (
                      <span className="text-12 text-muted">
                        {t("officeFormula", { platform: formatHuf(PLAN_PRICING.office.monthly), perSeat: formatHuf(PLAN_PRICING.office.perSeat ?? 0) })}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-28 font-bold">{t("free")}</span>
                )}
              </div>

              {plan === "office" ? (
                <label className="flex flex-col gap-1.5 text-13 font-semibold">
                  {t("seats")}
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={seats}
                    onChange={(e) => setSeats(Math.min(200, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))}
                  />
                  <span className="text-12 font-normal text-muted">{t("seatsHint")}</span>
                </label>
              ) : null}

              <ul className="flex flex-1 flex-col gap-1.5 text-13">
                <Line>{listings === null ? t("listingsUnlimited") : t("listings", { count: listings })}</Line>
                <Line>
                  {t(plan === "office" ? "creditsPerSeat" : "creditsPerMonth", {
                    count: plan === "office" ? PLAN_LIMITS.office.aiCreditsMonthly : monthlyCreditAllowance(plan),
                  })}
                </Line>
                <Line>{t("everythingBasic")}</Line>
                {features.map((f) => (
                  <Line key={f}>{tf(featureMessageKey(f))}</Line>
                ))}
              </ul>

              {paid && canManage && !isCurrent ? (
                <form action={startSubscription}>
                  <input type="hidden" name="plan" value={plan} />
                  <input type="hidden" name="interval" value={interval} />
                  <input type="hidden" name="seats" value={plan === "office" ? seats : 1} />
                  <SubmitButton variant={plan === "pro_ai" ? "primary" : "secondary"}>{t("choose")}</SubmitButton>
                </form>
              ) : null}
              {paid && isCurrent && canManage ? (
                <form action={startSubscription}>
                  <input type="hidden" name="plan" value={plan} />
                  <input type="hidden" name="interval" value={interval} />
                  <input type="hidden" name="seats" value={plan === "office" ? seats : 1} />
                  <SubmitButton variant="secondary">{t("update")}</SubmitButton>
                </form>
              ) : null}
            </Card>
          );
        })}
      </div>
      {!canManage ? <p className="text-13 text-muted">{t("ownerOnly")}</p> : null}
    </div>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
