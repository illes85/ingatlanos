import { z } from "zod";

export const SHOWING_FORM_ERRORS = ["required", "choice", "date", "time", "tooLong", "rating"] as const;
export type ShowingFormError = (typeof SHOWING_FORM_ERRORS)[number];

export const SHOWING_FIELDS = ["propertyId", "buyerContactId", "agentId", "date", "time", "duration", "notes"] as const;
export type ShowingField = (typeof SHOWING_FIELDS)[number];

export const DURATIONS = [30, 45, 60, 90] as const;

const blank = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const showingSchema = z.object({
  propertyId: z.preprocess(blank, z.uuid("required")),
  buyerContactId: z.preprocess(blank, z.uuid("choice").optional()),
  agentId: z.preprocess(blank, z.uuid("choice").optional()),
  date: z.preprocess(blank, z.string("required").regex(/^\d{4}-\d{2}-\d{2}$/, "date")),
  time: z.preprocess(blank, z.string("required").regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time")),
  duration: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : 30),
    z.number("choice").refine((n) => (DURATIONS as readonly number[]).includes(n), "choice"),
  ),
  notes: z.preprocess(blank, z.string().trim().max(2000, "tooLong").optional()),
});

export type ShowingInput = z.infer<typeof showingSchema>;
export type ParsedShowing = { ok: true; data: ShowingInput } | { ok: false; fieldErrors: Partial<Record<ShowingField, ShowingFormError>> };

export function parseShowingForm(formData: FormData): ParsedShowing {
  const raw = Object.fromEntries(SHOWING_FIELDS.map((field) => [field, formData.get(field) ?? undefined]));
  const result = showingSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<ShowingField, ShowingFormError>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ShowingField | undefined;
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = (SHOWING_FORM_ERRORS as readonly string[]).includes(issue.message) ? (issue.message as ShowingFormError) : "choice";
    }
  }
  return { ok: false, fieldErrors };
}
