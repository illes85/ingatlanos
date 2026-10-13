import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPropertyDetail } from "@/features/properties/detail-queries";
import { getAgentOptions } from "@/features/properties/queries";
import { propertyToFormValues } from "@/features/properties/form-values";
import { PropertyForm } from "@/features/properties/components/property-form";
import { PhotoManager } from "@/features/properties/components/photo-manager";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties.form");
  return { title: t("titleEdit") };
}

/** Szerkesztő: fotókezelő felül (felvétel után ide érkezik a felhasználó), alatta az adatok űrlapja. */
export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAppContext();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [detail, agents, t, query] = await Promise.all([getPropertyDetail(ctx, id), getAgentOptions(ctx), getTranslations("properties.form"), searchParams]);
  if (!detail) notFound();

  const photos = detail.media
    .filter((m) => m.kind === "photo" && m.url)
    .map((m) => ({ id: m.id, url: m.url!, isCover: m.isCover, isPublic: m.isPublic, caption: m.caption }));
  const justCreated = query.uj === "1";

  return (
    <div className="flex max-w-[1100px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="serif text-34 leading-tight font-medium">{detail.property.title}</h1>
        <p className="text-15 text-muted">{t("subtitleEdit")}</p>
      </header>

      {justCreated ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line-card bg-primary-soft px-5 py-4">
          <span className="text-14 font-semibold text-primary">{t("newBanner")}</span>
          <Button asChild size="sm">
            <Link href={`/ingatlanok/${id}`}>{t("toDetail")}</Link>
          </Button>
        </div>
      ) : null}

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="serif text-22 font-medium">{t("photos.title")}</h2>
        <PhotoManager
          key={photos.map((p) => `${p.id}${p.isCover}`).join()}
          propertyId={id}
          organizationId={ctx.organization.id}
          initialPhotos={photos}
        />
      </Card>

      <PropertyForm
        mode="edit"
        propertyId={id}
        defaults={propertyToFormValues(detail.property, detail.commission?.pct ?? null)}
        agents={agents}
        canEditCommission={ctx.role !== "assistant"}
      />
    </div>
  );
}
