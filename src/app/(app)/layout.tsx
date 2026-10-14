import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { calendarDaysBetween } from "@/lib/format";
import { AppShell } from "@/components/shell/app-shell";
import type { ShellData } from "@/components/shell/shell-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAppContext();
  const supabase = await createClient();

  const [leads, notifications] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organization.id)
      .eq("status", "new"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .is("read_at", null),
  ]);

  const isTrial = ctx.effectivePlan !== ctx.organization.plan;
  const trialDaysLeft = ctx.organization.trialEndsAt
    ? Math.max(0, calendarDaysBetween(new Date(), ctx.organization.trialEndsAt))
    : 0;

  const data: ShellData = {
    user: { id: ctx.userId, name: ctx.fullName, email: ctx.email, role: ctx.role },
    organization: { name: ctx.organization.name, type: ctx.organization.type, isDemo: ctx.organization.isDemo },
    plan: {
      tier: ctx.effectivePlan,
      isTrial,
      trialDaysLeft,
      creditBalance: ctx.organization.aiCreditBalance,
      creditTotal: isTrial ? 400 : ctx.organization.aiCreditMonthly,
    },
    counts: { newLeads: leads.count ?? 0, unreadNotifications: notifications.count ?? 0 },
  };

  return <AppShell data={data}>{children}</AppShell>;
}
