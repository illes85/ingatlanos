import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { HouseIllustration } from "@/components/illustrations";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <EmptyState
        className="w-full max-w-md bg-surface"
        illustration={<HouseIllustration />}
        title={t("notFoundTitle")}
        description={t("notFoundBody")}
        action={
          <Button asChild>
            <Link href="/ma">{t("home")}</Link>
          </Button>
        }
      />
    </main>
  );
}
