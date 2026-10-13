import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

export const LEAD_FORM_ERRORS = ["required", "email", "phone", "choice", "tooLong", "contactRequired"] as const;
export type LeadFormError = (typeof LEAD_FORM_ERRORS)[number];

export const LEAD_FIELDS = ["fullName", "phone", "email", "message", "source", "propertyId"] as const;
export type LeadField = (typeof LEAD_FIELDS)[number];

const SOURCES = ["portal", "website", "facebook", "phone", "referral", "manual"] as const;
const blank = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

export const leadSchema = z
  .object({
    fullName: z.string().trim().min(1, "required").max(120, "tooLong"),
    phone: z.preprocess(blank, z.string().max(40, "tooLong").optional()),
    email: z.preprocess(blank, z.email("email").max(160, "tooLong").optional()),
    message: z.preprocess(blank, z.string().trim().max(4000, "tooLong").optional()),
    source: z.enum(SOURCES, "choice").default("manual"),
    propertyId: z.preprocess(blank, z.uuid("choice").optional()),
  })
  .superRefine((value, ctx) => {
    if (value.phone && !normalizePhone(value.phone)) ctx.addIssue({ code: "custom", path: ["phone"], message: "phone" });
    if (!value.phone && !value.email) ctx.addIssue({ code: "custom", path: ["phone"], message: "contactRequired" });
  });

export type LeadInput = z.infer<typeof leadSchema>;

export type ParsedLead = { ok: true; data: LeadInput } | { ok: false; fieldErrors: Partial<Record<LeadField, LeadFormError>> };

export function parseLeadForm(formData: FormData): ParsedLead {
  const raw = Object.fromEntries(LEAD_FIELDS.map((field) => [field, formData.get(field) ?? undefined]));
  const result = leadSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<LeadField, LeadFormError>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as LeadField | undefined;
    if (field && !fieldErrors[field]) fieldErrors[field] = (LEAD_FORM_ERRORS as readonly string[]).includes(issue.message) ? (issue.message as LeadFormError) : "choice";
  }
  return { ok: false, fieldErrors };
}
