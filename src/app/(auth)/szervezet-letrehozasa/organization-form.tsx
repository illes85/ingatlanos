"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createOrganization, type AuthFormState } from "../actions";

type OrgType = "individual" | "office";

export function OrganizationForm() {
  const t = useTranslations();
  const [type, setType] = React.useState<OrgType>("individual");
  const [state, action, pending] = React.useActionState<AuthFormState, FormData>(createOrganization, {});

  const options: { value: OrgType; title: string; desc: string; icon: typeof UserRound }[] = [
    { value: "individual", title: t("onboarding.individual"), desc: t("onboarding.individualDesc"), icon: UserRound },
    { value: "office", title: t("onboarding.office"), desc: t("onboarding.officeDesc"), icon: Building2 },
  ];

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="type" value={type} />
      <div role="radiogroup" className="grid grid-cols-2 gap-3">
        {options.map(({ value, title, desc, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => setType(value)}
            className={cn(
              "flex flex-col gap-2 rounded-card border-2 bg-surface p-4 text-left transition-colors",
              type === value ? "border-primary shadow-selected" : "border-line-card hover:border-line-dashed",
            )}
          >
            <span className={cn("flex size-9 items-center justify-center rounded-control", type === value ? "bg-primary text-on-primary" : "bg-surface-sunken text-ink-2")}>
              <Icon size={18} />
            </span>
            <span className="text-15 font-bold">{title}</span>
            <span className="text-13 leading-snug text-muted">{desc}</span>
          </button>
        ))}
      </div>
      <Field
        label={type === "office" ? t("onboarding.nameLabelOffice") : t("onboarding.nameLabelIndividual")}
        htmlFor="name"
        error={state.fieldErrors?.name ? t(`auth.errors.${state.fieldErrors.name}`) : undefined}
      >
        <Input
          id="name"
          name="name"
          required
          placeholder={type === "office" ? t("onboarding.namePlaceholderOffice") : t("onboarding.namePlaceholderIndividual")}
        />
      </Field>
      {state.error ? <p role="alert" className="text-13 font-semibold text-danger-text">{t(`auth.errors.${state.error}`)}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {t("onboarding.submit")}
      </Button>
      <p className="text-center text-13 text-muted">{t("onboarding.trialNote")}</p>
    </form>
  );
}
