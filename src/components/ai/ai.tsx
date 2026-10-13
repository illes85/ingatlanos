import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Négyágú csillag (✦) — kizárólag AI-funkciók jele. */
export function AiSpark({ size = 16, filled = true, className }: { size?: number; filled?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? 0 : 1.8}
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  );
}

/** AI-művelet gomb: ✦ + átmenetes keret, hoverre lassan körbefutó kerettel. */
export function AiButton({ children, size = "md", className, ...props }: Omit<ButtonProps, "variant">) {
  return (
    <Button variant="ai" size={size} className={className} {...props}>
      <AiSpark size={16} />
      {children}
    </Button>
  );
}

/** „✦ AI …” chip a kártyacímek mellett. */
export function AiChip({ children, size = "md", className }: { children: React.ReactNode; size?: "xs" | "sm" | "md"; className?: string }) {
  return (
    <Badge tone="ai" size={size} className={className}>
      <AiSpark size={size === "xs" ? 10 : 12} />
      {children}
    </Badge>
  );
}

/** AI-kártya: 3px ibolya→réz csík a tetején, halvány ibolya árnyék. */
export function AiCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="ai-card"
      className={cn("relative flex flex-col overflow-hidden rounded-card border border-ai-border bg-surface shadow-ai", className)}
      {...props}
    >
      <div aria-hidden="true" className="ai-stripe h-[3px] shrink-0" />
      {children}
    </div>
  );
}

export interface AiSuggestionProps {
  /** Felső címke, pl. „HIRDETÉSSZÖVEG · ELEGÁNS HANGNEM” vagy „AI JAVASLAT”. */
  label: React.ReactNode;
  children: React.ReactNode;
  /** A hiányzó adatra rákérdező sor. */
  missingInfo?: React.ReactNode;
  acceptLabel: string;
  editLabel: string;
  dismissLabel: string;
  onAccept?: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
  showSparkInLabel?: boolean;
  className?: string;
}

/**
 * AI által generált tartalom: halvány ibolya doboz + Elfogad / Szerkeszt / Elvet.
 * Szabály: az AI semmit nem küld ki és nem ment el jóváhagyás nélkül.
 */
export function AiSuggestion({
  label,
  children,
  missingInfo,
  acceptLabel,
  editLabel,
  dismissLabel,
  onAccept,
  onEdit,
  onDismiss,
  showSparkInLabel = true,
  className,
}: AiSuggestionProps) {
  return (
    <div className={cn("flex flex-col gap-2.5 rounded-panel border border-ai-border bg-ai-surface p-4", className)}>
      <span className="flex items-center gap-1.5 text-12 font-bold text-ai-text uppercase">
        {showSparkInLabel ? <AiSpark size={12} /> : null}
        {label}
      </span>
      <div className="text-14 leading-relaxed text-ink-2">{children}</div>
      {missingInfo ? <span className="text-12 text-muted">{missingInfo}</span> : null}
      <div className="flex gap-1.5">
        <Button size="sm" className="flex-1" onClick={onAccept}>
          {acceptLabel}
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" onClick={onEdit}>
          {editLabel}
        </Button>
        <Button size="sm" variant="ghost" className="px-3 text-muted" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      </div>
    </div>
  );
}

export interface LockedFeatureProps {
  /** A valódi felület elmosott előnézete. */
  preview: React.ReactNode;
  planLabel: string;
  title: React.ReactNode;
  body: React.ReactNode;
  ctaLabel: string;
  onCta?: () => void;
  className?: string;
}

/** Zárolt prémium funkció: elmosott előnézet + értékígéret + „Kipróbálom 14 napig”. */
export function LockedFeature({ preview, planLabel, title, body, ctaLabel, onCta, className }: LockedFeatureProps) {
  return (
    <div className={cn("relative min-h-[300px] overflow-hidden rounded-panel border border-line-card bg-bg", className)}>
      <div aria-hidden="true" inert className="pointer-events-none absolute inset-0 opacity-70 blur-[5px] select-none">
        {preview}
      </div>
      <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2.5 rounded-panel bg-surface/92 p-4 shadow-popover backdrop-blur-md">
        <span className="text-12 font-bold text-accent-text">{planLabel}</span>
        <span className="text-15 font-bold">{title}</span>
        <span className="text-13 leading-normal text-ink-3">{body}</span>
        <Button variant="inverse" onClick={onCta}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
