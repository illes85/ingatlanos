import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { AgingLevel } from "@/config/pipeline";

/** Státusz- és címke-chip. A színek szerepekhez kötöttek (lásd Alapelemek). */
export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-[5px] rounded-full font-bold whitespace-nowrap [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        solid: "bg-primary text-on-primary",
        primary: "bg-primary-soft text-primary",
        accent: "bg-accent-soft text-accent-text",
        ai: "bg-ai-soft text-ai-text",
        neutral: "bg-surface-muted text-ink-2",
        sunken: "bg-surface-sunken text-ink-2",
        warning: "bg-warning-soft text-warning-text",
        danger: "bg-danger-soft text-danger-text",
        "danger-solid": "bg-danger text-white",
      },
      size: {
        xs: "px-2 py-[3px] text-11",
        sm: "px-[9px] py-[3px] text-12",
        md: "px-2.5 py-1 text-12",
      },
      overlay: {
        true: "bg-white/92 backdrop-blur-sm dark:bg-surface/90",
        false: "",
      },
    },
    defaultVariants: { tone: "neutral", size: "md", overlay: false },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, overlay, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone, size, overlay }), className)} {...props} />;
}

const AGING_TONE: Record<AgingLevel, BadgeProps["tone"]> = {
  fresh: "primary",
  aging: "warning",
  stale: "danger",
};

/** „Napok a szakaszban” jelző: 0–7 zöld, 8–14 sárga, 15+ piros. */
export function AgingBadge({ level, children, ...props }: BadgeProps & { level: AgingLevel }) {
  return (
    <Badge tone={AGING_TONE[level]} {...props}>
      {children}
    </Badge>
  );
}

/** Jellemző-chip (Kertkapcsolatos, Napelem …) — nagyobb, félkövér, semleges. */
export function FeatureChip({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full bg-surface-sunken px-3 py-1.5 text-13 font-semibold", className)}
      {...props}
    />
  );
}

/** Pontszám-kapszula (Fraunces számmal) — AI rangsor, egyezési %. */
export function ScorePill({ score, className }: { score: number; className?: string }) {
  const tone = score >= 80 ? "bg-primary-soft text-primary" : "bg-warning-soft text-warning-text";
  return (
    <span className={cn("serif shrink-0 rounded-full px-2.5 py-1 text-15 font-semibold", tone, className)}>
      {score}
    </span>
  );
}

/** Számláló-jelvény (menüpont, ikon sarka). */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex min-w-[18px] items-center justify-center rounded-full bg-danger px-2 py-0.5 text-12 leading-none font-bold text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
