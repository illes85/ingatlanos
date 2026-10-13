import * as React from "react";
import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** default: kártya (16px, puha árnyék) · raised: kiemelt (összegzőkártya) · flat: csak keret */
  variant?: "default" | "raised" | "flat";
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-card border border-line-card bg-surface",
        variant === "default" && "shadow-card",
        variant === "raised" && "shadow-raised",
        className,
      )}
      {...props}
    />
  );
}

/** Kártyacím Fraunces 22-vel, opcionális jobb oldali elemmel (link, számláló). */
export function CardHeader({
  title,
  aside,
  adornment,
  as: Heading = "h2",
  className,
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  adornment?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5">
        <Heading className="serif text-22 font-medium">{title}</Heading>
        {adornment}
      </div>
      {aside}
    </div>
  );
}

/** Sötét (inverz) kártya — csomag/kredit, mobil jutalék. */
export function InverseCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card bg-inverse text-inverse-text", className)} {...props} />;
}

/** Kis adat-csempe: címke + érték (Alapterület 128 m²). */
export function StatTile({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-control bg-surface-tile p-2.5", className)}>
      <span className="text-12 text-muted">{label}</span>
      <span className="text-15 font-bold">{value}</span>
    </div>
  );
}

/** Szekciócímke (KÖVETKEZŐ BEMUTATÓ, PRÉMIUM). */
export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-12 font-bold tracking-[0.08em] text-muted uppercase", className)} {...props} />;
}
