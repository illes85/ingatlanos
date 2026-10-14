import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { budapestDayKey } from "@/lib/format";
import { getOwnerOptions } from "@/features/contacts/queries";
import { getContactOptions, getPropertyOptions } from "@/lib/options";
import { ShowingForm } from "@/features/showings/components/showing-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("showings.form");
  return { title: t("titleNew") };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function NewShowingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireAppContext();
  const params = await searchParams;
  const [t, properties, contacts, agents] = await Promise.all([
    getTranslations("showings.form"),
    getPropertyOptions(ctx),
    getContactOptions(ctx),
    ctx.role === "agent" ? Promise.resolve(null) : getOwnerOptions(ctx),
  ]);
  const propertyId = first(params.ingatlan);
  const contactId = first(params.ugyfel);
  const date = first(params.datum);

  return (
    <div className="flex max-w-[760px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="serif text-34 leading-tight font-medium">{t("titleNew")}</h1>
        <p className="text-15 text-muted">{t("subtitle")}</p>
      </header>
      <ShowingForm
        defaults={{
          propertyId: UUID.test(propertyId) && properties.some((p) => p.id === propertyId) ? propertyId : "",
          contactId: UUID.test(contactId) && contacts.some((c) => c.id === contactId) ? contactId : "",
          agentId: ctx.userId,
          date: DATE.test(date) ? date : budapestDayKey(new Date()),
        }}
        properties={properties}
        contacts={contacts}
        agents={agents}
      />
    </div>
  );
}
