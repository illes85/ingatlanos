import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { requireAppContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { CalendarIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { getTasks, parseTaskTab, TASK_TABS } from "@/features/tasks/queries";
import { TaskList } from "@/features/tasks/components/task-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("tasks") };
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireAppContext();
  const tab = parseTaskTab((await searchParams).allapot);
  const now = new Date();
  const [t, { items, counts }] = await Promise.all([getTranslations("tasks"), getTasks(ctx, tab, now)]);

  return (
    <div className="flex max-w-[900px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <h1 className="serif text-34 leading-tight font-medium">{t("title")}</h1>
          <Button asChild>
            <Link href="/feladatok/uj">
              <Plus size={18} aria-hidden="true" />
              {t("newTask")}
            </Link>
          </Button>
        </div>
        <nav aria-label={t("tabsLabel")} className="flex flex-wrap gap-2">
          {TASK_TABS.map((key) => {
            const active = key === tab;
            return (
              <Link
                key={key}
                href={key === "nyitott" ? "/feladatok" : `/feladatok?allapot=${key}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full border px-4 text-14 font-semibold transition-colors",
                  active ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                {t(`tabs.${key}`)}
                <span className={cn("text-12", active ? "text-primary" : "text-muted")}>{counts[key]}</span>
              </Link>
            );
          })}
        </nav>
      </header>
      {items.length === 0 ? (
        <EmptyState illustration={<CalendarIllustration />} title={t(`empty.${tab}.title`)} description={t(`empty.${tab}.body`)} className="py-16" />
      ) : (
        <TaskList items={items} nowIso={now.toISOString()} showAssignee={ctx.role !== "agent"} />
      )}
    </div>
  );
}
