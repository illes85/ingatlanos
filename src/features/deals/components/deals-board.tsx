"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { AgingBadge } from "@/components/ui/badge";
import { PropertyPhoto } from "@/components/domain/property-photo";
import { agingLevel, isPreCloseStage, STAGES_BY_SIDE, type DealSide, type DealStage } from "@/config/pipeline";
import { formatMillions } from "@/lib/format";
import { cn } from "@/lib/utils";
import { moveDeal } from "../actions";
import type { DealCardData } from "../types";

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

function CardBody({ deal, dragging = false }: { deal: DealCardData; dragging?: boolean }) {
  const t = useTranslations("deals");
  const tTypes = useTranslations("enums.contactRole");
  const role = deal.side === "seller" ? tTypes("seller") : tTypes("buyer");
  const level = agingLevel(deal.daysInStage);
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-card border bg-surface p-3.5 shadow-card",
        level === "stale" && deal.status === "open" ? "border-danger/40" : "border-line",
        dragging && "shadow-raised",
      )}
    >
      <div className="flex items-start gap-3">
        <PropertyPhoto src={deal.coverUrl} alt="" seed={deal.propertyId ?? deal.id} type={deal.propertyType ?? "house"} sizes="52px" className="size-[52px] shrink-0 rounded-control" glyphSize={24} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link href={`/ugyletek/${deal.id}`} className="truncate text-15 font-bold hover:underline" draggable={false}>
            {deal.title || t("untitled")}
          </Link>
          {deal.contactName ? (
            <span className="truncate text-13 text-muted">
              {deal.contactName} · {role}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="serif text-20 font-medium">{deal.expectedValue !== null ? formatMillions(deal.expectedValue) : "–"}</span>
        {deal.status === "open" ? <AgingBadge level={level}>{t("days", { count: deal.daysInStage })}</AgingBadge> : null}
      </div>
    </div>
  );
}

function DraggableCard({ deal }: { deal: DealCardData }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id, disabled: !deal.canMove || deal.status !== "open" });
  return (
    <li
      ref={setNodeRef}
      data-testid="deal-card"
      data-deal-id={deal.id}
      className={cn("touch-manipulation", deal.canMove && deal.status === "open" && "cursor-grab", isDragging && "opacity-30")}
      {...attributes}
      {...listeners}
    >
      <CardBody deal={deal} />
    </li>
  );
}

function Column({ side, stage, deals, addHref }: { side: DealSide; stage: DealStage; deals: DealCardData[]; addHref: string | null }) {
  const t = useTranslations("deals");
  const tStage = useTranslations("enums.dealStage");
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((sum, d) => sum + (d.expectedValue ?? 0), 0);
  return (
    <section
      ref={setNodeRef}
      aria-label={tStage(stage)}
      data-testid={`column-${side}-${stage}`}
      className={cn(
        "flex w-[300px] shrink-0 snap-start flex-col gap-3 rounded-card bg-surface-sunken p-3 transition-colors",
        isOver && "bg-primary-soft",
      )}
    >
      <header className="flex items-baseline justify-between gap-2 px-1.5 pt-1">
        <h2 className="text-15 font-bold">
          {tStage(stage)} <span className={cn("font-medium", isPreCloseStage(stage) ? "text-accent-text" : "text-muted")}>{deals.length}</span>
        </h2>
        <span className="serif text-14 text-muted">{total > 0 ? formatMillions(total, { compact: true, currency: false }) : ""}</span>
      </header>
      <ul className="flex min-h-12 flex-col gap-3">
        {deals.map((deal) => (
          <DraggableCard key={deal.id} deal={deal} />
        ))}
      </ul>
      {addHref ? (
        <Link
          href={addHref}
          className="flex h-11 items-center justify-center gap-1.5 rounded-card border border-dashed border-line-strong text-14 font-semibold text-muted hover:border-primary hover:text-primary"
        >
          <Plus size={16} aria-hidden="true" />
          {t("addDeal")}
        </Link>
      ) : null}
    </section>
  );
}

/** Kanban tábla: húzással (egér, érintés, billentyűzet) mozgathatók az ügyletek a szakaszok között. */
export function DealsBoard({ side, deals, canCreate }: { side: DealSide; deals: DealCardData[]; canCreate: boolean }) {
  const t = useTranslations("deals");
  const tStage = useTranslations("enums.dealStage");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticDeals, applyMove] = useOptimistic(deals, (state, move: { id: string; stage: DealStage }) =>
    state.map((d) => (d.id === move.id ? { ...d, stage: move.stage, daysInStage: 0 } : d)),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const stages = STAGES_BY_SIDE[side];
  const active = optimisticDeals.find((d) => d.id === activeId) ?? null;

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));
  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const id = String(event.active.id);
    const target = event.over ? (String(event.over.id) as DealStage) : null;
    const deal = deals.find((d) => d.id === id);
    if (!deal || !target || target === deal.stage || !stages.includes(target)) return;
    if (target === "closed" && !window.confirm(t("confirmClose"))) return;

    startTransition(async () => {
      applyMove({ id, stage: target });
      const result = await moveDeal(id, target);
      if (!result.ok) {
        toast.error(t("moveFailed"));
        return;
      }
      toast(t("moved", { stage: tStage(target) }));
      router.refresh();
    });
  };

  return (
    <DndContext id={`deals-${side}`} sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="flex snap-x gap-4 overflow-x-auto pb-4" data-testid="deals-board">
        {stages.map((stage) => (
          <Column
            key={stage}
            side={side}
            stage={stage}
            deals={optimisticDeals.filter((d) => d.stage === stage)}
            addHref={canCreate && stage === stages[0] ? `/ugyletek/uj?oldal=${side === "seller" ? "elado" : "vevo"}` : null}
          />
        ))}
      </div>
      <DragOverlay>{active ? <CardBody deal={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
