import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

/** Natív választó (mobilon is kényelmes, billentyűzettel és képernyőolvasóval alapból működik), az Input kinézetével. */
export function Select({ className, wrapperClassName, children, ...props }: SelectProps) {
  return (
    <span
      className={cn(
        "relative flex h-11 items-center rounded-control border-[1.5px] border-line bg-surface",
        "transition-[border-color,box-shadow] duration-150 ease-out",
        "focus-within:border-primary focus-within:shadow-[0_0_0_4px_var(--primary-ring)]",
        wrapperClassName,
      )}
    >
      <select
        data-slot="select"
        className={cn("h-full w-full cursor-pointer appearance-none bg-transparent pr-9 pl-3.5 text-15 font-medium text-ink outline-none", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3.5 text-muted" />
    </span>
  );
}
