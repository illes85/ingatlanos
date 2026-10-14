"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { combineDueAt, repeatToRule } from "./recurrence";
import { parseTaskForm, type TaskField, type TaskFormError } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TaskFormState {
  fieldErrors?: Partial<Record<TaskField, TaskFormError>>;
  error?: "generic" | "forbidden";
}

export type TaskResult = { ok: true } | { ok: false; error: "generic" | "forbidden" };

/** Új feladat. A felelős alapból az, aki felveszi; kijelölni az owner és az asszisztens tud mást (az adatbázis is őrzi). */
export async function createTask(_: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const ctx = await requireAppContext();
  const parsed = parseTaskForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  const input = parsed.data;
  const supabase = await createClient();

  const assigneeId = ctx.role === "agent" ? ctx.userId : (input.assigneeId ?? ctx.userId);
  const { error } = await supabase.from("tasks").insert({
    organization_id: ctx.organization.id,
    title: input.title,
    description: input.description ?? null,
    due_at: input.dueDate ? combineDueAt(input.dueDate, input.dueTime).toISOString() : null,
    priority: input.priority,
    recurrence_rule: repeatToRule(input.repeat),
    contact_id: input.contactId ?? null,
    property_id: input.propertyId ?? null,
    assignee_id: assigneeId,
  });
  if (error) return { error: error.code === "42501" ? "forbidden" : "generic" };
  revalidatePath("/feladatok");
  revalidatePath("/ma");
  redirect("/feladatok");
}

/** Elvégzettnek jelölés / visszanyitás. Az ismétlődő feladat következő előfordulását az adatbázis hozza létre. */
export async function setTaskDone(taskId: string, done: boolean): Promise<TaskResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(taskId)) return { ok: false, error: "generic" };
  const supabase = await createClient();

  // Ismétlődő feladatnál a következő példányt az adatbázis-trigger hozza létre (app.tasks_recur), atomikusan.
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: done ? "done" : "open" })
    .eq("id", taskId)
    .eq("organization_id", ctx.organization.id)
    .eq("status", done ? "open" : "done")
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "forbidden" };
  revalidatePath("/feladatok");
  revalidatePath("/ma");
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<TaskResult> {
  const ctx = await requireAppContext();
  if (!UUID.test(taskId)) return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").delete().eq("id", taskId).eq("organization_id", ctx.organization.id).select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "forbidden" };
  revalidatePath("/feladatok");
  revalidatePath("/ma");
  return { ok: true };
}
