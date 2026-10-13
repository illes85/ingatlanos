"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgingBadge, Badge, CountBadge, FeatureChip, ScorePill } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Card, StatTile } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar, RingProgress, StatBarRow } from "@/components/ui/progress";
import { SegmentedControl } from "@/components/ui/segmented";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, Kbd, Skeleton } from "@/components/ui/feedback";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, SheetContent, Tooltip } from "@/components/ui/overlay";
import { AiCard, AiChip, AiSpark } from "@/components/ai/ai";
import { StreamingText } from "@/components/ai/streaming-text";
import { formatHuf } from "@/lib/format";

const block = "flex flex-col gap-4 rounded-card-lg border border-line-card bg-surface p-6";
const blockTitle = "serif text-22 font-medium";

/** A teljes komponenskészlet élő bemutatója minden változattal és állapottal. */
export function ComponentsSection() {
  const t = useTranslations("designPage");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const m = (key: string) => t(`more.${key}` as Parameters<typeof t>[0]);
  const [view, setView] = React.useState<"grid" | "list" | "map">("map");
  const [streamKey, setStreamKey] = React.useState(0);

  const deleteWithUndo = () =>
    toast(m("toastDeleted"), {
      description: m("toastDeletedBody"),
      action: { label: tc("undo"), onClick: () => toast.success(m("toastRestored")) },
    });

  return (
    <section className="flex flex-col gap-6 pt-4">
      <div className="flex flex-col gap-1">
        <h2 className="serif text-32 font-medium">{m("title")}</h2>
        <p className="text-15 text-muted">{m("lead")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className={block}>
          <h3 className={blockTitle}>{m("buttonVariants")}</h3>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button size="sm">{t("buttons.primary")}</Button>
            <Button>{t("buttons.primary")}</Button>
            <Button size="lg">{t("buttons.primary")}</Button>
            <Button disabled>{t("buttons.primary")}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="secondary">{t("buttons.secondary")}</Button>
            <Button variant="ghost">{t("buttons.ghost")}</Button>
            <Button variant="danger">{t("buttons.danger")}</Button>
            <Button variant="inverse">{t("buttons.secondary")}</Button>
            <Button variant="dashed">+ {t("buttons.secondary")}</Button>
            <Button variant="link">{t("buttons.ghost")} →</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="ai">
              <AiSpark size={16} />
              {t("buttons.ai")}
            </Button>
            <Button variant="ai-soft" shape="soft">
              <AiSpark size={16} filled={false} />
              {t("buttons.ai")}
            </Button>
            <Button variant="ai-solid">{t("buttons.ai")}</Button>
            <Button size="icon" variant="secondary" aria-label={t("buttons.secondary")}>
              <Search size={18} />
            </Button>
            <Button size="icon" shape="soft" aria-label={t("buttons.primary")}>
              <Plus size={18} />
            </Button>
          </div>
        </div>

        <div className={block}>
          <h3 className={blockTitle}>{m("badges")}</h3>
          <div className="flex flex-wrap gap-2">
            <Badge tone="solid">{t("chips.listed")}</Badge>
            <Badge tone="primary">{t("chips.listed")}</Badge>
            <Badge tone="accent">{t("chips.exclusive")}</Badge>
            <AiChip>{t("chips.ai")}</AiChip>
            <Badge tone="neutral">{t("chips.seller")}</Badge>
            <Badge tone="warning">{t("agingLevels.aging")}</Badge>
            <Badge tone="danger">{t("agingLevels.stale")}</Badge>
            <Badge tone="ai" size="xs">✦ {t("chips.ai")}</Badge>
            <CountBadge count={6} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AgingBadge level="fresh" size="xs">{t("agingLevels.fresh")}</AgingBadge>
            <AgingBadge level="aging" size="xs">{t("agingLevels.aging")}</AgingBadge>
            <AgingBadge level="stale" size="xs">{t("agingLevels.stale")}</AgingBadge>
            <ScorePill score={92} />
            <ScorePill score={68} />
          </div>
          <div className="flex flex-wrap gap-2">
            <FeatureChip>{m("features.garden")}</FeatureChip>
            <FeatureChip>{m("features.solar")}</FeatureChip>
            <FeatureChip>{m("features.garage")}</FeatureChip>
          </div>
          <div className="relative h-[120px] overflow-hidden rounded-tile bg-[#C7D2C9]">
            <Badge overlay className="absolute top-3 left-3 text-primary">{t("chips.listed")}</Badge>
          </div>
        </div>

        <div className={block}>
          <h3 className={blockTitle}>{m("inputs")}</h3>
          <Field label={m("inputName")} htmlFor="ds-name">
            <Input id="ds-name" placeholder={m("inputNamePlaceholder")} leading={<Search size={16} />} />
          </Field>
          <Field label={m("inputArea")} htmlFor="ds-area" hint={m("inputHint")}>
            <Input id="ds-area" defaultValue="128" trailing="m²" inputMode="decimal" />
          </Field>
          <Field label={m("inputArea")} htmlFor="ds-area-err" error={m("inputError")}>
            <Input id="ds-area-err" aria-invalid="true" trailing="m²" />
          </Field>
          <Textarea defaultValue={t("aiSample")} rows={3} />
        </div>

        <div className={block}>
          <h3 className={blockTitle}>{m("navigation")}</h3>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">{m("tabs.overview")}</TabsTrigger>
              <TabsTrigger value="photos">{m("tabs.photos")}</TabsTrigger>
              <TabsTrigger value="leads" count={12}>{m("tabs.leads")}</TabsTrigger>
              <TabsTrigger value="showings" count={5}>{m("tabs.showings")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <SegmentedControl
            label={m("navigation")}
            value={view}
            onValueChange={setView}
            options={[
              { value: "grid", label: m("segmented.grid") },
              { value: "list", label: m("segmented.list") },
              { value: "map", label: m("segmented.map") },
            ]}
          />
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" shape="pill" variant="inverse" className="font-semibold">{m("filters.sale")}</Button>
            <Button size="sm" shape="pill" variant="secondary">{m("filters.county")} ×</Button>
            <Button size="sm" shape="pill" variant="secondary">{m("filters.price")} ×</Button>
            <Button size="sm" shape="pill" variant="dashed">{m("filters.add")}</Button>
          </div>
          <div className="flex items-center gap-2 text-13 text-muted">
            <Kbd>⌘K</Kbd> <Kbd>Ctrl K</Kbd> <Kbd>Esc</Kbd>
          </div>
        </div>

        <div className={block}>
          <h3 className={blockTitle}>{m("data")}</h3>
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile label={m("tiles.area")} value="128 m²" />
            <StatTile label={m("tiles.rooms")} value="4 + 1" />
            <StatTile label={m("tiles.energy")} value="BB" />
          </div>
          <div className="flex items-center gap-5">
            <RingProgress value={61} label="61%">
              <span className="serif text-20 font-semibold">61%</span>
            </RingProgress>
            <div className="flex flex-col gap-1">
              <span className="text-13 font-semibold text-muted">{m("kpiExample")}</span>
              <span className="serif text-32 font-medium">{formatHuf(1_840_000)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <StatBarRow label={m("stageRows.acquisition")} value="312 M" pct={49} />
            <StatBarRow label={m("stageRows.listed")} value="642 M" pct={100} />
            <StatBarRow label={m("stageRows.deposit")} value="164 M" pct={26} tone="accent" />
          </div>
        </div>

        <div className={block}>
          <h3 className={blockTitle}>{m("avatars")} · {m("progress")}</h3>
          <div className="flex flex-wrap items-center gap-2.5">
            <Avatar name="Varga Bence" tone="primary" />
            <Avatar name="Horváth Judit" tone="accent" />
            <Avatar name="Tóth Márton" tone="slate" />
            <Avatar name="Szabó Réka" tone="ai" />
            <Avatar name="Kiss Anna" tone="accent" size="md" />
            <Avatar name="Kiss Anna" tone="accent" size="sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-14 font-semibold">{m("matchExample")}</span>
              <span className="serif text-18 font-semibold text-primary">96%</span>
            </div>
            <ProgressBar value={96} />
            <span className="text-12 text-muted">{m("matchReason")}</span>
          </div>
          <ProgressBar value={22} fill="accent" track="accent" />
          <ProgressBar value={78} fill="ai" />
          <ProgressBar value={81} fill="muted" />
        </div>

        <div className={block}>
          <h3 className={blockTitle}>{m("states")}</h3>
          <span className="text-13 font-semibold text-muted">{m("skeleton")}</span>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
          <span className="text-13 font-semibold text-muted">{m("error")}</span>
          <ErrorState
            title={te("title")}
            description={te("body")}
            action={<Button variant="secondary" size="sm">{tc("retry")}</Button>}
          />
        </div>

        <div className={block}>
          <h3 className={blockTitle}>{m("streaming")}</h3>
          <AiCard>
            <div className="flex flex-col gap-3 p-5">
              <AiChip className="self-start">{t("aiLabel")}</AiChip>
              <StreamingKey key={streamKey} text={t("aiSample")} />
              <Button variant="ai" size="sm" className="self-start" onClick={() => setStreamKey((k) => k + 1)}>
                <AiSpark size={14} />
                {m("regenerate")}
              </Button>
            </div>
          </AiCard>
          <h3 className={`${blockTitle} pt-2`}>{m("feedback")}</h3>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="secondary" onClick={deleteWithUndo}>{m("showToast")}</Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">{m("openDialog")}</Button>
              </DialogTrigger>
              <DialogContent closeLabel={tc("close")}>
                <DialogTitle className="serif text-24 font-medium">{m("dialogTitle")}</DialogTitle>
                <DialogDescription className="mt-2 text-15 leading-relaxed text-ink-2">{m("dialogBody")}</DialogDescription>
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="ghost">{tc("cancel")}</Button>
                  <Button>{t("accept")}</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">{m("openSheet")}</Button>
              </DialogTrigger>
              <SheetContent closeLabel={tc("close")} className="gap-3 p-6">
                <DialogTitle className="serif text-24 font-medium">{m("sheetTitle")}</DialogTitle>
                <DialogDescription className="text-15 leading-relaxed text-ink-2">{m("sheetBody")}</DialogDescription>
                <Card variant="flat" className="h-48 bg-surface-sunken" />
              </SheetContent>
            </Dialog>
            <Tooltip content={m("tooltipText")} side="top">
              <Button variant="secondary">{m("tooltip")}</Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Streamelés-szimuláció: rövid skeleton után a szöveg folyamatosan íródik ki. */
function StreamingKey({ text }: { text: string }) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(id);
  }, []);
  return <StreamingText text={ready ? text : ""} pending className="text-14 leading-relaxed text-ink-2" />;
}
