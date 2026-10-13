import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FoundationSection } from "./_sections/foundation";
import { ComponentsSection } from "./_sections/components";
import { ThemeSwitch } from "./_sections/theme-switch";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("designPage");
  return { title: t("title"), robots: { index: false } };
}

/**
 * Belső design system oldal. Felső része az Alapelemek.dc.html terv hű mása,
 * alatta a teljes komponenskészlet minden állapotával.
 */
export default async function DesignPage() {
  const t = await getTranslations("designPage");
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-10 sm:px-8 lg:p-14">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-12 font-bold tracking-[0.08em] text-muted">{t("eyebrow")}</span>
            <h1 className="serif text-38 font-medium sm:text-48">{t("title")}</h1>
          </div>
          <div className="flex flex-col items-end gap-3">
            <ThemeSwitch />
            <span className="max-w-[460px] text-right text-14 leading-normal text-muted">{t("lead")}</span>
          </div>
        </header>
        <FoundationSection />
        <ComponentsSection />
      </div>
    </div>
  );
}
