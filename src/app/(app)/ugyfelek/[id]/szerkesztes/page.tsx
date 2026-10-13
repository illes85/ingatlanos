import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { getContactDetail } from "@/features/contacts/detail-queries";
import { getOwnerOptions } from "@/features/contacts/queries";
import { ContactForm, type ContactFormValues } from "@/features/contacts/components/contact-form";
import { ProfilesEditor } from "@/features/contacts/components/profiles-editor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contacts.form");
  return { title: t("titleEdit") };
}

/** Ügyfél szerkesztése: keresési profilok kezelése felül, a személyes adatok űrlapja alatta. */
export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppContext();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [detail, t, owners] = await Promise.all([
    getContactDetail(ctx, id),
    getTranslations("contacts.form"),
    ctx.role === "agent" ? Promise.resolve(null) : getOwnerOptions(ctx),
  ]);
  if (!detail) notFound();
  const c = detail.contact;

  const defaults: ContactFormValues = {
    lastName: c.last_name,
    firstName: c.first_name,
    company: c.company ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    postalAddress: c.postal_address ?? "",
    roles: c.roles,
    source: c.source ?? "",
    sourceDetail: c.source_detail ?? "",
    tags: c.tags.join(", "),
    notes: c.notes ?? "",
    ownerAgentId: c.owner_agent_id ?? "",
    gdprConsent: c.gdpr_consent_at !== null,
  };

  return (
    <div className="flex max-w-[900px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="serif text-34 leading-tight font-medium">{c.full_name || c.company}</h1>
        <p className="text-15 text-muted">{t("titleEdit")}</p>
      </header>
      <ProfilesEditor contactId={id} profiles={detail.rawProfiles} financingOptions={detail.financingOptions} />
      <ContactForm mode="edit" contactId={id} defaults={defaults} owners={owners} />
    </div>
  );
}
