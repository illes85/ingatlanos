import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/feedback";
import { HouseIllustration } from "@/components/illustrations";

/** Kikapcsolt, elkelt vagy téves linkű nyilvános oldal: nincs belépési gomb, az oldal látogatóknak szól. */
export default async function PublicNotFound() {
  const t = await getTranslations("publicPage.notFound");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <EmptyState className="w-full max-w-md bg-surface" illustration={<HouseIllustration />} title={t("title")} description={t("body")} />
    </main>
  );
}
