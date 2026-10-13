import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { getContactDetail } from "@/features/contacts/detail-queries";
import { ContactHeader } from "@/features/contacts/components/contact-header";
import { ActivityForm } from "@/features/contacts/components/activity-form";
import { MatchesCard } from "@/features/contacts/components/matches-card";
import { DealsCard, ProfilesCard, RecommendationsCard } from "@/features/contacts/components/contact-cards";
import { ActivityList } from "@/features/properties/components/activity-list";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const ctx = await requireAppContext();
  const { id } = await params;
  const detail = UUID.test(id) ? await getContactDetail(ctx, id) : null;
  return { title: detail?.contact.full_name || detail?.contact.company || (await getTranslations("contacts.detail.notFound"))("title") };
}

/** Ügyfél-adatlap: fejléc gyors akciókkal, középen az idővonal, jobbra a keresési profilok és az ajánlások. */
export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppContext();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const detail = await getContactDetail(ctx, id);
  if (!detail) notFound();
  const t = await getTranslations("contacts.detail.timeline");

  return (
    <div className="flex max-w-[1400px] flex-col gap-6 p-5 md:p-8">
      <ContactHeader detail={detail} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="flex flex-col gap-5 p-6">
            <CardHeader title={t("title")} />
            <ActivityForm contactId={id} />
            <div className="border-t border-line-subtle pt-5">
              {detail.activities.length === 0 ? <EmptyState title={t("empty")} framed={false} /> : <ActivityList items={detail.activities} />}
            </div>
          </Card>
          <DealsCard deals={detail.deals} sellerProperties={detail.sellerProperties} />
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <ProfilesCard contactId={id} profiles={detail.profiles} />
          <MatchesCard contactId={id} matches={detail.matches} />
          <RecommendationsCard recommendations={detail.recommendations} />
        </aside>
      </div>
    </div>
  );
}
