import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    isDemo: boolean;
  };
  role: MemberRole;
  /** A próbaidő alatt a próbacsomag, egyébként az előfizetett csomag. */
  effectivePlan: PlanTier;
}

/**
 * A bejelentkezett felhasználó + aktív szervezet + szerepkör. Kérésenként egyszer fut (React cache).
 * Visszatérési érték null, ha nincs bejelentkezve; 'no-org', ha még nincs szervezete.
 */
export const getAppContext = cache(async (): Promise<AppContext | null | "no-org"> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, monthly_commission_goal, active_organization_id")
    .eq("id", userId)
    .single();

  const { data: memberships } = await supabase
    .from("memberships")
    .select(
      "role, organization:organizations (id, name, type, plan, trial_plan, trial_ends_at, ai_credit_balance, ai_credit_monthly, is_demo)",
    )
    .eq("user_id", userId)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) return "no-org";

  const active = memberships.find((m) => m.organization?.id === profile?.active_organization_id) ?? memberships[0];
  const org = active.organization;
  if (!org) return "no-org";
  const trialActive = Boolean(org.trial_plan && org.trial_ends_at && new Date(org.trial_ends_at) > new Date());

  return {
    userId,
    email: profile?.email ?? null,
    fullName: profile?.full_name ?? "",
    monthlyCommissionGoal: profile?.monthly_commission_goal ?? null,
    organization: {
      id: org.id,
      name: org.name,
      type: org.type,
      plan: org.plan,
      trialPlan: org.trial_plan,
      trialEndsAt: org.trial_ends_at,
      aiCreditBalance: org.ai_credit_balance,
      aiCreditMonthly: org.ai_credit_monthly,
      isDemo: org.is_demo,
    },
    role: active.role,
    effectivePlan: trialActive && org.trial_plan ? org.trial_plan : org.plan,
  };
});

/** Védett oldalakhoz: bejelentkezés és szervezet nélkül átirányít. */
export async function requireAppContext(): Promise<AppContext> {
  const ctx = await getAppContext();
  if (ctx === null) redirect("/belepes");
  if (ctx === "no-org") redirect("/szervezet-letrehozasa");
  return ctx;
}
