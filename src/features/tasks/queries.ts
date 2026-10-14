import { createClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/session";
import { budapestDayRange } from "@/lib/format";
import { ruleToRepeat, type Repeat } from "./recurrence";

export const TASK_TABS = ["nyitott", "ma", "kesz"] as const;
export type TaskTab = (typeof TASK_TABS)[number];

export function parseTaskTab(value: string | string[] | undefined): TaskTab {
  const v = Array.isArray(value) ? value[0] : value;
  return (TASK_TABS as readonly string[]).includes(v ?? "") ? (v as TaskTab) : "nyitott";
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: "low" | "normal" | "high";
  done: boolean;
  repeat: Repeat;
  assigneeId: string | null;
  assigneeName: string | null;
  contact: { id: string; name: string } | null;
  property: { id: string; label: string } | null;
}

export interface TaskListResult {
  items: TaskItem[];
  counts: Record<TaskTab, number>;
}

const COLUMNS =
  "id, title, description, due_at, priority, status, recurrence_rule, assignee_id, assignee:profiles!tasks_assignee_id_fkey (full_name), contact:contacts (id, full_name, company), property:properties (id, code, title)";

/** A feladatok az RLS szerint jönnek: az ügynök a sajátját, az irodavezető mindet látja. */
export async function getTasks(ctx: AppContext, tab: TaskTab, now = new Date()): Promise<TaskListResult> {
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const endOfToday = budapestDayRange(now).end.toISOString();

  const base = () => supabase.from("tasks").select(COLUMNS).eq("organization_id", orgId);
  const count = (build: (q: ReturnType<typeof countBase>) => ReturnType<typeof countBase>) => build(countBase());
  const countBase = () => supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", orgId);

  let list = base();
  if (tab === "kesz") list = list.eq("status", "done").order("completed_at", { ascending: false, nullsFirst: false });
  else if (tab === "ma") list = list.eq("status", "open").lt("due_at", endOfToday).order("due_at");
  else list = list.eq("status", "open").order("due_at", { ascending: true, nullsFirst: false });

  const [rows, open, today, done] = await Promise.all([
    list.limit(200),
    count((q) => q.eq("status", "open")),
    count((q) => q.eq("status", "open").lt("due_at", endOfToday)),
    count((q) => q.eq("status", "done")),
  ]);

  const items: TaskItem[] = (rows.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    dueAt: t.due_at,
    priority: t.priority,
    done: t.status === "done",
    repeat: ruleToRepeat(t.recurrence_rule),
    assigneeId: t.assignee_id,
    assigneeName: t.assignee?.full_name ?? null,
    contact: t.contact ? { id: t.contact.id, name: t.contact.full_name || t.contact.company || "–" } : null,
    property: t.property ? { id: t.property.id, label: `${t.property.code} · ${t.property.title ?? ""}` } : null,
  }));
  return { items, counts: { nyitott: open.count ?? 0, ma: today.count ?? 0, kesz: done.count ?? 0 } };
}
