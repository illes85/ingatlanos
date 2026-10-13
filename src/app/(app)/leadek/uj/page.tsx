import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LeadForm } from "@/features/leads/components/lead-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leads.form");
  return { title: t("title") };
}

export default async function NewLeadPage() {
  const ctx = await requireAppContext();
  const supabase = await createClient();
  const [t, { data }] = await Promise.all([
    getTranslations("leads.form"),
    supabase
      .from("properties")
      .select("id, code, title")
      .eq("organization_id", ctx.organization.id)
      .in("status", ["active", "under_offer", "reserved"])
      .order("code")
      .limit(200),
  ]);
  const properties = (data ?? []).map((p) => ({ id: p.id, label: `${p.code} · ${p.title ?? ""}` }));

  return (
    <div className="flex max-w-[760px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="serif text-34 leading-tight font-medium">{t("title")}</h1>
        <p className="text-15 text-muted">{t("subtitle")}</p>
      </header>
      <LeadForm properties={properties} />
    </div>
  );
}
