import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { getDealBoard } from "@/features/deals/queries";
import { DealsHeader } from "@/features/deals/components/deals-header";
import { DealsBoard } from "@/features/deals/components/deals-board";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("deals") };
}

/** Ügyletek: kanban tábla eladói és vevői oldallal; az oldal az URL-ben él (?oldal=vevo). */
export default async function DealsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireAppContext();
  const params = await searchParams;
  const side = params.oldal === "vevo" ? "buyer" : "seller";
  const board = await getDealBoard(ctx, side);
  const canCreate = ctx.role !== "assistant";

  return (
    <div className="flex max-w-[1800px] flex-col gap-6 p-5 md:p-8">
      <DealsHeader side={side} openCount={board.openCount} weightedValue={board.weightedValue} canCreate={canCreate} />
      <DealsBoard key={side} side={side} deals={board.deals} canCreate={canCreate} />
    </div>
  );
}
