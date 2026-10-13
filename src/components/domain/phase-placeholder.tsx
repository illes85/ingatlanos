import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { NavKey } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import {
  BoardIllustration,
  CalendarIllustration,
  DocumentIllustration,
  HouseIllustration,
  InboxIllustration,
  PeopleIllustration,
} from "@/components/illustrations";

const ILLUSTRATION: Partial<Record<NavKey, React.ReactNode>> = {
  properties: <HouseIllustration />,
  contacts: <PeopleIllustration />,
  leads: <InboxIllustration />,
  deals: <BoardIllustration />,
  calendar: <CalendarIllustration />,
  tasks: <CalendarIllustration />,
  documents: <DocumentIllustration />,
};

/** Átmeneti oldal azokhoz a menüpontokhoz, amelyek egy későbbi fázisban készülnek el. */
export async function PhasePlaceholder({ section }: { section: NavKey | "plans" }) {
  const t = await getTranslations();
  const title = section === "plans" ? t("shell.choosePlan") : t(`nav.${section}`);
  return (
    <div className="flex flex-col gap-6 p-5 md:p-8">
      <h1 className="serif hidden text-34 font-medium md:block">{title}</h1>
      <EmptyState
        className="min-h-[360px] bg-surface"
        illustration={section !== "plans" ? ILLUSTRATION[section] ?? <HouseIllustration /> : <DocumentIllustration />}
        title={t("placeholder.title", { section: title })}
        description={t("placeholder.body")}
        action={
          <Button asChild variant="secondary">
            <Link href="/ma">{t("placeholder.back")}</Link>
          </Button>
        }
      />
    </div>
  );
}
