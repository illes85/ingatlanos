import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatArea, formatHuf, formatInteger, formatPostalAddress, formatPricePerSqm, formatRooms, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { lookupLabel } from "@/features/properties/lookup-label";
import { getPublicProperty } from "@/features/public-page/queries";
import { InquiryForm } from "@/features/public-page/components/inquiry-form";

const SLUG = /^[a-z0-9-]{8,120}$/;

const load = cache(async (slug: string) => (SLUG.test(slug) ? getPublicProperty(slug) : null));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await load(slug);
  if (!property) return { title: (await getTranslations("publicPage"))("notFoundTitle"), robots: { index: false } };
  const description = (property.description ?? "").replace(/\s+/g, " ").slice(0, 160);
  const cover = property.photos[0]?.url;
  return {
    title: property.title,
    description,
    // A megosztott link nem kerül be a keresőkbe, amíg az iroda ezt külön nem kéri.
    robots: { index: false, follow: false },
    openGraph: { title: property.title, description, type: "website", images: cover ? [{ url: cover }] : undefined },
  };
}

/** Nyilvános, mobilbarát ingatlan-oldal: fotók, adatok, az ügynök névjegye és az érdeklődési űrlap. */
export default async function PublicPropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();

  const [t, tEnums, tProps, label] = await Promise.all([
    getTranslations("publicPage"),
    getTranslations("enums"),
    getTranslations("properties"),
    lookupLabel(),
  ]);

  const street = [p.street, p.house_number].filter(Boolean).join(" ");
  const address = formatPostalAddress({ city: p.city, district: p.district, street: street || null, postalCode: p.postal_code });
  const isRent = p.transaction_type === "rent";
  const price = isRent ? `${formatHuf(p.price)}${t("perMonth")}` : formatHuf(p.price);

  const facts: { key: string; value: string }[] = [];
  const add = (key: string, value: string | null | undefined) => {
    if (value) facts.push({ key, value });
  };
  add("area", p.area_sqm ? formatArea(p.area_sqm) : null);
  add("rooms", p.rooms ? formatRooms(p.rooms, p.half_rooms) : null);
  add("bathrooms", p.bathrooms ? String(p.bathrooms) : null);
  add("floor", p.floor === null ? null : p.floor === 0 ? t("groundFloor") : `${p.floor}.${p.building_floors ? ` / ${p.building_floors}` : ""}`);
  add("elevator", p.has_elevator === null ? null : p.has_elevator ? t("yes") : t("no"));
  add("lot", p.lot_sqm ? formatArea(p.lot_sqm) : null);
  add("year", p.year_built ? String(p.year_built) : null);
  add("condition", p.condition ? label("condition", p.condition) : null);
  add("heating", p.heating ? label("heating", p.heating) : null);
  add("parking", p.parking ? label("parking", p.parking) : null);
  add("energy", p.energy_rating);
  add("balcony", p.balcony_sqm ? formatArea(p.balcony_sqm) : null);
  add("terrace", p.has_terrace ? t("yes") : null);
  add("garden", p.garden_connected ? t("yes") : null);
  add("utilities", p.utilities_monthly ? `${formatInteger(p.utilities_monthly)} Ft${t("perMonth")}` : null);
  add("commonCost", p.common_cost_monthly ? `${formatInteger(p.common_cost_monthly)} Ft${t("perMonth")}` : null);

  const [cover, ...others] = p.photos;

  return (
    <div className="min-h-dvh bg-background pb-24 lg:pb-0">
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-4 py-5 md:px-8 md:py-10">
        {cover ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr] md:grid-rows-2" data-testid="public-gallery">
            <div className="relative aspect-[4/3] overflow-hidden rounded-card-lg bg-surface-muted md:row-span-2 md:aspect-auto md:min-h-[420px]">
              <Image src={cover.url} alt={cover.caption ?? p.title} fill unoptimized priority sizes="(min-width: 768px) 66vw, 100vw" className="object-cover" />
            </div>
            {others.slice(0, 2).map((photo) => (
              <div key={photo.url} className="relative hidden aspect-[4/3] overflow-hidden rounded-card-lg bg-surface-muted md:block md:aspect-auto">
                <Image src={photo.url} alt={photo.caption ?? ""} fill unoptimized sizes="33vw" className="object-cover" />
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <article className="flex flex-col gap-7">
            <header className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="solid">{tProps(`transactionBadge.${p.transaction_type}`)}</Badge>
                <Badge tone="neutral">{p.subtype ?? tEnums(`propertyType.${p.property_type}`)}</Badge>
                {p.status !== "active" ? <Badge tone="accent">{tEnums(`propertyStatus.${p.status}`)}</Badge> : null}
              </div>
              <h1 className="serif text-34 leading-tight font-medium md:text-[44px]">{p.title}</h1>
              <p className="text-16 text-muted">{address}</p>
              <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="serif text-[34px] font-medium" data-testid="public-price">
                  {price}
                </span>
                {!isRent && p.area_sqm ? <span className="text-14 text-muted">{formatPricePerSqm(Math.round(p.price / p.area_sqm))}</span> : null}
              </p>
            </header>

            {facts.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-card-lg border border-line bg-surface p-5 sm:grid-cols-3">
                {facts.map((f) => (
                  <div key={f.key} className="flex flex-col gap-0.5">
                    <dt className="text-12 font-semibold tracking-wide text-muted uppercase">{t(`facts.${f.key}` as Parameters<typeof t>[0])}</dt>
                    <dd className="text-15 font-semibold">{f.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {p.highlights.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {p.highlights.map((h) => (
                  <li key={h}>
                    <Badge tone="primary" size="md">
                      {h}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}

            {p.description ? (
              <section className="flex flex-col gap-2">
                <h2 className="serif text-22 font-medium">{t("description")}</h2>
                <p className="text-16 leading-relaxed whitespace-pre-line text-ink-2">{p.description}</p>
              </section>
            ) : null}

            {others.length > 0 ? (
              <section className={cn("flex flex-col gap-3", others.length <= 2 && "md:hidden")} aria-label={t("morePhotos")}>
                <h2 className="serif text-22 font-medium">{t("morePhotos")}</h2>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {others.map((photo, index) => (
                    <div key={photo.url} className={cn("relative aspect-[4/3] overflow-hidden rounded-card bg-surface-muted", index < 2 && "md:hidden")}>
                      <Image src={photo.url} alt={photo.caption ?? ""} fill unoptimized loading="lazy" sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-6" aria-label={t("contact")}>
            {p.agent.name ? (
              <Card className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-18 font-bold text-primary" aria-hidden="true">
                    {initials(p.agent.name)}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-17 font-bold">{p.agent.name}</span>
                    <span className="text-13 text-muted">{[t("agentRole"), p.office].filter(Boolean).join(" · ")}</span>
                    {p.agent.license ? <span className="text-12 text-muted">{t("license", { number: p.agent.license })}</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.agent.phone ? (
                    <Button asChild>
                      <a href={`tel:${p.agent.phone.replace(/[^+\d]/g, "")}`}>
                        <Phone size={16} aria-hidden="true" />
                        {t("call")}
                      </a>
                    </Button>
                  ) : null}
                  {p.agent.email ? (
                    <Button variant="secondary" asChild>
                      <a href={`mailto:${p.agent.email}`}>
                        <Mail size={16} aria-hidden="true" />
                        {t("email")}
                      </a>
                    </Button>
                  ) : null}
                </div>
              </Card>
            ) : null}

            <Card id="erdeklodes" className="flex scroll-mt-6 flex-col gap-4 p-5">
              <h2 className="serif text-22 font-medium">{t("inquiry.title")}</h2>
              <InquiryForm slug={slug} />
            </Card>
          </aside>
        </div>

        <footer className="border-t border-line pt-5 text-12 text-muted">{t("footer")}</footer>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 p-3 backdrop-blur lg:hidden">
        <Button asChild size="lg" className="w-full">
          <a href="#erdeklodes">{t("inquiry.cta")}</a>
        </Button>
      </div>
    </div>
  );
}
