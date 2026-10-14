"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DealSide, DealStage } from "@/config/pipeline";
import { createDeal, updateDeal, type DealFormState } from "../actions";
import type { DealField } from "../schema";

export interface DealFormValues {
  stage: DealStage;
  propertyId: string;
  contactId: string;
  agentId: string;
  title: string;
  expectedValueM: string;
  probability: string;
  expectedCloseDate: string;
  notes: string;
}

interface DealFormProps {
  mode: "create" | "edit";
  dealId?: string;
  side: DealSide;
  stages: readonly DealStage[];
  defaults: DealFormValues;
  properties: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
  /** Csak az owner választhat felelőst; egyébként null. */
  agents: { id: string; name: string }[] | null;
  cancelHref: string;
}

/** Ügylet felvétele és szerkesztése. Szerkesztéskor az ingatlan, az ügyfél és a szakasz már nem módosítható itt. */
export function DealForm({ mode, dealId, side, stages, defaults, properties, contacts, agents, cancelHref }: DealFormProps) {
  const t = useTranslations("deals.form");
  const tStage = useTranslations("enums.dealStage");
  const tCommon = useTranslations("common");
  const action = mode === "create" ? createDeal : updateDeal.bind(null, dealId ?? "");
  const [state, formAction, pending] = useActionState<DealFormState, FormData>(action, {});

  const err = (field: DealField) => (state.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined);
  const create = mode === "create";

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="side" value={side} />
      <Card className="flex flex-col gap-5 p-6">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          {create ? (
            <>
              <Field label={t("property")} htmlFor="propertyId" error={err("propertyId")}>
                <Select id="propertyId" name="propertyId" defaultValue={defaults.propertyId}>
                  <option value="">–</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("contact")} htmlFor="contactId" error={err("contactId")}>
                <Select id="contactId" name="contactId" defaultValue={defaults.contactId}>
                  <option value="">–</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("stage")} htmlFor="stage" error={err("stage")}>
                <Select id="stage" name="stage" defaultValue={defaults.stage}>
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {tStage(s)}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          ) : null}
          <Field label={t("title")} htmlFor="title" hint={t("titleHint")} error={err("title")}>
            <Input id="title" name="title" defaultValue={defaults.title} aria-invalid={Boolean(err("title"))} />
          </Field>
          <Field label={t("value")} htmlFor="expectedValueM" error={err("expectedValueM")}>
            <Input id="expectedValueM" name="expectedValueM" inputMode="decimal" defaultValue={defaults.expectedValueM} aria-invalid={Boolean(err("expectedValueM"))} />
          </Field>
          <Field label={t("probability")} htmlFor="probability" hint={t("probabilityHint")} error={err("probability")}>
            <Input id="probability" name="probability" inputMode="numeric" defaultValue={defaults.probability} aria-invalid={Boolean(err("probability"))} />
          </Field>
          <Field label={t("closeDate")} htmlFor="expectedCloseDate" error={err("expectedCloseDate")}>
            <Input id="expectedCloseDate" name="expectedCloseDate" type="date" defaultValue={defaults.expectedCloseDate} />
          </Field>
          {agents ? (
            <Field label={t("agent")} htmlFor="agentId" error={err("agentId")}>
              <Select id="agentId" name="agentId" defaultValue={defaults.agentId}>
                <option value="">–</option>
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
              <Textarea id="notes" name="notes" rows={4} defaultValue={defaults.notes} />
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
          <Link href={cancelHref}>{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {create ? t("submitNew") : t("submitEdit")}
        </Button>
      </div>
    </form>
  );
}
