import { z } from "zod";
import { REPEATS } from "./recurrence";

export const TASK_FORM_ERRORS = ["required", "choice", "date", "time", "tooLong"] as const;
export type TaskFormError = (typeof TASK_FORM_ERRORS)[number];

export const TASK_FIELDS = ["title", "description", "dueDate", "dueTime", "priority", "repeat", "contactId", "propertyId", "assigneeId"] as const;
export type TaskField = (typeof TASK_FIELDS)[number];

const blank = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const uuid = z.preprocess(blank, z.uuid("choice").optional());

const taskSchema = z
  .object({
    title: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string("required").min(1, "required").max(160, "tooLong")),
    description: z.preprocess(blank, z.string().trim().max(2000, "tooLong").optional()),
    dueDate: z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date").optional()),
    dueTime: z.preprocess(blank, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time").optional()),
    priority: z.enum(["low", "normal", "high"], "choice").default("normal"),
    repeat: z.enum(REPEATS, "choice").default("none"),
    contactId: uuid,
    propertyId: uuid,
    assigneeId: uuid,
  })
  .superRefine((value, ctx) => {
    // Ismétlődéshez és időponthoz kell nap.
    if ((value.repeat !== "none" || value.dueTime) && !value.dueDate) {
      ctx.addIssue({ code: "custom", path: ["dueDate"], message: "required" });
    }
  });

export type TaskInput = z.infer<typeof taskSchema>;
export type ParsedTask = { ok: true; data: TaskInput } | { ok: false; fieldErrors: Partial<Record<TaskField, TaskFormError>> };

export function parseTaskForm(formData: FormData): ParsedTask {
  const raw = Object.fromEntries(TASK_FIELDS.map((field) => [field, formData.get(field) ?? undefined]));
  const result = taskSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<TaskField, TaskFormError>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as TaskField | undefined;
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = (TASK_FORM_ERRORS as readonly string[]).includes(issue.message) ? (issue.message as TaskFormError) : "choice";
    }
  }
  return { ok: false, fieldErrors };
}
