import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { BrandMark } from "@/components/shell/nav-icons";

/** Belépés / regisztráció / onboarding keret: bal oldalt márkás panel, jobbra az űrlap. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("designPage");
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-white lg:flex lg:flex-col">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_0%,rgba(255,255,255,0.12),transparent_60%),radial-gradient(90%_70%_at_100%_100%,rgba(200,118,58,0.35),transparent_60%)]" />
        <div className="relative flex items-center gap-3">
          <span className="rounded-[11px] ring-1 ring-white/25">
            <BrandMark size={40} />
          </span>
          <span className="serif text-28 font-semibold">{brand.name}</span>
        </div>
        <div className="relative mt-auto max-w-[520px]">
          <p className="serif text-44 leading-[1.08] font-medium">{brand.tagline}</p>
          <p className="mt-5 max-w-[420px] text-15 leading-relaxed text-white/75">{t("lead")}</p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px] animate-page-in">{children}</div>
      </main>
    </div>
  );
}
