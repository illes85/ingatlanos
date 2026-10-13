import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { getPropertyDetail } from "@/features/properties/detail-queries";
import { DetailHeader } from "@/features/properties/components/detail-header";
import { DetailTabs, parseDetailTab } from "@/features/properties/components/detail-tabs";
import { PropertyGallery } from "@/features/properties/components/property-gallery";
import { SummaryCard } from "@/features/properties/components/summary-card";
import { OverviewTab } from "@/features/properties/components/overview-tab";
import { DocumentsTab, LeadsTab, PhotosTab, ShowingsTab, TimelineTab } from "@/features/properties/components/detail-lists";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const ctx = await requireAppContext();
  const { id } = await params;
  const detail = UUID.test(id) ? await getPropertyDetail(ctx, id) : null;
  return { title: detail?.property.title ?? (await getTranslations("properties.detail.notFound"))("title") };
}

/** Ingatlan-adatlap — Ingatlan.dc.html szerint: fotómozaik + ragadós összegzőkártya, alatta URL-vezérelt fülek. */
export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAppContext();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const detail = await getPropertyDetail(ctx, id);
  if (!detail) notFound();

  const rawTab = (await searchParams).ful;
  const tab = parseDetailTab(Array.isArray(rawTab) ? rawTab[0] : rawTab);
  const { property: p } = detail;
  const alt = [p.city, p.street].filter(Boolean).join(", ");
  const photos = detail.media
    .filter((m) => m.kind === "photo" && m.url)
    .map((m) => ({ id: m.id, url: m.url!, caption: m.caption }));

  return (
    <div className="flex max-w-[1400px] flex-col gap-6 p-5 md:p-8">
      <DetailHeader detail={detail} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <PropertyGallery photos={photos} propertyId={p.id} propertyType={p.property_type} alt={alt} />
        <SummaryCard detail={detail} className="xl:sticky xl:top-6" />
      </div>

      <DetailTabs propertyId={p.id} active={tab} detail={detail} />

      <section aria-label={tab}>
        {tab === "attekintes" ? <OverviewTab detail={detail} /> : null}
        {tab === "fotok" ? <PhotosTab media={detail.media} alt={alt} /> : null}
        {tab === "erdeklodok" ? <LeadsTab leads={detail.leads} /> : null}
        {tab === "bemutatok" ? <ShowingsTab showings={detail.showings} /> : null}
        {tab === "dokumentumok" ? <DocumentsTab documents={detail.documents} /> : null}
        {tab === "idovonal" ? <TimelineTab activities={detail.activities} /> : null}
      </section>
    </div>
  );
}
