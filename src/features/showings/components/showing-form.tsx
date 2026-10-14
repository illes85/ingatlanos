"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createShowing, type ShowingFormState } from "../actions";
import { DURATIONS, type ShowingField } from "../schema";

interface ShowingFormProps {
  defaults: { propertyId: string; contactId: string; agentId: string; date: string };
  properties: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
  /** Felelőst az owner és az asszisztens választ; az ügynöknél null. */
  agents: { id: string; name: string }[] | null;
}

/** Bemutató gyors-rögzítése: ingatlan, időpont, vevő. */
export function ShowingForm({ defaults, properties, contacts, agents }: ShowingFormProps) {
  const t = useTranslations("showings.form");
  const tCommon = useTranslations("common");
  const [state, formAction, pending] = useActionState<ShowingFormState, FormData>(createShowing, {});

  const err = (field: ShowingField) => (state.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-5 p-6">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={t("property")} htmlFor="propertyId" error={err("propertyId")}>
              <Select id="propertyId" name="propertyId" defaultValue={defaults.propertyId} aria-invalid={Boolean(err("propertyId"))}>
                <option value="">{t("choose")}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("date")} htmlFor="date" error={err("date")}>
            <Input id="date" name="date" type="date" defaultValue={defaults.date} aria-invalid={Boolean(err("date"))} />
          </Field>
          <Field label={t("time")} htmlFor="time" error={err("time")}>
            <Input id="time" name="time" type="time" aria-invalid={Boolean(err("time"))} />
          </Field>
          <Field label={t("duration")} htmlFor="duration" error={err("duration")}>
            <Select id="duration" name="duration" defaultValue="30">
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {t("minutes", { count: d })}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("buyer")} htmlFor="buyerContactId" error={err("buyerContactId")}>
            <Select id="buyerContactId" name="buyerContactId" defaultValue={defaults.contactId}>
              <option value="">–</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          {agents ? (
            <Field label={t("agent")} htmlFor="agentId" error={err("agentId")}>
              <Select id="agentId" name="agentId" defaultValue={defaults.agentId}>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <div className="sm:col-span-2">
            <Field label={t("notes")} htmlFor="notes" error={err("notes")}>
              <Textarea id="notes" name="notes" rows={3} />
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
          <Link href="/naptar">{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
