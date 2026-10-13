"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CONTACT_ROLES } from "../filters";
import { createContact, updateContact, type ContactFormState } from "../actions";
import type { ContactField } from "../schema";

export interface ContactFormValues {
  lastName: string;
  firstName: string;
  company: string;
  email: string;
  phone: string;
  postalAddress: string;
  roles: string[];
  source: string;
  sourceDetail: string;
  tags: string;
  notes: string;
  ownerAgentId: string;
  gdprConsent: boolean;
}

export const EMPTY_CONTACT_VALUES: ContactFormValues = {
  lastName: "", firstName: "", company: "", email: "", phone: "", postalAddress: "", roles: [], source: "", sourceDetail: "", tags: "", notes: "",
  ownerAgentId: "", gdprConsent: false,
};

const SOURCES = ["portal", "website", "facebook", "phone", "referral", "manual", "public_page"] as const;

interface ContactFormProps {
  mode: "create" | "edit";
  contactId?: string;
  defaults?: ContactFormValues;
  /** Csak az owner és az asszisztens választhat felelőst; ügynöknél null. */
  owners: { id: string; name: string }[] | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <h2 className="serif text-22 font-medium">{title}</h2>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

/** Ügyfél felvételi és szerkesztő űrlap; felvételkor a telefon/e-mail alapján duplikátumot jelez. */
export function ContactForm({ mode, contactId, defaults = EMPTY_CONTACT_VALUES, owners }: ContactFormProps) {
  const t = useTranslations("contacts.form");
  const tRoles = useTranslations("enums.contactRole");
  const tSource = useTranslations("enums.leadSource");
  const tCommon = useTranslations("common");
  const action = mode === "create" ? createContact : updateContact.bind(null, contactId ?? "");
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  const err = (field: ContactField) => (state.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined);
  const input = (field: ContactField, label: string, value: string, extra: React.ComponentProps<typeof Input> = {}) => (
    <Field label={label} htmlFor={field} error={err(field)}>
      <Input id={field} name={field} defaultValue={value} aria-invalid={Boolean(err(field))} {...extra} />
    </Field>
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6" noValidate>
      <Section title={t("sections.person")}>
        {input("lastName", t("fields.lastName"), defaults.lastName, { autoComplete: "family-name" })}
        {input("firstName", t("fields.firstName"), defaults.firstName, { autoComplete: "given-name" })}
        {input("company", t("fields.company"), defaults.company)}
        {input("phone", t("fields.phone"), defaults.phone, { type: "tel", inputMode: "tel" })}
        {input("email", t("fields.email"), defaults.email, { type: "email", inputMode: "email" })}
        {input("postalAddress", t("fields.postalAddress"), defaults.postalAddress)}
      </Section>

      {state.duplicates ? (
        <div role="alert" className="flex flex-col gap-3 rounded-card border border-accent-border bg-accent-tint p-5">
          <strong className="text-15 font-bold text-accent-text">{t("duplicate.title")}</strong>
          <ul className="flex flex-col gap-1 text-14">
            {state.duplicates.map((d) => (
              <li key={d.id}>
                <span className="font-semibold">{d.fullName}</span>
                <span className="text-muted">
                  {" · "}
                  {t(`duplicate.${d.match}`)}
                  {d.ownerName ? ` · ${t("duplicate.owner", { name: d.ownerName })}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <Button type="submit" name="ignoreDuplicates" value="1" variant="secondary" size="sm" className="self-start" disabled={pending}>
            {t("duplicate.continue")}
          </Button>
        </div>
      ) : null}

      <Section title={t("sections.relationship")}>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-13 font-semibold">{t("fields.roles")}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {CONTACT_ROLES.map((role) => (
              <label key={role} className="flex h-9 cursor-pointer items-center gap-2.5 text-14 font-medium">
                <input type="checkbox" name="roles" value={role} defaultChecked={defaults.roles.includes(role)} className="size-[18px] accent-[var(--primary)]" />
                {tRoles(role)}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={t("fields.source")} htmlFor="source" error={err("source")}>
          <Select id="source" name="source" defaultValue={defaults.source}>
            <option value="">–</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {tSource(s)}
              </option>
            ))}
          </Select>
        </Field>
        {input("sourceDetail", t("fields.sourceDetail"), defaults.sourceDetail)}
        <div className="sm:col-span-2">
          <Field label={t("fields.tags")} htmlFor="tags" hint={t("fields.tagsHint")} error={err("tags")}>
            <Input id="tags" name="tags" defaultValue={defaults.tags} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t("fields.notes")} htmlFor="notes" error={err("notes")}>
            <Textarea id="notes" name="notes" defaultValue={defaults.notes} rows={4} />
          </Field>
        </div>
      </Section>

      {owners ? (
        <Section title={t("sections.assignment")}>
          <Field label={t("fields.owner")} htmlFor="ownerAgentId" error={err("ownerAgentId")}>
            <Select id="ownerAgentId" name="ownerAgentId" defaultValue={defaults.ownerAgentId}>
              <option value="">–</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        </Section>
      ) : null}

      <Section title={t("sections.gdpr")}>
        <label className="flex cursor-pointer items-start gap-3 text-14 font-semibold sm:col-span-2">
          <input type="checkbox" name="gdprConsent" defaultChecked={defaults.gdprConsent} className="mt-0.5 size-[18px] accent-[var(--primary)]" />
          <span className="flex flex-col gap-1">
            {t("fields.gdprConsent")}
            <span className="text-12 font-normal text-muted">{t("fields.gdprHint")}</span>
          </span>
        </label>
      </Section>

      {state.error ? (
        <p role="alert" className="text-14 font-semibold text-danger-text">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" asChild>
          <Link href={contactId ? `/ugyfelek/${contactId}` : "/ugyfelek"}>{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {mode === "create" ? t("submitNew") : t("submitEdit")}
        </Button>
      </div>
    </form>
  );
}
