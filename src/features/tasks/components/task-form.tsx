"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createTask, type TaskFormState } from "../actions";
import { REPEATS } from "../recurrence";
import type { TaskField } from "../schema";

interface TaskFormProps {
  defaults: { propertyId: string; contactId: string; assigneeId: string };
  properties: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
  /** Felelőst az owner és az asszisztens választ; az ügynöknél null. */
  assignees: { id: string; name: string }[] | null;
}

/** Új feladat felvétele. */
export function TaskForm({ defaults, properties, contacts, assignees }: TaskFormProps) {
  const t = useTranslations("tasks.form");
  const tRepeat = useTranslations("tasks.repeat");
  const tPriority = useTranslations("tasks.priority");
  const tCommon = useTranslations("common");
  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(createTask, {});

  const err = (field: TaskField) => (state.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-5 p-6">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={t("title")} htmlFor="title" error={err("title")}>
              <Input id="title" name="title" aria-invalid={Boolean(err("title"))} />
            </Field>
          </div>
          <Field label={t("dueDate")} htmlFor="dueDate" error={err("dueDate")}>
            <Input id="dueDate" name="dueDate" type="date" aria-invalid={Boolean(err("dueDate"))} />
          </Field>
          <Field label={t("dueTime")} htmlFor="dueTime" hint={t("dueTimeHint")} error={err("dueTime")}>
            <Input id="dueTime" name="dueTime" type="time" />
          </Field>
          <Field label={t("priority")} htmlFor="priority" error={err("priority")}>
            <Select id="priority" name="priority" defaultValue="normal">
              {(["low", "normal", "high"] as const).map((p) => (
                <option key={p} value={p}>
                  {tPriority(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("repeat")} htmlFor="repeat" error={err("repeat")}>
            <Select id="repeat" name="repeat" defaultValue="none">
              {REPEATS.map((r) => (
                <option key={r} value={r}>
                  {tRepeat(r)}
                </option>
              ))}
            </Select>
          </Field>
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
          {assignees ? (
            <Field label={t("assignee")} htmlFor="assigneeId" error={err("assigneeId")}>
              <Select id="assigneeId" name="assigneeId" defaultValue={defaults.assigneeId}>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <div className="sm:col-span-2">
            <Field label={t("description")} htmlFor="description" error={err("description")}>
              <Textarea id="description" name="description" rows={3} />
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
          <Link href="/feladatok">{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
