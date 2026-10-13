"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

/** Aláhúzott fülsor (Áttekintés · Fotók · Érdeklődők 12 …). */
export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  count,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { count?: number }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "-mb-px h-11 border-b-2 border-transparent px-3.5 text-14 font-semibold whitespace-nowrap text-muted",
        "transition-colors duration-150 hover:text-ink",
        "data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-ink",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined ? <span className="ml-1">{count}</span> : null}
    </TabsPrimitive.Trigger>
  );
}
