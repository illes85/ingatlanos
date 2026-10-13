import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AiCard, AiChip, LockedFeature } from "@/components/ai/ai";
import { Avatar, type AvatarTone } from "@/components/ui/avatar";
import { ScorePill } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PhoneIcon } from "@/components/shell/nav-icons";
import type { CallListItem, DashboardData } from "../types";

const TONES: AvatarTone[] = ["primary", "accent", "slate", "ai"];

/** „Ma kit hívj?” — AI rangsor (prémium). Zárolt csomagnál elmosott előnézet + próba-ajánlat. */
export async function CallListCard({ callList, compact = false }: { callList: DashboardData["callList"]; compact?: boolean }) {
  const t = await getTranslations("dashboard.callList");
  const tEnums = await getTranslations("enums.contactRole");
  const tCommon = await getTranslations("common");
  const items = compact ? callList.items.slice(0, 2) : callList.items;

  const list = (
    <div className={cn("flex flex-col", compact ? "pb-1.5" : "px-2.5 pt-1 pb-3")}>
      {items.length === 0 ? <p className="px-3 py-6 text-center text-14 text-muted">{t("empty")}</p> : null}
      {items.map((item, index) => (
        <div key={item.id}>
          {index > 0 && !compact ? <div className="mx-3 h-px bg-line-subtle" /> : null}
          <CallRow item={item} index={index} compact={compact} roleLabel={item.role ? tEnums(item.role) : null} callLabel={t("call", { name: item.name })} />
        </div>
      ))}
    </div>
  );

  return (
    <AiCard className={cn("h-full", compact && "rounded-card-lg")}>
      <div className={cn("flex flex-wrap items-center justify-between gap-3", compact ? "px-4 pt-3.5 pb-2" : "px-[22px] pt-[18px] pb-2")}>
        <div className="flex items-center gap-2.5">
          <h2 className={cn("serif font-medium", compact ? "text-20" : "text-22")}>{t("title")}</h2>
          {!compact ? <AiChip>{t("chip")}</AiChip> : null}
        </div>
        {compact ? (
          <AiChip size="sm">{t("chipShort")}</AiChip>
        ) : callList.total > 0 && !callList.locked ? (
          <Link href="/leadek" className="text-13 font-semibold text-primary hover:text-ink">
            {tCommon("seeAll", { count: callList.total })}
          </Link>
        ) : null}
      </div>
      {callList.locked ? (
        <div className="p-3">
          <LockedFeature
            preview={list}
            planLabel={t("lockedPlan")}
            title={t("lockedTitle")}
            body={t("lockedBody")}
            ctaLabel={t("lockedCta")}
          />
        </div>
      ) : (
        list
      )}
    </AiCard>
  );
}

function CallRow({
  item,
  index,
  compact,
  roleLabel,
  callLabel,
}: {
  item: CallListItem;
  index: number;
  compact: boolean;
  roleLabel: string | null;
  callLabel: string;
}) {
  const strong = item.score >= 80;
  const callButton = (
    <a
      href={item.phone ? `tel:${item.phone.replace(/\s/g, "")}` : undefined}
      aria-label={callLabel}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-tile transition-colors",
        strong || compact ? "bg-primary text-on-primary hover:bg-primary-hover" : "border border-line bg-surface text-primary hover:bg-surface-sunken",
      )}
    >
      <PhoneIcon />
    </a>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Avatar name={item.name} tone={TONES[index % TONES.length]} size="lg" className="text-13" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-14 font-semibold">
            {item.name} · {item.score}
          </span>
          <span className="truncate text-12 text-muted">{item.reason}</span>
        </div>
        {callButton}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3.5 rounded-tile p-3">
      <Avatar name={item.name} tone={TONES[index % TONES.length]} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-15 font-semibold">{item.name}</span>
          <span className="text-12 text-muted">{[roleLabel, item.context].filter(Boolean).join(" · ")}</span>
        </div>
        <span className="text-13 text-ink-3">{item.reason}</span>
      </div>
      <ScorePill score={item.score} />
      {callButton}
    </div>
  );
}
