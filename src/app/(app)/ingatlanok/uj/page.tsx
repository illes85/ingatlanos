import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { getAgentOptions } from "@/features/properties/queries";
import { PropertyForm } from "@/features/properties/components/property-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties.form");
  return { title: t("titleNew") };
}

export default async function NewPropertyPage() {
  const ctx = await requireAppContext();
  const [t, agents] = await Promise.all([getTranslations("properties.form"), getAgentOptions(ctx)]);

  return (
    <div className="flex max-w-[1100px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="serif text-34 leading-tight font-medium">{t("titleNew")}</h1>
        <p className="text-15 text-muted">{t("subtitleNew")}</p>
      </header>
      <PropertyForm mode="create" agents={agents} canEditCommission={ctx.role !== "assistant"} />
    </div>
  );
}
