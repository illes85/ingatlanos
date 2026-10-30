import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type MemberRole = "owner" | "agent" | "assistant";
export type PlanTier = "start" | "pro" | "pro_ai" | "office";

export interface AppContext {
  userId: string;
  email: string | null;
  fullName: string;
  monthlyCommissionGoal: number | null;
  organization: {
    id: string;
    name: string;
    type: "individual" | "office";
    plan: PlanTier;
    trialPlan: PlanTier | null;
    trialEndsAt: string | null;
    aiCreditBalance: number;
    aiCreditMonthly: number;
    /** Vásárolt kredit: nem jár le (D-038). */
    aiCreditPurchased: number;
    isDemo: boolean;
  };
  role: MemberRole;
  /** A próbaidő alatt a próbacsomag, egyébként az előfizetett csomag. */
  effectivePlan: PlanTier;
}

/**
 * A bejelentkezett felhasználó + aktív szervezet + szerepkör. Kérésenként egyszer fut (React cache).
 * Visszatérési érték null, ha nincs bejelentkezve; 'no-org', ha még nincs szervezete; 'stale', ha a munkamenet törölt felhasználóé.
 */
export const getAppContext = cache(async (): Promise<AppContext | null | "no-org" | "stale"> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, active_organization_id")
    .eq("id", userId)
    .single();

  // A JWT törölt felhasználónál is érvényes marad (pl. seed újrafuttatása után): profil nélkül elavult a munkamenet.
  if (!profile) return "stale";

  // A kollégák jutalékcélja nem olvasható; a sajátot külön függvény adja.
  const { data: goal } = await supabase.rpc("my_commission_goal");

  const { data: memberships } = await supabase
    .from("memberships")
    .select(
      "role, organization:organizations (id, name, type, plan, trial_plan, trial_ends_at, ai_credit_balance, ai_credit_monthly, ai_credit_purchased, is_demo)",
    )
    .eq("user_id", userId)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) return "no-org";

  const active = memberships.find((m) => m.organization?.id === profile?.active_organization_id) ?? memberships[0];
  let org = active.organization;
  if (!org) return "no-org";

  // Lusta havi kredit-jóváírás és lejárt próba/mock időszak lezárása (D-038). Csak szerveroldali függvény végzi;
  // ha történt változás, a friss értékeket az RLS alatt olvassuk újra.
  if (await settleBilling(org.id)) {
    const { data: fresh } = await supabase
      .from("organizations")
      .select("id, name, type, plan, trial_plan, trial_ends_at, ai_credit_balance, ai_credit_monthly, ai_credit_purchased, is_demo")
      .eq("id", org.id)
      .single();
    if (fresh) org = fresh;
  }
  const trialActive = Boolean(org.trial_plan && org.trial_ends_at && new Date(org.trial_ends_at) > new Date());

  return {
    userId,
    email: profile?.email ?? null,
    fullName: profile?.full_name ?? "",
    monthlyCommissionGoal: goal === null || goal === undefined ? null : Number(goal),
    organization: {
      id: org.id,
      name: org.name,
      type: org.type,
      plan: org.plan,
      trialPlan: org.trial_plan,
      trialEndsAt: org.trial_ends_at,
      aiCreditBalance: org.ai_credit_balance,
      aiCreditMonthly: org.ai_credit_monthly,
      aiCreditPurchased: org.ai_credit_purchased,
      isDemo: org.is_demo,
    },
    role: active.role,
    effectivePlan: trialActive && org.trial_plan ? org.trial_plan : org.plan,
  };
});

/** Esedékes időszakzárás kérése a szervertől. Hiba esetén (pl. nincs service-kulcs) az oldal enélkül is működik. */
async function settleBilling(organizationId: string): Promise<boolean> {
  try {
    const { data } = await createAdminClient().rpc("grant_monthly_credits_if_due", { p_org: organizationId });
    return data === true;
  } catch {
    return false;
  }
}

/** Védett oldalakhoz: bejelentkezés és szervezet nélkül átirányít. */
export async function requireAppContext(): Promise<AppContext> {
  const ctx = await getAppContext();
  if (ctx === null) redirect("/belepes");
  if (ctx === "stale") redirect("/auth/kilepes");
  if (ctx === "no-org") redirect("/szervezet-letrehozasa");
  return ctx;
}
