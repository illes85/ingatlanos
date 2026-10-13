"use client";

import { X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";

const CHIP = "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-13 font-semibold whitespace-nowrap transition-colors duration-150";

export interface FilterChipProps {
  /** Üres állapotban ez látszik (pl. „Típus”), kitöltve az érték (pl. „Lakás, Ház”). */
  label: string;
  value: string | null;
  onClear: () => void;
  clearLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  contentClassName?: string;
}

/** Szűrő-chip legördülő panellel: kitöltve „érték ×”, üresen szaggatott „+ címke”. */
export function FilterChip({ label, value, onClear, clearLabel, open, onOpenChange, children, contentClassName }: FilterChipProps) {
  const active = value !== null;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <span className={cn(CHIP, active ? "border-line bg-surface pr-2.5 text-ink" : "border-dashed border-line-dashed bg-transparent text-ink-2")}>
        <PopoverTrigger className="cursor-pointer outline-offset-4 hover:text-ink">{active ? value : label}</PopoverTrigger>
        {active ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface-sunken hover:text-ink"
          >
            <X size={12} aria-hidden="true" />
          </button>
        ) : null}
      </span>
      <PopoverContent align="start" className={cn("w-64", contentClassName)}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** Kétállapotú chip (pl. „Eladó”): bekapcsolva sötét kitöltés. */
export function ToggleChip({ pressed, onPressedChange, children }: { pressed: boolean; onPressedChange: (pressed: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(CHIP, "cursor-pointer", pressed ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:text-ink")}
    >
      {children}
    </button>
  );
}
