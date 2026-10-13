"use client";

import * as React from "react";
import { Dialog as DialogPrimitive, DropdownMenu as Dropdown, Tooltip as TooltipPrimitive, Popover as PopoverPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------- Dialog */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

const overlayClass =
  "fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px] data-[state=open]:animate-[page-in_200ms_ease-out]";

export function DialogContent({
  className,
  children,
  closeLabel,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { closeLabel: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2",
          "rounded-card-lg border border-line-card bg-surface p-6 shadow-popover",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-control text-muted hover:bg-surface-sunken hover:text-ink"
        >
          <X size={18} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* ------------------------------------------------- Sheet (oldalsó fiók) */

export function SheetContent({
  className,
  children,
  side = "right",
  closeLabel,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "right" | "bottom"; closeLabel: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface shadow-popover",
          side === "right" && "inset-y-0 right-0 w-[min(480px,100vw)] border-l border-line",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-card-lg border-t border-line pb-[env(safe-area-inset-bottom)]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-control text-muted hover:bg-surface-sunken hover:text-ink"
        >
          <X size={18} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* ------------------------------------------------------------ Dropdown */

export const DropdownMenu = Dropdown.Root;
export const DropdownMenuTrigger = Dropdown.Trigger;
export const DropdownMenuGroup = Dropdown.Group;
export const DropdownMenuRadioGroup = Dropdown.RadioGroup;

export function DropdownMenuContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof Dropdown.Content>) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-52 rounded-panel border border-line-card bg-surface p-1.5 shadow-popover",
          className,
        )}
        {...props}
      />
    </Dropdown.Portal>
  );
}

const itemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-control px-3 py-2.5 text-14 font-medium text-ink-2 outline-none select-none data-[highlighted]:bg-surface-sunken data-[highlighted]:text-ink [&_svg]:size-4 [&_svg]:text-muted";

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof Dropdown.Item>) {
  return <Dropdown.Item className={cn(itemClass, className)} {...props} />;
}

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof Dropdown.RadioItem>) {
  return (
    <Dropdown.RadioItem className={cn(itemClass, "justify-between", className)} {...props}>
      {children}
      <Dropdown.ItemIndicator>
        <span className="size-2 rounded-full bg-primary" />
      </Dropdown.ItemIndicator>
    </Dropdown.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof Dropdown.Label>) {
  return <Dropdown.Label className={cn("px-3 pt-2 pb-1 text-11 font-bold tracking-[0.08em] text-muted uppercase", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof Dropdown.Separator>) {
  return <Dropdown.Separator className={cn("my-1 h-px bg-line-subtle", className)} {...props} />;
}

/* ------------------------------------------------------------- Tooltip */

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ content, children, side = "right" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className="z-50 rounded-control bg-inverse px-2.5 py-1.5 text-12 font-semibold text-inverse-text shadow-popover"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* ------------------------------------------------------------- Popover */

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        className={cn("z-50 rounded-panel border border-line-card bg-surface p-4 shadow-popover", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
