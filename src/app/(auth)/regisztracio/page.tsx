import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignUpForm } from "../auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signUpTitle") };
}

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="serif text-38 leading-tight font-medium">{t("signUpTitle")}</h1>
        <p className="text-15 text-muted">{t("signUpSubtitle")}</p>
      </div>
      <SignUpForm />
    </div>
  );
}
