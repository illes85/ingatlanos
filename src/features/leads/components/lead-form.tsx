"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createLead, type LeadFormState } from "../actions";
import type { LeadField } from "../schema";

const SOURCES = ["phone", "portal", "website", "facebook", "referral", "manual"] as const;

/** Kézi lead rögzítése: telefonos vagy személyes érdeklődés felvitele. */
export function LeadForm({ properties }: { properties: { id: string; label: string }[] }) {
  const t = useTranslations("leads.form");
  const tSource = useTranslations("enums.leadSource");
  const tCommon = useTranslations("common");
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(createLead, {});

  const err = (field: LeadField) => (state.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-5 p-6">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={t("fullName")} htmlFor="fullName" error={err("fullName")}>
              <Input id="fullName" name="fullName" aria-invalid={Boolean(err("fullName"))} autoComplete="name" />
            </Field>
          </div>
          <Field label={t("phone")} htmlFor="phone" error={err("phone")}>
            <Input id="phone" name="phone" type="tel" inputMode="tel" aria-invalid={Boolean(err("phone"))} />
          </Field>
          <Field label={t("email")} htmlFor="email" error={err("email")}>
            <Input id="email" name="email" type="email" inputMode="email" aria-invalid={Boolean(err("email"))} />
          </Field>
          <Field label={t("source")} htmlFor="source" error={err("source")}>
            <Select id="source" name="source" defaultValue="phone">
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {tSource(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("property")} htmlFor="propertyId" error={err("propertyId")}>
            <Select id="propertyId" name="propertyId" defaultValue="">
              <option value="">–</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("message")} htmlFor="message" error={err("message")}>
              <Textarea id="message" name="message" rows={4} />
            </Field>
          </div>
        </div>
      </Card>
      {state.error ? (
        <p role="alert" className="text-14 font-semibold text-danger-text">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" asChild>
          <Link href="/leadek">{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
