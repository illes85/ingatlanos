import { getTranslations } from "next-intl/server";
import { featureMessageKey, minimumPlanFor, type Feature } from "@/config/plans";
import { LockedFeature } from "@/components/ai/ai";
import { hasFeature } from "@/lib/auth/entitlements";
import { requireAppContext } from "@/lib/auth/session";

/**
 * Funkciókapu (spec 4/2): a jogosult csomagnál a tartalmat, egyébként a zárolt funkció elmosott
 * előnézetét mutatja egykattintásos csomagváltással. A döntés a szerveren, az adatbázisból olvasott csomag alapján születik.
 * A tartalom adatát a szerveroldali műveleteknek is külön védeni kell (`requireFeature` / `assertFeature`).
 */
export async function FeatureGate({
  feature,
  preview,
  children,
  className,
}: {
  feature: Feature;
  /** A valódi felület elmosott, adat nélküli előnézete. */
  preview: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = await requireAppContext();
  if (hasFeature(ctx, feature)) return <>{children}</>;

  const t = await getTranslations();
  const key = featureMessageKey(feature);
  const required = minimumPlanFor(feature);
  const planName = t(`plans.${required}`);
  return (
    <LockedFeature
      className={className}
      preview={preview}
      planLabel={planName.toUpperCase()}
      title={t(`features.${key}`)}
      body={t("gate.body", { feature: t(`features.${key}`), plan: planName })}
      ctaLabel={t("gate.cta")}
      ctaHref={`/csomagok?funkcio=${encodeURIComponent(feature)}`}
    />
  );
}
