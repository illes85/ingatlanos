"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { submitInquiry, type InquiryState } from "../actions";

/** Érdeklődési űrlap a nyilvános oldalon. A beküldés leadként érkezik az ingatlan felelőséhez. */
export function InquiryForm({ slug }: { slug: string }) {
  const t = useTranslations("publicPage.inquiry");
  const [state, formAction, pending] = useActionState<InquiryState, FormData>(submitInquiry.bind(null, slug), {});
  const err = (field: keyof NonNullable<InquiryState["fieldErrors"]>) => (state.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined);

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 size={36} className="text-primary" aria-hidden="true" />
        <p className="serif text-22 font-medium">{t("sentTitle")}</p>
        <p className="text-14 text-muted">{t("sentBody")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field label={t("name")} htmlFor="inq-name" error={err("name")}>
        <Input id="inq-name" name="name" autoComplete="name" aria-invalid={Boolean(err("name"))} />
      </Field>
      <Field label={t("phone")} htmlFor="inq-phone" error={err("phone")}>
        <Input id="inq-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(err("phone"))} />
      </Field>
      <Field label={t("email")} htmlFor="inq-email" error={err("email")}>
        <Input id="inq-email" name="email" type="email" inputMode="email" autoComplete="email" aria-invalid={Boolean(err("email"))} />
      </Field>
      <Field label={t("message")} htmlFor="inq-message" error={err("message")}>
        <Textarea id="inq-message" name="message" rows={4} />
      </Field>
      {/* Csapdamező: emberek nem látják, a robotok kitöltik. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          {t("trap")}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2.5 text-13 text-ink-2">
          <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-[var(--color-primary)]" aria-invalid={Boolean(err("consent"))} />
          <span>{t("consent")}</span>
        </label>
        {err("consent") ? (
          <span role="alert" className="text-12 font-semibold text-danger-text">
            {err("consent")}
          </span>
        ) : null}
      </div>
      {state.status === "error" && !state.fieldErrors ? (
        <p role="alert" className="text-14 font-semibold text-danger-text">
          {t("errors.generic")}
        </p>
      ) : null}
      {state.status === "rate_limited" ? (
        <p role="alert" className="text-14 font-semibold text-danger-text">
          {t("errors.rateLimited")}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
