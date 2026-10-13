import { getTranslations } from "next-intl/server";
import {
  ArrowRightLeft,
  Banknote,
  CalendarCheck,
  CheckSquare,
  FileText,
  Handshake,
  Inbox,
  Mail,
  Megaphone,
  MessageSquare,
  Phone,
  Send,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { formatShortDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";
import type { PropertyActivityItem } from "../detail-types";

type ActivityType = Database["public"]["Enums"]["activity_type"];

const ICONS: Record<ActivityType, LucideIcon> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  note: StickyNote,
  showing: CalendarCheck,
  price_change: Banknote,
  status_change: ArrowRightLeft,
  document: FileText,
  offer: Handshake,
  lead: Inbox,
  recommendation: Send,
  task: CheckSquare,
  listing: Megaphone,
};

const TONES: Partial<Record<ActivityType, string>> = {
  showing: "bg-primary-soft text-primary",
  price_change: "bg-accent-soft text-accent-text",
  offer: "bg-accent-soft text-accent-text",
};

/** Egységes idővonal-lista (ingatlan és később ügyfél adatlapján is): ikon, cím, megjegyzés, időpont. */
export async function ActivityList({ items, className }: { items: PropertyActivityItem[]; className?: string }) {
  const tEnums = await getTranslations("enums.activityType");
  return (
    <ol className={cn("flex flex-col gap-4", className)}>
      {items.map((item) => {
        const Icon = ICONS[item.type];
        return (
          <li key={item.id} className="flex items-start gap-3.5">
            <span
              aria-label={tEnums(item.type)}
              role="img"
              className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-2", TONES[item.type])}
            >
              <Icon size={18} aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-15 font-semibold">{item.title}</span>
              <span className="text-13 text-muted">
                {formatShortDate(item.occurredAt)} {formatTime(item.occurredAt)}
                {item.body ? ` · ${item.body}` : ""}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
