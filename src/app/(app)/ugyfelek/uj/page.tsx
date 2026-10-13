import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { getOwnerOptions } from "@/features/contacts/queries";
import { ContactForm } from "@/features/contacts/components/contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contacts.form");
  return { title: t("titleNew") };
}

export default async function NewContactPage() {
  const ctx = await requireAppContext();
  const [t, owners] = await Promise.all([getTranslations("contacts.form"), ctx.role === "agent" ? Promise.resolve(null) : getOwnerOptions(ctx)]);

  return (
    <div className="flex max-w-[900px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="serif text-34 leading-tight font-medium">{t("titleNew")}</h1>
        <p className="text-15 text-muted">{t("subtitleNew")}</p>
      </header>
      <ContactForm mode="create" owners={owners} />
    </div>
  );
}
