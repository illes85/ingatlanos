import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary font-bold text-on-primary hover:bg-primary-hover",
        secondary: "border border-line bg-surface font-semibold text-ink hover:bg-surface-sunken",
        ghost: "bg-transparent font-semibold text-ink-2 hover:bg-surface-sunken hover:text-ink",
        danger: "bg-danger-soft font-bold text-danger-text hover:brightness-95",
        inverse: "bg-ink font-bold text-bg hover:opacity-90",
        ai: "ai-border font-bold text-ai-text",
        "ai-soft": "border border-ai-border-strong bg-surface font-semibold text-ai-text hover:bg-ai-surface",
        "ai-solid": "bg-ai-solid font-bold text-white hover:brightness-110",
        dashed: "border border-dashed border-line-dashed bg-transparent font-semibold text-ink-2 hover:bg-surface-sunken",
        glass: "glass font-bold text-ink",
        link: "h-auto bg-transparent p-0 font-semibold text-primary hover:text-ink",
      },
      size: {
        sm: "h-10 rounded-control px-3.5 text-13",
        md: "h-11 rounded-control px-[18px] text-14",
        lg: "h-12 rounded-tile px-5 text-15",
        icon: "size-11 rounded-tile",
        "icon-sm": "size-10 rounded-control",
        "icon-lg": "size-12 rounded-tile",
      },
      shape: {
        default: "",
        soft: "rounded-tile",
        pill: "rounded-full",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md", shape: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, shape, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, shape }), className)}
      {...props}
    />
  );
}
