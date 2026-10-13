"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PROPERTY_TYPES } from "@/features/properties/filters";
import type { Database } from "@/types/database";
import { deleteSearchProfile, saveSearchProfile, type ProfileFormState } from "../actions";
import type { ProfileField } from "../schema";

type ProfileRow = Database["public"]["Tables"]["search_profiles"]["Row"];

const csv = (values: readonly (string | number)[]) => values.join(", ");
const million = (value: number | null) => (value === null ? "" : String(Number(value) / 1_000_000).replace(".", ","));

function ProfileForm({
  contactId,
  profile,
  financingOptions,
  onDone,
}: {
  contactId: string;
  profile: ProfileRow | null;
  financingOptions: { key: string; label: string }[];
  onDone: () => void;
}) {
  const t = useTranslations("contacts.profileForm");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(saveSearchProfile.bind(null, contactId), {});

  useEffect(() => {
    if (state.saved) {
      toast.success(t("saved"));
      router.refresh();
      onDone();
    }
  }, [state.saved, router, onDone, t]);

  const err = (field: ProfileField) => (state.fieldErrors?.[field] ? t("invalid") : undefined);
  const text = (field: ProfileField, label: string, value: string, extra: React.ComponentProps<typeof Input> & { hint?: string } = {}) => {
    const { hint, ...rest } = extra;
    return (
      <Field label={label} htmlFor={`${field}-${profile?.id ?? "new"}`} hint={hint} error={err(field)}>
        <Input id={`${field}-${profile?.id ?? "new"}`} name={field} defaultValue={value} aria-invalid={Boolean(err(field))} {...rest} />
      </Field>
    );
  };

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-card border border-line bg-surface-sunken/40 p-5" noValidate>
      <input type="hidden" name="profileId" value={profile?.id ?? ""} />
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {text("name", t("name"), profile?.name ?? "", { placeholder: t("namePlaceholder") })}
        <Field label={t("transaction")} htmlFor={`transactionType-${profile?.id ?? "new"}`}>
          <Select id={`transactionType-${profile?.id ?? "new"}`} name="transactionType" defaultValue={profile?.transaction_type ?? "sale"}>
            <option value="sale">{tEnums("transactionType.sale")}</option>
            <option value="rent">{tEnums("transactionType.rent")}</option>
          </Select>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-13 font-semibold">{t("types")}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {PROPERTY_TYPES.map((type) => (
              <label key={type} className="flex h-9 cursor-pointer items-center gap-2 text-14 font-medium">
                <input type="checkbox" name="propertyTypes" value={type} defaultChecked={profile?.property_types.includes(type)} className="size-[18px] accent-[var(--primary)]" />
                {tEnums(`propertyType.${type}`)}
              </label>
            ))}
          </div>
        </fieldset>
        {text("cities", t("cities"), csv(profile?.cities ?? []), { hint: t("citiesHint") })}
        {text("districts", t("districts"), csv(profile?.districts ?? []), { hint: t("districtsHint") })}
        {text("priceMinM", t("priceMin"), million(profile?.price_min ?? null), { inputMode: "decimal" })}
        {text("priceMaxM", t("priceMax"), million(profile?.price_max ?? null), { inputMode: "decimal" })}
        {text("areaMin", t("areaMin"), profile?.area_min?.toString() ?? "", { inputMode: "decimal" })}
        {text("areaMax", t("areaMax"), profile?.area_max?.toString() ?? "", { inputMode: "decimal" })}
        {text("roomsMin", t("roomsMin"), profile?.rooms_min?.toString() ?? "", { inputMode: "numeric" })}
        <Field label={t("urgency")} htmlFor={`urgency-${profile?.id ?? "new"}`}>
          <Select id={`urgency-${profile?.id ?? "new"}`} name="urgency" defaultValue={profile?.urgency ?? "medium"}>
            {(["low", "medium", "high"] as const).map((u) => (
              <option key={u} value={u}>
                {tEnums(`urgency.${u}`)}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-13 font-semibold">{t("financing")}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {financingOptions.map((f) => (
              <label key={f.key} className="flex h-9 cursor-pointer items-center gap-2 text-14 font-medium">
                <input type="checkbox" name="financing" value={f.key} defaultChecked={profile?.financing.includes(f.key)} className="size-[18px] accent-[var(--primary)]" />
                {f.label}
              </label>
            ))}
            <label className="flex h-9 cursor-pointer items-center gap-2 text-14 font-medium">
              <input type="checkbox" name="mortgageApproved" defaultChecked={profile?.mortgage_approved} className="size-[18px] accent-[var(--primary)]" />
              {t("mortgageApproved")}
            </label>
          </div>
        </fieldset>
        {text("mustHave", t("mustHave"), csv(profile?.must_have ?? []), { hint: t("listHint") })}
        {text("niceToHave", t("niceToHave"), csv(profile?.nice_to_have ?? []), { hint: t("listHint") })}
        <div className="sm:col-span-2">
          <Field label={t("notes")} htmlFor={`notes-${profile?.id ?? "new"}`}>
            <Textarea id={`notes-${profile?.id ?? "new"}`} name="notes" defaultValue={profile?.notes ?? ""} rows={2} />
          </Field>
        </div>
        <label className="flex h-10 cursor-pointer items-center gap-3 text-14 font-semibold sm:col-span-2">
          <input type="checkbox" name="active" defaultChecked={profile?.active ?? true} className="size-[18px] accent-[var(--primary)]" />
          {t("active")}
        </label>
      </div>
      {state.error || state.fieldErrors ? (
        <p role="alert" className="text-13 font-semibold text-danger-text">
          {t("failed")}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          {t("cancel")}
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

/** Keresési profilok kezelése az ügyfél szerkesztő oldalán: új felvétele, módosítás, törlés. */
export function ProfilesEditor({
  contactId,
  profiles,
  financingOptions,
}: {
  contactId: string;
  profiles: ProfileRow[];
  financingOptions: { key: string; label: string }[];
}) {
  const t = useTranslations("contacts.detail.profiles");
  const tForm = useTranslations("contacts.profileForm");
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(profiles.length === 0 ? "new" : null);
  const [, startTransition] = useTransition();

  const remove = (profile: ProfileRow) => {
    if (!window.confirm(tForm("deleteConfirm"))) return;
    startTransition(async () => {
      const result = await deleteSearchProfile(contactId, profile.id);
      if (!result.ok) {
        toast.error(tForm("failed"));
        return;
      }
      toast(tForm("deleted"));
      router.refresh();
    });
  };

  return (
    <Card id="profilok" className="flex scroll-mt-24 flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="serif text-22 font-medium">{t("title")}</h2>
        {editing !== "new" ? (
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            {t("add")}
          </Button>
        ) : null}
      </div>
      <ul className="flex flex-col gap-3">
        {profiles.map((p) => (
          <li key={p.id}>
            {editing === p.id ? (
              <ProfileForm contactId={contactId} profile={p} financingOptions={financingOptions} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-control border border-line px-4 py-3">
                <span className="text-14 font-semibold">{p.name ?? "—"}</span>
                <span className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(p.id)}>
                    {tForm("title")}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(p)}>
                    {tForm("delete")}
                  </Button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? <ProfileForm contactId={contactId} profile={null} financingOptions={financingOptions} onDone={() => setEditing(null)} /> : null}
    </Card>
  );
}
