"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Repeat, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatShortDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteTask, setTaskDone } from "../actions";
import { END_OF_DAY } from "../recurrence";
import type { TaskItem } from "../queries";

function TaskRow({ task, nowIso, showAssignee }: { task: TaskItem; nowIso: string; showAssignee: boolean }) {
  const t = useTranslations("tasks");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const overdue = !task.done && task.dueAt !== null && task.dueAt < nowIso;
  const time = task.dueAt ? formatTime(task.dueAt) : null;

  const run = (action: () => Promise<{ ok: boolean }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(t("toast.failed"));
        return;
      }
      toast.success(success);
      router.refresh();
    });

  return (
    <li data-testid="task-row" className={cn("flex items-start gap-3 p-4", pending && "opacity-60")}>
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? t("reopen") : t("complete")}
        disabled={pending}
        onClick={() => run(() => setTaskDone(task.id, !task.done), task.done ? t("toast.reopened") : t("toast.done"))}
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          task.done ? "border-primary bg-primary text-on-primary" : "border-line-strong hover:border-primary",
        )}
      >
        {task.done ? <Check size={14} aria-hidden="true" /> : null}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-15 font-semibold", task.done && "text-muted line-through")}>{task.title}</span>
          {task.priority === "high" && !task.done ? (
            <Badge tone="danger" size="xs">
              {t("priority.high")}
            </Badge>
          ) : null}
          {task.repeat !== "none" ? (
            <Badge tone="neutral" size="xs">
              <Repeat size={11} aria-hidden="true" />
              {t(`repeat.${task.repeat}`)}
            </Badge>
          ) : null}
        </div>
        {task.description ? <p className="text-14 text-muted">{task.description}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-13 text-muted">
          {task.dueAt ? (
            <span className={cn(overdue && "font-semibold text-danger-text")}>
              {overdue ? `${t("overdue")} · ` : ""}
              {formatShortDate(task.dueAt)}
              {time && time !== END_OF_DAY ? ` ${time}` : ""}
            </span>
          ) : (
            <span>{t("noDue")}</span>
          )}
          {task.property ? (
            <Link href={`/ingatlanok/${task.property.id}`} className="font-semibold text-primary hover:underline">
              {task.property.label}
            </Link>
          ) : null}
          {task.contact ? (
            <Link href={`/ugyfelek/${task.contact.id}`} className="font-semibold text-primary hover:underline">
              {task.contact.name}
            </Link>
          ) : null}
          {showAssignee && task.assigneeName ? <span>{task.assigneeName}</span> : null}
        </div>
      </div>
      <button
        type="button"
        aria-label={t("delete")}
        disabled={pending}
        onClick={() => {
          if (window.confirm(t("confirmDelete"))) run(() => deleteTask(task.id), t("toast.deleted"));
        }}
        className="flex size-9 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-muted hover:text-danger-text"
      >
        <Trash2 size={17} aria-hidden="true" />
      </button>
    </li>
  );
}

/** Feladatlista: pipával elvégezhető, törölhető. A „késik” jelzéshez a szerver ideje szolgál. */
export function TaskList({ items, nowIso, showAssignee }: { items: TaskItem[]; nowIso: string; showAssignee: boolean }) {
  return (
    <Card className="overflow-hidden p-0">
      <ul className="divide-y divide-line">
        {items.map((task) => (
          <TaskRow key={task.id} task={task} nowIso={nowIso} showAssignee={showAssignee} />
        ))}
      </ul>
    </Card>
  );
}
