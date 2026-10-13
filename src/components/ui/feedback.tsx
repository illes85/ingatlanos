import * as React from "react";
import { cn } from "@/lib/utils";

/** Billentyű-jelzés (⌘K). */
export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn("rounded-kbd border border-line bg-bg px-2 py-0.5 font-sans text-12 text-muted", className)}
      {...props}
    />
  );
}

/** Csillámló skeleton. `ai` változat az AI-generálás közbeni állapothoz. */
export function Skeleton({ className, ai = false }: { className?: string; ai?: boolean }) {
  return <div aria-hidden="true" className={cn(ai ? "skeleton-ai" : "skeleton", "rounded-control", className)} />;
}

export interface EmptyStateProps {
  illustration?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Szaggatott keretes doboz (lista helyén) vagy keret nélküli (kártyán belül). */
  framed?: boolean;
}

/** Üres állapot: vonalas illusztráció + egy egyértelmű következő lépés. */
export function EmptyState({ illustration, title, description, action, className, framed = true }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 text-center",
        framed && "rounded-panel border-[1.5px] border-dashed border-line-dashed-soft",
        className,
      )}
    >
      {illustration}
      <span className="text-16 font-bold">{title}</span>
      {description ? <span className="max-w-[260px] text-13 leading-normal text-muted">{description}</span> : null}
      {action}
    </div>
  );
}

/** Hibaállapot: barátságos magyar üzenet, újrapróbálás — soha nyers hiba. */
export function ErrorState({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-panel bg-danger-soft/60 p-6 text-center",
        className,
      )}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5h.01" />
      </svg>
      <span className="text-16 font-bold">{title}</span>
      {description ? <span className="max-w-[320px] text-13 leading-normal text-ink-3">{description}</span> : null}
      {action}
    </div>
  );
}
