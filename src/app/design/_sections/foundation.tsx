"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AgingBadge, Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import { AiButton, AiSuggestion, LockedFeature } from "@/components/ai/ai";
import { EmptyState } from "@/components/ui/feedback";
import { HouseIllustration } from "@/components/illustrations";
import { formatDate, formatMillions, formatPricePerSqm, formatTime } from "@/lib/format";

const panel = "flex flex-col gap-3.5 rounded-card-lg border border-line-card bg-surface p-6";
const panelTitle = "serif text-22 font-medium";

const SWATCHES = [
  { key: "primary", style: { background: "var(--primary)" }, hex: "#1F5C4A" },
  { key: "accent", style: { background: "var(--accent)" }, hex: "#C8763A", note: "#9A5422" },
  { key: "ai", style: { background: "linear-gradient(135deg, var(--ai-from), var(--ai-to))" }, hex: "#6D5BF6 → #C8763A" },
  { key: "ink", style: { background: "var(--ink)" }, hex: "#16181D" },
  { key: "bg", style: { background: "var(--bg)", border: "1px solid var(--line)" }, hex: "#F7F6F2" },
  { key: "muted", style: { background: "var(--muted)" }, hex: "#6B6F76" },
  { key: "success", style: { background: "var(--success)" }, hex: "#2E8B57" },
  { key: "warning", style: { background: "var(--warning)" }, hex: "#D9962B" },
  { key: "danger", style: { background: "var(--danger)" }, hex: "#C2453B" },
  { key: "darkBg", style: { background: "#0E1013" }, hex: "#0E1013" },
] as const;

/** Az Alapelemek.dc.html hat paneljének élő, tokenalapú újraépítése. */
export function FoundationSection() {
  const t = useTranslations("designPage");
  const tCall = useTranslations("dashboard.callList");
  const tRecent = useTranslations("dashboard.recent");
  const sample = new Date("2026-10-02T11:30:00Z");

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {/* Színek */}
      <section className={panel}>
        <h2 className={panelTitle}>{t("colors")}</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {SWATCHES.map((s) => (
            <div key={s.key} className="flex items-center gap-2.5">
              <span className="size-11 shrink-0 rounded-control" style={s.style} />
              <div className="flex min-w-0 flex-col">
                <span className="text-13 font-bold">{t(`colorNames.${s.key}`)}</span>
                <span className="text-12 text-muted">
                  {s.hex}
                  {"note" in s ? ` · ${t("accentNote")} ${s.note}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tipográfia */}
      <section className={panel}>
        <h2 className={panelTitle}>{t("typography")}</h2>
        <Sample label={t("typeSamples.priceLabel")}>
          <span className="serif text-44 leading-[1.05] font-medium">{formatMillions(94_500_000)}</span>
        </Sample>
        <Sample label={t("typeSamples.titleLabel")}>
          <span className="serif text-32 font-medium">{t("typeSamples.titleSample")}</span>
        </Sample>
        <Sample label={t("typeSamples.cardLabel")}>
          <span className="serif text-22 font-medium">{t("typeSamples.cardSample")}</span>
        </Sample>
        <Sample label={t("typeSamples.bodyLabel")}>
          <span className="text-15 leading-relaxed text-ink-2">{t("typeSamples.bodySample")}</span>
        </Sample>
        <Sample label={t("typeSamples.eyebrowLabel")}>
          <span className="text-12 font-bold tracking-[0.08em] text-muted">{t("typeSamples.eyebrowSample")}</span>
        </Sample>
        <span className="mt-auto text-13 text-muted">
          {t("typeSamples.formats", { perSqm: formatPricePerSqm(1_250_000), date: formatDate(sample), time: formatTime(sample) })}
        </span>
      </section>

      {/* Gombok és jelölők */}
      <section className={`${panel} gap-4`}>
        <h2 className={panelTitle}>{t("buttonsTitle")}</h2>
        <div className="flex flex-wrap gap-2.5">
          <Button>{t("buttons.primary")}</Button>
          <Button variant="secondary">{t("buttons.secondary")}</Button>
          <Button variant="ghost">{t("buttons.ghost")}</Button>
          <AiButton>{t("buttons.ai")}</AiButton>
          <Button variant="danger">{t("buttons.danger")}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="solid">{t("chips.listed")}</Badge>
          <Badge tone="accent">{t("chips.exclusive")}</Badge>
          <Badge tone="ai">✦ {t("chips.ai")}</Badge>
          <Badge tone="neutral">{t("chips.seller")}</Badge>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-12 text-muted">{t("aging")}</span>
          <div className="flex gap-2">
            <AgingBadge level="fresh">{t("agingLevels.fresh")}</AgingBadge>
            <AgingBadge level="aging">{t("agingLevels.aging")}</AgingBadge>
            <AgingBadge level="stale">{t("agingLevels.stale")}</AgingBadge>
          </div>
        </div>
        <Field label={t("priceLabel")} htmlFor="ds-price">
          <Input id="ds-price" defaultValue="94 500 000" trailing="Ft" wrapperClassName="border-primary shadow-[0_0_0_4px_var(--primary-ring)]" />
        </Field>
      </section>

      {/* AI javaslat */}
      <section className={panel}>
        <h2 className={panelTitle}>{t("aiTitle")}</h2>
        <AiSuggestion
          label={t("aiLabel")}
          missingInfo={t("aiMissing")}
          acceptLabel={t("accept")}
          editLabel={t("edit")}
          dismissLabel={t("dismiss")}
        >
          {t("aiSample")}
        </AiSuggestion>
        <span className="text-13 leading-normal text-muted">{t("aiRule")}</span>
      </section>

      {/* Zárolt prémium */}
      <section className={panel}>
        <h2 className={panelTitle}>{t("lockedTitle")}</h2>
        <LockedFeature
          planLabel="PRO AI"
          title={tCall("lockedTitle")}
          body={tCall("lockedBody")}
          ctaLabel={tCall("lockedCta")}
          preview={
            <div className="flex flex-col gap-2.5 p-[18px]">
              <div className="h-[18px] w-3/5 rounded-kbd bg-line-dashed-soft" />
              <div className="h-11 rounded-control bg-primary-soft" />
              <div className="h-11 rounded-control bg-primary-soft" />
              <div className="h-11 rounded-control bg-accent-soft" />
              <div className="h-11 rounded-control bg-ai-soft" />
            </div>
          }
        />
      </section>

      {/* Üres állapot */}
      <section className={panel}>
        <h2 className={panelTitle}>{t("emptyTitle")}</h2>
        <EmptyState
          className="flex-1"
          illustration={<HouseIllustration />}
          title={tRecent("empty")}
          description={tRecent("emptyBody")}
          action={<Button>{tRecent("emptyCta")}</Button>}
        />
        <span className="text-13 text-muted">{t("emptyRule")}</span>
      </section>
    </div>
  );
}

function Sample({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-12 text-muted">{label}</span>
      {children}
    </div>
  );
}

