import "server-only";
import { redirect } from "next/navigation";
import { minimumPlanFor, planHasFeature, type Feature } from "@/config/plans";
import { requireAppContext, type AppContext } from "./session";

/** Az aktuális (próba esetén próba-) csomag tartalmazza-e a funkciót. */
export function hasFeature(ctx: AppContext, feature: Feature): boolean {
  return planHasFeature(ctx.effectivePlan, feature);
}

/**
 * Szerveroldali funkcióőr (spec 4/2): oldalaknál és server actionöknél hívd a művelet előtt.
 * A csomagot a szerver az adatbázisból olvassa, a kliens nem befolyásolhatja.
 * Jogosulatlanul a csomagok oldalra irányít (oldalaknál); `assertFeature` kivételt dob (actionöknél).
 */
export async function requireFeature(feature: Feature): Promise<AppContext> {
  const ctx = await requireAppContext();
  if (!hasFeature(ctx, feature)) redirect(`/csomagok?funkcio=${encodeURIComponent(feature)}`);
  return ctx;
}

export class FeatureLockedError extends Error {
  constructor(
    public readonly feature: Feature,
    public readonly requiredPlan: ReturnType<typeof minimumPlanFor>,
  ) {
    super(`feature_locked:${feature}`);
  }
}

/** Server actionökhöz: kivételt dob a zárolt funkciónál, nem irányít át. */
export async function assertFeature(feature: Feature): Promise<AppContext> {
  const ctx = await requireAppContext();
  if (!hasFeature(ctx, feature)) throw new FeatureLockedError(feature, minimumPlanFor(feature));
  return ctx;
}
