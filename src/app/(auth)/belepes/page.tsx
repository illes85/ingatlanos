import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { publicEnv, serverEnv } from "@/lib/env";
import { DemoLogin, SignInForm } from "../auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signInTitle") };
}

export default async function SignInPage(props: PageProps<"/belepes">) {
  const searchParams = await props.searchParams;
  const t = await getTranslations("auth");
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const { demoMode } = serverEnv();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="serif text-38 leading-tight font-medium">{t("signInTitle")}</h1>
        <p className="text-15 text-muted">{t("signInSubtitle")}</p>
      </div>
      {demoMode ? <DemoLogin /> : null}
      <SignInForm next={next} googleEnabled={publicEnv.googleAuthEnabled} callbackError={searchParams.error === "callback"} />
    </div>
  );
}
