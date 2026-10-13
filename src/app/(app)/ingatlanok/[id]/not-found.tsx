import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { HouseIllustration } from "@/components/illustrations";

export default async function PropertyNotFound() {
  const t = await getTranslations("properties.detail.notFound");
  return (
    <div className="p-5 md:p-8">
      <EmptyState
        illustration={<HouseIllustration />}
        title={t("title")}
        description={t("body")}
        className="py-16"
        action={
          <Button asChild>
            <Link href="/ingatlanok">{(await getTranslations("properties"))("title")}</Link>
          </Button>
        }
      />
    </div>
  );
}
