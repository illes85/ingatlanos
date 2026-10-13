"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { districtLabel } from "@/lib/format";
import { PROPERTY_TYPES } from "../filters";
import { createProperty, updateProperty, type PropertyFormState } from "../actions";
import type { PropertyField } from "../schema";

export interface PropertyFormValues {
  title: string;
  transactionType: string;
  propertyType: string;
  subtype: string;
  price: string;
  areaSqm: string;
  lotSqm: string;
  rooms: string;
  halfRooms: string;
  bathrooms: string;
  floor: string;
  buildingFloors: string;
  hasElevator: boolean;
  heating: string;
  buildingMaterial: string;
  condition: string;
  yearBuilt: string;
  energyRating: string;
  balconySqm: string;
  hasTerrace: boolean;
  gardenConnected: boolean;
  parking: string;
  utilitiesMonthly: string;
  commonCostMonthly: string;
  description: string;
  highlights: string;
  postalCode: string;
  city: string;
  district: string;
  street: string;
  houseNumber: string;
  floorDoor: string;
  addressVisibility: string;
  mandateType: string;
  mandateStart: string;
  mandateExpiresAt: string;
  commissionPct: string;
  responsibleAgentId: string;
  visibility: string;
}

export const EMPTY_PROPERTY_VALUES: PropertyFormValues = {
  title: "", transactionType: "sale", propertyType: "flat", subtype: "", price: "", areaSqm: "", lotSqm: "", rooms: "", halfRooms: "",
  bathrooms: "", floor: "", buildingFloors: "", hasElevator: false, heating: "", buildingMaterial: "", condition: "", yearBuilt: "",
  energyRating: "", balconySqm: "", hasTerrace: false, gardenConnected: false, parking: "", utilitiesMonthly: "", commonCostMonthly: "",
  description: "", highlights: "", postalCode: "", city: "", district: "", street: "", houseNumber: "", floorDoor: "",
  addressVisibility: "street", mandateType: "", mandateStart: "", mandateExpiresAt: "", commissionPct: "", responsibleAgentId: "",
  visibility: "office",
};

const ENERGY = ["AA++", "AA+", "AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "II", "JJ"];
const LOOKUPS = {
  heating: ["district", "electric", "gas_condensing", "gas_individual", "heat_pump", "house_central", "none"],
  buildingMaterial: ["brick", "panel", "wood", "none"],
  condition: ["new", "excellent", "renovated", "good", "to_renovate", "plot"],
  parking: ["garage", "underground", "carport", "own", "street"],
} as const;

interface PropertyFormProps {
  mode: "create" | "edit";
  propertyId?: string;
  defaults?: PropertyFormValues;
  agents: { id: string; name: string }[];
  canEditCommission: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <h2 className="serif text-22 font-medium">{title}</h2>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </Card>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex h-11 cursor-pointer items-center gap-3 text-14 font-semibold">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-[18px] accent-[var(--primary)]" />
      {label}
    </label>
  );
}

/** Ingatlan felvételi és szerkesztő űrlap. A validáció szerveren fut; a hibák mezőnként jelennek meg. */
export function PropertyForm({ mode, propertyId, defaults = EMPTY_PROPERTY_VALUES, agents, canEditCommission }: PropertyFormProps) {
  const t = useTranslations("properties.form");
  const tEnums = useTranslations("enums");
  const tLookups = useTranslations("lookups");
  const tCommon = useTranslations("common");
  const action = mode === "create" ? createProperty : updateProperty.bind(null, propertyId ?? "");
  const [state, formAction, pending] = useActionState<PropertyFormState, FormData>(action, {});
  const [city, setCity] = useState(defaults.city);
  const [propertyType, setPropertyType] = useState(defaults.propertyType);

  const err = (field: PropertyField) => (state.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined);
  const text = (field: PropertyField, label: string, key: keyof PropertyFormValues, extra: React.ComponentProps<typeof Input> & { hint?: string } = {}) => {
    const { hint, ...inputProps } = extra;
    return (
      <Field label={label} htmlFor={field} error={err(field)} hint={hint}>
        <Input id={field} name={field} defaultValue={String(defaults[key])} aria-invalid={Boolean(err(field))} {...inputProps} />
      </Field>
    );
  };
  const select = (field: PropertyField, label: string, key: keyof PropertyFormValues, options: { value: string; label: string }[], allowEmpty = true) => (
    <Field label={label} htmlFor={field} error={err(field)}>
      <Select id={field} name={field} defaultValue={String(defaults[key])} aria-invalid={Boolean(err(field))}>
        {allowEmpty ? <option value="">{t("choose")}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
  const lookup = (field: PropertyField, label: string, key: keyof typeof LOOKUPS) =>
    select(field, label, field as keyof PropertyFormValues, LOOKUPS[key].map((value) => ({ value, label: tLookups(`${key === "buildingMaterial" ? "material" : key}.${value}` as Parameters<typeof tLookups>[0]) })));

  const isBudapest = city.trim().toLowerCase() === "budapest";

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Section title={t("sections.basics")}>
        <div className="sm:col-span-2 lg:col-span-3">{text("title", t("fields.title"), "title", { hint: t("fields.titleHint"), required: true })}</div>
        {select("transactionType", t("fields.transaction"), "transactionType", [
          { value: "sale", label: tEnums("transactionType.sale") },
          { value: "rent", label: tEnums("transactionType.rent") },
        ], false)}
        <Field label={t("fields.type")} htmlFor="propertyType" error={err("propertyType")}>
          <Select id="propertyType" name="propertyType" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {tEnums(`propertyType.${type}`)}
              </option>
            ))}
          </Select>
        </Field>
        {text("subtype", t("fields.subtype"), "subtype", { hint: t("fields.subtypeHint") })}
        {text("price", t("fields.price"), "price", { inputMode: "numeric", required: true, trailing: "Ft" })}
      </Section>

      <Section title={t("sections.address")}>
        <Field label={t("fields.city")} htmlFor="city" error={err("city")}>
          <Input id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} aria-invalid={Boolean(err("city"))} required />
        </Field>
        {isBudapest
          ? select("district", t("fields.district"), "district", Array.from({ length: 23 }, (_, i) => ({ value: String(i + 1), label: `${districtLabel(i + 1)} kerület` })))
          : null}
        {text("postalCode", t("fields.postalCode"), "postalCode", { inputMode: "numeric" })}
        {text("street", t("fields.street"), "street")}
        {text("houseNumber", t("fields.houseNumber"), "houseNumber")}
        {text("floorDoor", t("fields.floorDoor"), "floorDoor")}
        {select("addressVisibility", t("fields.addressVisibility"), "addressVisibility", (["exact", "street", "area"] as const).map((v) => ({ value: v, label: t(`options.addressVisibility.${v}`) })), false)}
      </Section>

      <Section title={t("sections.details")}>
        {text("areaSqm", t("fields.area"), "areaSqm", { inputMode: "decimal" })}
        {propertyType !== "flat" ? text("lotSqm", t("fields.lot"), "lotSqm", { inputMode: "decimal" }) : null}
        {text("rooms", t("fields.rooms"), "rooms", { inputMode: "numeric" })}
        {text("halfRooms", t("fields.halfRooms"), "halfRooms", { inputMode: "numeric" })}
        {text("bathrooms", t("fields.bathrooms"), "bathrooms", { inputMode: "numeric" })}
        {propertyType === "flat" ? text("floor", t("fields.floor"), "floor", { inputMode: "numeric", hint: t("fields.floorHint") }) : null}
        {text("buildingFloors", t("fields.buildingFloors"), "buildingFloors", { inputMode: "numeric" })}
        {text("yearBuilt", t("fields.year"), "yearBuilt", { inputMode: "numeric" })}
        {select("energyRating", t("fields.energy"), "energyRating", ENERGY.map((v) => ({ value: v, label: v })))}
        {lookup("heating", t("fields.heating"), "heating")}
        {lookup("buildingMaterial", t("fields.material"), "buildingMaterial")}
        {lookup("condition", t("fields.condition"), "condition")}
        {lookup("parking", t("fields.parking"), "parking")}
        {text("balconySqm", t("fields.balcony"), "balconySqm", { inputMode: "decimal" })}
        {text("utilitiesMonthly", t("fields.utilities"), "utilitiesMonthly", { inputMode: "numeric" })}
        {text("commonCostMonthly", t("fields.commonCost"), "commonCostMonthly", { inputMode: "numeric" })}
      </Section>

      <Section title={t("sections.features")}>
        {propertyType === "flat" ? <Check name="hasElevator" label={t("fields.elevator")} defaultChecked={defaults.hasElevator} /> : null}
        <Check name="hasTerrace" label={t("fields.terrace")} defaultChecked={defaults.hasTerrace} />
        <Check name="gardenConnected" label={t("fields.garden")} defaultChecked={defaults.gardenConnected} />
        <div className="sm:col-span-2 lg:col-span-3">{text("highlights", t("fields.highlights"), "highlights", { hint: t("fields.highlightsHint") })}</div>
      </Section>

      <Section title={t("sections.mandate")}>
        {select("mandateType", t("fields.mandateType"), "mandateType", [
          { value: "exclusive", label: tEnums("mandateType.exclusive") },
          { value: "non_exclusive", label: tEnums("mandateType.non_exclusive") },
        ])}
        {text("mandateStart", t("fields.mandateStart"), "mandateStart", { type: "date" })}
        {text("mandateExpiresAt", t("fields.mandateEnd"), "mandateExpiresAt", { type: "date" })}
        {canEditCommission ? text("commissionPct", t("fields.commission"), "commissionPct", { inputMode: "decimal", trailing: "%" }) : null}
      </Section>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="serif text-22 font-medium">{t("sections.description")}</h2>
        <Field label={t("fields.description")} htmlFor="description" error={err("description")}>
          <Textarea id="description" name="description" defaultValue={defaults.description} rows={7} />
        </Field>
      </Card>

      <Section title={t("sections.assignment")}>
        {select("responsibleAgentId", t("fields.responsible"), "responsibleAgentId", agents.map((a) => ({ value: a.id, label: a.name })))}
        {select("visibility", t("fields.recordVisibility"), "visibility", (["office", "private"] as const).map((v) => ({ value: v, label: t(`options.recordVisibility.${v}`) })), false)}
      </Section>

      {state.error ? (
        <p role="alert" className="text-14 font-semibold text-danger-text">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      {state.fieldErrors ? (
        <p role="alert" className="text-14 font-semibold text-danger-text">
          {t("errors.required")}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" asChild>
          <Link href={propertyId ? `/ingatlanok/${propertyId}` : "/ingatlanok"}>{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {mode === "create" ? t("submitNew") : t("submitEdit")}
        </Button>
      </div>
    </form>
  );
}
