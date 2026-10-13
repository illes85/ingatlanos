import * as React from "react";
import { cn } from "@/lib/utils";

/** Beviteli mező keret: 44px, 10px lekerekítés, fókuszban zöld keret + halvány gyűrű. */
const fieldShell = cn(
  "flex h-11 items-center gap-2 rounded-control border-[1.5px] border-line bg-surface px-3.5",
  "transition-[border-color,box-shadow] duration-150 ease-out",
  "focus-within:border-primary focus-within:shadow-[0_0_0_4px_var(--primary-ring)]",
  "has-[input[aria-invalid=true]]:border-danger",
);

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Előtag (pl. ikon) a mezőn belül. */
  leading?: React.ReactNode;
  /** Utótag (pl. „Ft”, „m²”) a mezőn belül. */
  trailing?: React.ReactNode;
  wrapperClassName?: string;
}

export function Input({ className, wrapperClassName, leading, trailing, ...props }: InputProps) {
  return (
    <span className={cn(fieldShell, wrapperClassName)}>
      {leading ? <span className="flex shrink-0 text-muted">{leading}</span> : null}
      <input
        data-slot="input"
        className={cn(
          "min-w-0 flex-1 bg-transparent text-15 font-medium text-ink outline-none placeholder:font-normal placeholder:text-muted",
          className,
        )}
        {...props}
      />
      {trailing ? <span className="shrink-0 text-14 text-muted">{trailing}</span> : null}
    </span>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldShell,
        "h-auto min-h-24 w-full resize-y py-2.5 text-15 text-ink outline-none placeholder:text-muted",
        "focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-ring)]",
        className,
      )}
      {...props}
    />
  );
}

export interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Címke + mező + segéd-/hibaszöveg. */
export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-13 font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-12 font-semibold text-danger-text">
          {error}
        </span>
      ) : hint ? (
        <span className="text-12 text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
