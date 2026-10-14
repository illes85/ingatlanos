import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { STAGES_BY_SIDE } from "@/config/pipeline";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate, formatMillions } from "@/lib/format";
import { getOwnerOptions } from "@/features/contacts/queries";
import { DealForm } from "@/features/deals/components/deal-form";
import { DealOutcome } from "@/features/deals/components/deal-outcome";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("deals.detail");
  return { title: t("title") };
}

/** Ügylet adatlapja: részletek szerkesztése, szakasztörténet, elvesztés/újranyitás. */
export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppContext();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();

  const { data: deal } = await supabase
    .from("deals")
    .select(
      "id, side, stage, status, title, expected_value, probability, expected_close_date, notes, lost_reason, agent_id, property:properties (id, code, title), contact:contacts (id, full_name, company), agent:profiles!deals_agent_id_fkey (full_name)",
    )
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!deal) notFound();

  const [t, tStage, tSides, history, agents] = await Promise.all([
    getTranslations("deals.detail"),
    getTranslations("enums.dealStage"),
    getTranslations("deals.sides"),
    supabase.from("deal_stage_history").select("id, from_stage, to_stage, changed_at").eq("deal_id", id).order("changed_at", { ascending: false }),
    ctx.role === "owner" ? getOwnerOptions(ctx) : Promise.resolve(null),
  ]);

  const canEdit = ctx.role === "owner" || deal.agent_id === ctx.userId;
  const heading = deal.title || deal.property?.title || deal.contact?.full_name || deal.contact?.company || t("untitled");
  const million = (value: number | null) => (value === null ? "" : String(Number(value) / 1_000_000).replace(".", ","));

  return (
    <div className="flex max-w-[900px] flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href={`/ugyletek${deal.side === "buyer" ? "?oldal=vevo" : ""}`} className="text-14 text-muted hover:text-ink">
            ← {t("back")}
          </Link>
          <h1 className="serif text-34 leading-tight font-medium">{heading}</h1>
          <div className="flex flex-wrap items-center gap-2 text-14 text-muted">
            <Badge tone="primary" size="sm">
              {tSides(deal.side)}
            </Badge>
            <Badge tone={deal.status === "won" ? "primary" : deal.status === "lost" ? "danger" : "neutral"} size="sm">
              {t(`status.${deal.status}`)}
            </Badge>
            <span>{tStage(deal.stage)}</span>
            {deal.expected_value !== null ? <span>· {formatMillions(Number(deal.expected_value))}</span> : null}
            {deal.agent?.full_name ? <span>· {deal.agent.full_name}</span> : null}
          </div>
          {deal.property ? (
            <Link href={`/ingatlanok/${deal.property.id}`} className="text-14 font-semibold text-primary hover:underline">
              {deal.property.code} · {deal.property.title}
            </Link>
          ) : null}
          {deal.contact ? (
            <Link href={`/ugyfelek/${deal.contact.id}`} className="text-14 font-semibold text-primary hover:underline">
              {deal.contact.full_name || deal.contact.company}
            </Link>
          ) : null}
          {deal.status === "lost" && deal.lost_reason ? <p className="text-14 text-danger-text">{t("lostReason", { reason: deal.lost_reason })}</p> : null}
        </div>
        {canEdit ? <DealOutcome dealId={id} status={deal.status} /> : null}
      </header>

      {canEdit ? (
        <DealForm
          mode="edit"
          dealId={id}
          side={deal.side}
          stages={STAGES_BY_SIDE[deal.side]}
          defaults={{
            stage: deal.stage,
            propertyId: "",
            contactId: "",
            agentId: deal.agent_id ?? "",
            title: deal.title ?? "",
            expectedValueM: million(deal.expected_value === null ? null : Number(deal.expected_value)),
            probability: deal.probability?.toString() ?? "",
            expectedCloseDate: deal.expected_close_date ?? "",
            notes: deal.notes ?? "",
          }}
          properties={[]}
          contacts={[]}
          agents={agents}
          cancelHref={`/ugyletek${deal.side === "buyer" ? "?oldal=vevo" : ""}`}
        />
      ) : null}

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="serif text-22 font-medium">{t("history")}</h2>
        <ol className="flex flex-col gap-2 text-14">
          {(history.data ?? []).map((h) => (
            <li key={h.id} className="flex flex-wrap justify-between gap-2">
              <span>{h.from_stage ? t("moved", { from: tStage(h.from_stage), to: tStage(h.to_stage) }) : t("created", { to: tStage(h.to_stage) })}</span>
              <time dateTime={h.changed_at} className="text-muted">
                {formatDate(h.changed_at)}
              </time>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
