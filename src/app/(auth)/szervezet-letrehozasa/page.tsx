import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAppContext } from "@/lib/auth/session";
import { OrganizationForm } from "./organization-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

export default async function CreateOrganizationPage() {
  const ctx = await getAppContext();
  if (ctx === null) redirect("/belepes");
  if (ctx === "stale") redirect("/auth/kilepes");
  if (ctx !== "no-org") redirect("/ma");

  const t = await getTranslations("onboarding");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="serif text-38 leading-tight font-medium">{t("title")}</h1>
        <p className="text-15 text-muted">{t("subtitle")}</p>
      </div>
      <OrganizationForm />
    </div>
  );
}
