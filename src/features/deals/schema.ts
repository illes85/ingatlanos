import { z } from "zod";
import { STAGES_BY_SIDE, type DealSide, type DealStage } from "@/config/pipeline";

export const DEAL_FORM_ERRORS = ["required", "choice", "number", "date", "tooLong", "stage"] as const;
export type DealFormError = (typeof DEAL_FORM_ERRORS)[number];

export const DEAL_FIELDS = ["side", "stage", "propertyId", "contactId", "agentId", "title", "expectedValueM", "probability", "expectedCloseDate", "notes"] as const;
export type DealField = (typeof DEAL_FIELDS)[number];

const blank = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const uuid = z.preprocess(blank, z.uuid("choice").optional());

/** „94,5” vagy „94.5” millió forint. */
const millions = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? Number(v.replace(/\s/g, "").replace(",", ".")) : undefined),
  z.number("number").min(0, "number").max(100_000, "number").optional(),
);

export const dealSchema = z
  .object({
    side: z.enum(["seller", "buyer"], "choice"),
    stage: z.string().min(1, "required"),
    propertyId: uuid,
    contactId: uuid,
    agentId: uuid,
    title: z.preprocess(blank, z.string().trim().max(120, "tooLong").optional()),
    expectedValueM: millions,
    probability: z.preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : undefined),
      z.number("number").int("number").min(0, "number").max(100, "number").optional(),
    ),
    expectedCloseDate: z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date").optional()),
    notes: z.preprocess(blank, z.string().trim().max(4000, "tooLong").optional()),
  })
  .superRefine((value, ctx) => {
    if (!(STAGES_BY_SIDE[value.side as DealSide] as readonly string[]).includes(value.stage)) {
      ctx.addIssue({ code: "custom", path: ["stage"], message: "stage" });
    }
    if (!value.propertyId && !value.contactId && !value.title) {
      ctx.addIssue({ code: "custom", path: ["title"], message: "required" });
    }
  });

export type DealInput = Omit<z.infer<typeof dealSchema>, "stage"> & { stage: DealStage };
export type ParsedDeal = { ok: true; data: DealInput } | { ok: false; fieldErrors: Partial<Record<DealField, DealFormError>> };

export function parseDealForm(formData: FormData): ParsedDeal {
  const raw = Object.fromEntries(DEAL_FIELDS.map((field) => [field, formData.get(field) ?? undefined]));
  const result = dealSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data as DealInput };
  const fieldErrors: Partial<Record<DealField, DealFormError>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as DealField | undefined;
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = (DEAL_FORM_ERRORS as readonly string[]).includes(issue.message) ? (issue.message as DealFormError) : "choice";
    }
  }
  return { ok: false, fieldErrors };
}
