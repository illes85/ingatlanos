import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { STAGES_BY_SIDE } from "@/config/pipeline";
import { getOwnerOptions } from "@/features/contacts/queries";
import { DealForm } from "@/features/deals/components/deal-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("deals.form");
  return { title: t("titleNew") };
}

export default async function NewDealPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireAppContext();
  if (ctx.role === "assistant") notFound();
  const params = await searchParams;
  const side = params.oldal === "vevo" ? "buyer" : "seller";
  const supabase = await createClient();

  const propertyQuery = supabase.from("properties").select("id, code, title").eq("organization_id", ctx.organization.id).order("code").limit(300);
  const [t, properties, contacts, agents] = await Promise.all([
    getTranslations("deals.form"),
    // Eladói ügyletnél csak a szerkeszthető ingatlanok jönnek szóba; az adatbázis ezt is ellenőrzi.
    side === "seller" && ctx.role === "agent" ? propertyQuery.eq("responsible_agent_id", ctx.userId) : propertyQuery,
    supabase.from("contacts").select("id, full_name, company").eq("organization_id", ctx.organization.id).is("deleted_at", null).is("anonymized_at", null).order("full_name").limit(500),
    ctx.role === "owner" ? getOwnerOptions(ctx) : Promise.resolve(null),
  ]);

  const stages = STAGES_BY_SIDE[side];
  return (
    <div className="flex max-w-[760px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="serif text-34 leading-tight font-medium">{t("titleNew")}</h1>
        <p className="text-15 text-muted">{side === "seller" ? t("subtitleSeller") : t("subtitleBuyer")}</p>
      </header>
      <DealForm
        mode="create"
        side={side}
        stages={stages}
        defaults={{ stage: stages[0]!, propertyId: "", contactId: "", agentId: ctx.userId, title: "", expectedValueM: "", probability: "", expectedCloseDate: "", notes: "" }}
        properties={(properties.data ?? []).map((p) => ({ id: p.id, label: `${p.code} · ${p.title ?? ""}` }))}
        contacts={(contacts.data ?? []).map((c) => ({ id: c.id, label: c.full_name || c.company || "–" }))}
        agents={agents}
        cancelHref={`/ugyletek${side === "buyer" ? "?oldal=vevo" : ""}`}
      />
    </div>
  );
}
