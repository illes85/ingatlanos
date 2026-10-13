import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { PeopleIllustration } from "@/components/illustrations";

export default async function ContactNotFound() {
  const t = await getTranslations("contacts.detail.notFound");
  return (
    <div className="p-5 md:p-8">
      <EmptyState
        illustration={<PeopleIllustration />}
        title={t("title")}
        description={t("body")}
        className="py-16"
        action={
          <Button asChild>
            <Link href="/ugyfelek">{(await getTranslations("contacts"))("title")}</Link>
          </Button>
        }
      />
    </div>
  );
}
