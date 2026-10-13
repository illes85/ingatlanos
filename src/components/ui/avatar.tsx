import { cn, pickByHash } from "@/lib/utils";
import { initials } from "@/lib/format";

const TONES = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent-text",
  ai: "bg-ai-soft text-ai-text",
  slate: "bg-slate-soft text-slate-text",
} as const;

export type AvatarTone = keyof typeof TONES;

const SIZES = {
  sm: "size-8 text-12",
  md: "size-9 text-13",
  lg: "size-10 text-14",
  xl: "size-11 text-14",
} as const;

export interface AvatarProps {
  name: string;
  tone?: AvatarTone;
  size?: keyof typeof SIZES;
  className?: string;
  /** Ha nincs megadva, a név alapján determinisztikusan választunk tónust. */
  src?: string | null;
}

/** Monogramos avatar (a terv tónusos körei). */
export function Avatar({ name, tone, size = "lg", className, src }: AvatarProps) {
  const resolvedTone = tone ?? pickByHash(name, Object.keys(TONES) as AvatarTone[]);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        SIZES[size],
        TONES[resolvedTone],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- aláírt URL, kis kép
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
