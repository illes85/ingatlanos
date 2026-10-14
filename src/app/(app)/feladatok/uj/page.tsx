import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { getOwnerOptions } from "@/features/contacts/queries";
import { getContactOptions, getPropertyOptions } from "@/lib/options";
import { TaskForm } from "@/features/tasks/components/task-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tasks.form");
  return { title: t("titleNew") };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireAppContext();
  const params = await searchParams;
  const [t, properties, contacts, assignees] = await Promise.all([
    getTranslations("tasks.form"),
    getPropertyOptions(ctx),
    getContactOptions(ctx),
    ctx.role === "agent" ? Promise.resolve(null) : getOwnerOptions(ctx),
  ]);
  // Az ügyfél- vagy ingatlan-adatlapról indított feladat már előre kitöltve nyílik meg.
  const propertyId = first(params.ingatlan);
  const contactId = first(params.ugyfel);

  return (
    <div className="flex max-w-[760px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="serif text-34 leading-tight font-medium">{t("titleNew")}</h1>
        <p className="text-15 text-muted">{t("subtitle")}</p>
      </header>
      <TaskForm
        defaults={{
          propertyId: UUID.test(propertyId) && properties.some((p) => p.id === propertyId) ? propertyId : "",
          contactId: UUID.test(contactId) && contacts.some((c) => c.id === contactId) ? contactId : "",
          assigneeId: ctx.userId,
        }}
        properties={properties}
        contacts={contacts}
        // Az asszisztens saját magának is felvehet feladatot, bár nem szerepel az ügynök-választóban.
        assignees={assignees && ctx.role === "assistant" ? [{ id: ctx.userId, name: ctx.fullName }, ...assignees] : assignees}
      />
    </div>
  );
}
