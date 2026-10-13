"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, ChevronDown, Mail, Phone, ShieldAlert, UserCheck } from "lucide-react";
import { Badge, ScorePill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { assignLead, convertLead, markLeadRead, setLeadStatus, type ManualLeadStatus } from "../actions";
import type { LeadItem } from "../types";

interface LeadListProps {
  items: LeadItem[];
  /** Az owner és az asszisztens bárkinek kioszthat; az ügynök csak magához veheti a kiosztatlant. */
  canAssign: boolean;
  userId: string;
  assignees: { id: string; name: string }[];
  /** A szerver pillanatnyi ideje: a „mennyi ideje” szöveg így egyezik szerver és kliens között. */
  nowIso: string;
}

const rtf = new Intl.RelativeTimeFormat("hu", { numeric: "auto" });

function relativeTime(iso: string, nowIso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - new Date(nowIso).getTime()) / 60_000);
  const abs = Math.abs(minutes);
  if (abs < 60) return rtf.format(minutes, "minute");
  if (abs < 60 * 24) return rtf.format(Math.round(minutes / 60), "hour");
  return rtf.format(Math.round(minutes / (60 * 24)), "day");
}

function LeadRow({ lead, canAssign, userId, assignees, nowIso }: { lead: LeadItem } & Omit<LeadListProps, "items">) {
  const t = useTranslations("leads");
  const tSource = useTranslations("enums.leadSource");
  const tStatus = useTranslations("enums.leadStatus");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const unread = lead.status === "new";
  const closed = lead.status === "converted" || lead.status === "archived" || lead.status === "spam";
  const name = lead.fullName || t("row.noName");

  const run = (action: () => Promise<{ ok: boolean }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(t("toast.failed"));
        return;
      }
      toast.success(success);
      router.refresh();
    });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread) startTransition(async () => { await markLeadRead(lead.id); router.refresh(); });
  };

  const convert = (contactId?: string) =>
    startTransition(async () => {
      const result = await convertLead(lead.id, contactId);
      if (!result.ok) {
        toast.error(t("toast.failed"));
        return;
      }
      toast.success(t("toast.converted"));
      router.refresh();
    });

  const status = (next: ManualLeadStatus, success: string) => run(() => setLeadStatus(lead.id, next), success);
  const assign = (assigneeId: string | null) => run(() => assignLead(lead.id, assigneeId), t("toast.assigned"));

  const duplicate = lead.duplicates[0];

  return (
    <li>
      <Card className={cn("flex flex-col gap-3 p-5", unread && "border-primary/40")} data-testid="lead-row" data-status={lead.status}>
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={t("row.toggle", { name })}
            className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
          >
            <span
              aria-hidden="true"
              className={cn("mt-2 size-2.5 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")}
              title={unread ? t("row.unread") : undefined}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className={cn("truncate text-16", unread ? "font-bold" : "font-semibold")}>{name}</span>
                {lead.urgent ? (
                  <Badge tone="danger" size="xs">
                    {t("row.urgent")}
                  </Badge>
                ) : null}
                <Badge tone="sunken" size="xs">
                  {tSource(lead.source)}
                  {lead.sourceDetail ? ` · ${lead.sourceDetail}` : ""}
                </Badge>
                {lead.status !== "new" && lead.status !== "read" ? (
                  <Badge tone={lead.status === "converted" ? "primary" : "neutral"} size="xs">
                    {tStatus(lead.status)}
                  </Badge>
                ) : null}
                {lead.aiScore !== null ? <ScorePill score={lead.aiScore} /> : null}
              </span>
              {lead.property ? (
                <span className="truncate text-13 text-muted">
                  {lead.property.code} · {lead.property.title}
                </span>
              ) : null}
              {lead.message ? <span className={cn("text-14 text-ink-2", !open && "line-clamp-1")}>{lead.message}</span> : null}
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2 text-13 text-muted">
            <time dateTime={lead.receivedAt}>{relativeTime(lead.receivedAt, nowIso)}</time>
            <ChevronDown size={16} aria-hidden="true" className={cn("transition-transform", open && "rotate-180")} />
          </div>
        </div>

        {duplicate && !closed ? (
          <div role="note" className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-accent-border bg-accent-tint px-4 py-3">
            <span className="text-13 text-accent-text">
              <strong className="font-bold">{t("duplicate.title")}</strong> {duplicate.fullName}
              {" · "}
              {t(`duplicate.${duplicate.match}`)}
              {duplicate.ownerName ? ` · ${t("duplicate.owner", { name: duplicate.ownerName })}` : ""}
            </span>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => convert(duplicate.id)}>
              {t("actions.linkExisting")}
            </Button>
          </div>
        ) : null}

        {open ? (
          <div className="flex flex-col gap-3 border-t border-line pt-3 text-14">
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-ink-2">
              {lead.phone ? (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-ink">
                  <Phone size={14} aria-hidden="true" />
                  {lead.phone}
                </a>
              ) : null}
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-ink">
                  <Mail size={14} aria-hidden="true" />
                  {lead.email}
                </a>
              ) : null}
            </div>
            {lead.aiReason ? <p className="text-13 text-ai-text">{lead.aiReason}</p> : null}
            {lead.contact ? (
              <p className="text-13">
                {t("row.contact")}{" "}
                <Link href={`/ugyfelek/${lead.contact.id}`} className="font-semibold text-primary underline-offset-2 hover:underline">
                  {lead.contact.name}
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!closed ? (
              <Button size="sm" disabled={pending} onClick={() => convert()}>
                <UserCheck size={16} aria-hidden="true" />
                {t("actions.convert")}
              </Button>
            ) : null}
            {lead.status !== "converted" && lead.status !== "contacted" && !closed ? (
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => status("contacted", t("toast.contacted"))}>
                {t("actions.contacted")}
              </Button>
            ) : null}
            {lead.status === "archived" || lead.status === "spam" ? (
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => status("read", t("toast.restored"))}>
                {t("actions.restore")}
              </Button>
            ) : null}
            {!closed ? (
              <>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => status("archived", t("toast.archived"))}>
                  <Archive size={16} aria-hidden="true" />
                  {t("actions.archive")}
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => status("spam", t("toast.spam"))}>
                  <ShieldAlert size={16} aria-hidden="true" />
                  {t("actions.spam")}
                </Button>
              </>
            ) : null}
          </div>
          {!closed ? (
            canAssign ? (
              <Select
                aria-label={t("assign.label", { name })}
                value={lead.assignedTo ?? ""}
                disabled={pending}
                onChange={(event) => assign(event.target.value || null)}
                wrapperClassName="w-full sm:w-[220px]"
              >
                <option value="">{t("assign.none")}</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            ) : lead.assignedTo === null ? (
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => assign(userId)}>
                {t("assign.claim")}
              </Button>
            ) : (
              <span className="text-13 text-muted">{t("assign.mine")}</span>
            )
          ) : lead.assigneeName ? (
            <span className="text-13 text-muted">{lead.assigneeName}</span>
          ) : null}
        </div>
      </Card>
    </li>
  );
}

/** Lead-lista: lenyitható sorok, egykattintásos átalakítás, kiosztás és állapotváltás. */
export function LeadList({ items, ...rest }: LeadListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((lead) => (
        <LeadRow key={lead.id} lead={lead} {...rest} />
      ))}
    </ul>
  );
}
