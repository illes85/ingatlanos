import { cn } from "@/lib/utils";

const FILLS = {
  primary: "bg-primary",
  muted: "bg-primary-muted",
  accent: "bg-accent",
  ai: "bg-[linear-gradient(90deg,var(--ai-from),var(--ai-to))]",
  "ai-inverse": "bg-[linear-gradient(90deg,var(--inverse-ai-from),var(--inverse-ai-to))]",
  "accent-inverse": "bg-[var(--inverse-ai-to)]",
} as const;

const TRACKS = {
  default: "bg-line-subtle",
  accent: "bg-accent-border",
  inverse: "bg-inverse-track",
} as const;

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  fill?: keyof typeof FILLS;
  track?: keyof typeof TRACKS;
  className?: string;
  label?: string;
}

/** Vékony, kerek végű sáv (egyezési %, megbízás lejárat, kreditkeret). */
export function ProgressBar({ value, fill = "primary", track = "default", className, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 overflow-hidden rounded-full", TRACKS[track], className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", FILLS[fill])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export interface RingProgressProps {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
  label?: string;
}

/** Gyűrűdiagram (havi jutalék-cél, réz). */
export function RingProgress({ value, size = 84, stroke = 9, className, children, label }: RingProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2 - 0.5;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </div>
  );
}

/** Vízszintes oszlop-sor (Pipeline szakaszonként). */
export function StatBarRow({
  label,
  value,
  pct,
  tone = "primary",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  pct: number;
  tone?: "primary" | "accent";
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-13 text-ink-3">{label}</span>
      <div className="h-[22px] flex-1 rounded-kbd bg-surface-sunken">
        <div
          className={cn("h-full rounded-kbd transition-[width] duration-700 ease-out", tone === "accent" ? "bg-accent" : "bg-primary")}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
      <span className="serif w-20 shrink-0 text-right text-14 font-semibold">{value}</span>
    </div>
  );
}
