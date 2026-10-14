import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { formatDateWithWeekday, formatTime } from "@/lib/format";
import { getShowingDetail } from "@/features/showings/queries";
import { PrintButton } from "@/features/showings/components/print-button";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("showings.sheet");
  return { title: t("title") };
}

/** Nyomtatható bemutatási lap / megtekintési nyilatkozat. TODO(jogász): a nyilatkozat szövegének jogi ellenőrzése. */
export default async function ShowingSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppContext();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const showing = await getShowingDetail(ctx, id);
  if (!showing) notFound();
  const t = await getTranslations("showings.sheet");

  const row = (label: string, value: string) => (
    <div className="flex gap-3 border-b border-line py-2.5 text-15">
      <span className="w-40 shrink-0 text-muted">{label}</span>
      <span className="font-semibold">{value || "–"}</span>
    </div>
  );

  return (
    <div className="flex max-w-[760px] flex-col gap-6 p-5 md:p-8 print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/naptar/${showing.id}`} className="text-14 text-muted hover:text-ink">
          ← {t("back")}
        </Link>
        <PrintButton />
      </div>
      <article className="flex flex-col gap-5" data-testid="showing-sheet">
        <h1 className="serif text-34 leading-tight font-medium">{t("title")}</h1>
        <div>
          {row(t("property"), showing.property ? `${showing.property.code} · ${showing.property.address}` : "")}
          {row(t("when"), `${formatDateWithWeekday(showing.startsAt)}, ${formatTime(showing.startsAt)}`)}
          {row(t("agent"), showing.agentName ?? "")}
          {row(t("buyer"), showing.buyer?.name ?? "")}
        </div>
        <p className="text-15 leading-relaxed">{t("declaration")}</p>
        <div className="mt-10 grid grid-cols-2 gap-10">
          <div className="flex flex-col gap-2 border-t border-ink pt-2 text-14 text-muted">{t("signBuyer")}</div>
          <div className="flex flex-col gap-2 border-t border-ink pt-2 text-14 text-muted">{t("signAgent")}</div>
        </div>
      </article>
    </div>
  );
}
