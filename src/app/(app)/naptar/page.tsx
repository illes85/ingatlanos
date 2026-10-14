import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { budapestDayKey } from "@/lib/format";
import { parseCalendarParams, visibleDays } from "@/features/showings/calendar";
import { getCalendarItems } from "@/features/showings/queries";
import { CalendarView } from "@/features/showings/components/calendar-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("calendar") };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireAppContext();
  const now = new Date();
  const params = parseCalendarParams(await searchParams, now);
  const items = await getCalendarItems(ctx, visibleDays(params));
  return (
    <div className="flex max-w-[1400px] flex-col gap-6 p-5 md:p-8">
      <CalendarView params={params} today={budapestDayKey(now)} items={items} />
    </div>
  );
}
