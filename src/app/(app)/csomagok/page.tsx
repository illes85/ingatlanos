import { getTranslations } from "next-intl/server";
import { FEATURES, minimumPlanFor, type Feature } from "@/config/plans";
import { requireAppContext } from "@/lib/auth/session";
import { getBilling } from "@/lib/billing";
import { getBillingOverview } from "@/features/billing/queries";
import { PricingGrid } from "@/features/billing/components/pricing-grid";
import { StatusCard } from "@/features/billing/components/status-card";
import { CreditPanel } from "@/features/billing/components/credit-panel";

type SearchParams = Promise<{ fizetes?: string; funkcio?: string }>;

const RESULT_KEY = { sikeres: "success", megszakitva: "cancelled", hiba: "error", kredit: "creditsAdded", lemondva: "canceled" } as const;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { fizetes, funkcio } = await searchParams;
  const ctx = await requireAppContext();
  const t = await getTranslations("billing");
  const overview = await getBillingOverview(ctx);
  const mock = getBilling().mode === "mock";
  const wanted = (FEATURES as readonly string[]).includes(funkcio ?? "") ? minimumPlanFor(funkcio as Feature) : undefined;
  const resultKey = fizetes && fizetes in RESULT_KEY ? RESULT_KEY[fizetes as keyof typeof RESULT_KEY] : null;

  return (
    <div className="flex flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="serif text-34 font-medium">{t("title")}</h1>
        <p className="max-w-2xl text-14 text-ink-3">{t("lead")}</p>
      </header>

      {resultKey ? (
        <p role="status" className="rounded-tile bg-surface-sunken p-3 text-13 font-semibold" data-testid="billing-result">
          {t(`result.${resultKey}`)}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <StatusCard ctx={ctx} overview={overview} mock={mock} />
        <CreditPanel ctx={ctx} overview={overview} />
      </div>

      <PricingGrid currentPlan={ctx.organization.plan} canManage={ctx.role === "owner"} highlight={wanted} />
    </div>
  );
}
