import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import type { Database } from "@/types/database";

type Insert = Database["public"]["Tables"]["contacts"]["Insert"];
type SearchInsert = Database["public"]["Tables"]["search_profiles"]["Insert"];

export const CONTACT_FORM_ERRORS = ["nameRequired", "email", "phone", "choice", "tooLong"] as const;
export type ContactFormError = (typeof CONTACT_FORM_ERRORS)[number];

export const CONTACT_FIELDS = [
  "lastName", "firstName", "company", "email", "phone", "postalAddress", "roles", "source", "sourceDetail", "tags", "notes", "ownerAgentId",
] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

const ROLES = ["seller", "buyer", "tenant", "landlord", "investor", "lawyer", "mortgage_broker", "other"] as const;
const SOURCES = ["portal", "website", "facebook", "phone", "referral", "manual", "public_page"] as const;

const blank = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const text = (max: number) => z.preprocess(blank, z.string().trim().max(max, "tooLong").optional());

export const contactSchema = z
  .object({
    lastName: text(80),
    firstName: text(80),
    company: text(120),
    email: z.preprocess(blank, z.email("email").max(160, "tooLong").optional()),
    phone: z.preprocess(blank, z.string().max(40, "tooLong").optional()),
    postalAddress: text(200),
    roles: z.array(z.enum(ROLES, "choice")).default([]),
    source: z.preprocess(blank, z.enum(SOURCES, "choice").optional()),
    sourceDetail: text(120),
    tags: z.preprocess(
      (v) => (typeof v === "string" ? v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12) : []),
      z.array(z.string().max(30, "tooLong")),
    ),
    notes: text(4000),
    ownerAgentId: z.preprocess(blank, z.uuid("choice").optional()),
    gdprConsent: z.preprocess((v) => v === "on", z.boolean()),
  })
  .superRefine((v, ctx) => {
    if (!v.lastName && !v.firstName && !v.company) ctx.addIssue({ code: "custom", path: ["lastName"], message: "nameRequired" });
    if (v.phone && !normalizePhone(v.phone)) ctx.addIssue({ code: "custom", path: ["phone"], message: "phone" });
  });

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactParseResult = { ok: true; data: ContactInput } | { ok: false; fieldErrors: Partial<Record<ContactField, ContactFormError>> };

export function parseContactForm(formData: FormData): ContactParseResult {
  const raw: Record<string, unknown> = {};
  for (const key of CONTACT_FIELDS) {
    if (key === "roles") continue;
    const value = formData.get(key);
    raw[key] = value === null ? undefined : value;
  }
  raw.roles = formData.getAll("roles");
  raw.gdprConsent = formData.get("gdprConsent") ?? undefined;
  const result = contactSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<ContactField, ContactFormError>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ContactField | undefined;
    const key = (CONTACT_FORM_ERRORS as readonly string[]).includes(issue.message) ? (issue.message as ContactFormError) : "choice";
    if (field && !fieldErrors[field]) fieldErrors[field] = key;
  }
  return { ok: false, fieldErrors };
}

/** Űrlapértékek → adatbázissor. A GDPR-hozzájárulás időpontját csak bejelöléskor (és csak egyszer) rögzítjük. */
export function toContactRow(input: ContactInput, existingConsentAt: string | null = null): Omit<Insert, "organization_id"> {
  const phoneNormalized = normalizePhone(input.phone);
  return {
    last_name: input.lastName ?? "",
    first_name: input.firstName ?? "",
    company: input.company ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    phone_normalized: phoneNormalized,
    postal_address: input.postalAddress ?? null,
    roles: input.roles,
    source: input.source ?? null,
    source_detail: input.sourceDetail ?? null,
    tags: input.tags,
    notes: input.notes ?? null,
    gdpr_consent_at: input.gdprConsent ? (existingConsentAt ?? new Date().toISOString()) : null,
    gdpr_consent_scope: input.gdprConsent ? ["kapcsolattartas", "ajanlatkuldes"] : [],
  };
}

/* ------------------------------------------------------------ Keresési profil */

export const PROFILE_FIELDS = [
  "name", "transactionType", "propertyTypes", "cities", "districts", "priceMinM", "priceMaxM", "areaMin", "areaMax", "roomsMin",
  "financing", "urgency", "mustHave", "niceToHave", "notes",
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type ProfileFormError = "number" | "choice" | "tooLong" | "range";

const list = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, max) : []),
    z.array(z.string().max(60, "tooLong")),
  );
const decimal = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? blank(v.replace(/\s/g, "").replace(",", ".")) : v),
    z.coerce.number({ error: "number" }).min(0, "range").max(max, "range").optional(),
  );

export const profileSchema = z
  .object({
    name: text(80),
    transactionType: z.enum(["sale", "rent"], "choice"),
    propertyTypes: z.array(z.enum(["flat", "house", "plot", "office", "retail", "holiday_home"], "choice")).default([]),
    cities: list(10),
    districts: z.preprocess(
      (v) => (typeof v === "string" ? v.split(",").map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n >= 1 && n <= 23).slice(0, 23) : []),
      z.array(z.number()),
    ),
    priceMinM: decimal(100_000),
    priceMaxM: decimal(100_000),
    areaMin: decimal(1_000_000),
    areaMax: decimal(1_000_000),
    roomsMin: z.preprocess(blank, z.coerce.number({ error: "number" }).int("number").min(0, "range").max(50, "range").optional()),
    financing: z.array(z.string().max(40)).default([]),
    mortgageApproved: z.preprocess((v) => v === "on", z.boolean()),
    urgency: z.enum(["low", "medium", "high"], "choice").default("medium"),
    mustHave: list(12),
    niceToHave: list(12),
    notes: text(2000),
    active: z.preprocess((v) => v === "on", z.boolean()),
  })
  .superRefine((v, ctx) => {
    if (v.priceMinM !== undefined && v.priceMaxM !== undefined && v.priceMinM > v.priceMaxM) ctx.addIssue({ code: "custom", path: ["priceMaxM"], message: "range" });
    if (v.areaMin !== undefined && v.areaMax !== undefined && v.areaMin > v.areaMax) ctx.addIssue({ code: "custom", path: ["areaMax"], message: "range" });
  });

export type ProfileInput = z.infer<typeof profileSchema>;

export function parseProfileForm(formData: FormData): { ok: true; data: ProfileInput } | { ok: false; fieldErrors: Partial<Record<ProfileField, ProfileFormError>> } {
  const raw: Record<string, unknown> = {};
  for (const key of PROFILE_FIELDS) {
    if (key === "propertyTypes" || key === "financing") continue;
    const value = formData.get(key);
    raw[key] = value === null ? undefined : value;
  }
  raw.propertyTypes = formData.getAll("propertyTypes");
  raw.financing = formData.getAll("financing");
  raw.mortgageApproved = formData.get("mortgageApproved") ?? undefined;
  raw.active = formData.get("active") ?? undefined;
  const result = profileSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<ProfileField, ProfileFormError>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ProfileField | undefined;
    const known = ["number", "choice", "tooLong", "range"];
    if (field && !fieldErrors[field]) fieldErrors[field] = (known.includes(issue.message) ? issue.message : "choice") as ProfileFormError;
  }
  return { ok: false, fieldErrors };
}

export function toProfileRow(input: ProfileInput): Omit<SearchInsert, "organization_id" | "contact_id"> {
  return {
    name: input.name ?? null,
    transaction_type: input.transactionType,
    property_types: input.propertyTypes,
    cities: input.cities,
    districts: input.districts,
    price_min: input.priceMinM === undefined ? null : Math.round(input.priceMinM * 1_000_000),
    price_max: input.priceMaxM === undefined ? null : Math.round(input.priceMaxM * 1_000_000),
    area_min: input.areaMin ?? null,
    area_max: input.areaMax ?? null,
    rooms_min: input.roomsMin ?? null,
    financing: input.financing,
    mortgage_approved: input.mortgageApproved,
    urgency: input.urgency,
    must_have: input.mustHave,
    nice_to_have: input.niceToHave,
    notes: input.notes ?? null,
    active: input.active,
  };
}
