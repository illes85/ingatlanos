import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  labels: { label: string; previous: string; next: string; position: string };
}

/** Lapozó (előző · „3. oldal / 8” · következő); egyetlen oldalnál nem jelenik meg. A hivatkozásokat a hívó építi, így a szűrők megmaradnak. */
export function Pagination({ page, pages, hrefFor, labels }: PaginationProps) {
  if (pages <= 1) return null;
  const current = Math.min(Math.max(page, 1), pages);
  const link = (enabled: boolean) => cn(buttonVariants({ variant: "secondary", size: "sm" }), !enabled && "pointer-events-none opacity-50");

  return (
    <nav aria-label={labels.label} className="flex items-center justify-center gap-4 pt-2">
      <Link href={hrefFor(current - 1)} aria-disabled={current <= 1} tabIndex={current <= 1 ? -1 : undefined} className={link(current > 1)}>
        <ChevronLeft size={16} aria-hidden="true" />
        {labels.previous}
      </Link>
      <span className="text-13 text-muted">{labels.position}</span>
      <Link href={hrefFor(current + 1)} aria-disabled={current >= pages} tabIndex={current >= pages ? -1 : undefined} className={link(current < pages)}>
        {labels.next}
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </nav>
  );
}
