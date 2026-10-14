"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, CalendarClock, CheckCheck, Globe, Inbox, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger, Tooltip } from "@/components/ui/overlay";
import { useShell } from "@/components/shell/shell-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "../actions";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const COLUMNS = "id, type, title, body, link, read_at, created_at";
const ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  lead: Inbox,
  lead_assigned: Inbox,
  public_inquiry: Globe,
  task_assigned: ListTodo,
  showing: CalendarClock,
  showing_assigned: CalendarClock,
  deadline: CalendarClock,
};

const rtf = new Intl.RelativeTimeFormat("hu", { numeric: "auto" });
function relativeTime(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

/** Csak alkalmazáson belüli útvonalra navigálunk (az adatbázis is ezt kényszeríti). */
const safeLink = (link: string | null) => (link && /^\/(?![/\\])[\w\-/?=&.%#]*$/.test(link) ? link : null);

/** Csengő: olvasatlan jelzés, legutóbbi értesítések, valós idejű érkezés. */
export function NotificationsMenu() {
  const t = useTranslations();
  const { data } = useShell();
  const userId = data.user.id;
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = React.useState(data.counts.unreadNotifications);
  const [live, setLive] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const [list, count] = await Promise.all([
      supabase.from("notifications").select(COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    ]);
    if (list.data) setItems(list.data);
    if (count.count !== null) setUnread(count.count);
  }, [userId]);

  // Valós idejű érkezés: az RLS miatt csak a sajátjaink jönnek, a szűrő a forgalmat is szűkíti.
  React.useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    // A munkamenet tokenjét a feliratkozás előtt átadjuk a valós idejű kapcsolatnak, különben az RLS miatt nem érkezik esemény.
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled || !session) return;
      await supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const row = payload.new as NotificationItem;
            setItems((current) => (current ? [row, ...current.filter((i) => i.id !== row.id)].slice(0, 20) : current));
            setUnread((n) => n + 1);
            toast(row.title, { description: row.body ?? undefined });
          },
        )
        .subscribe((status) => setLive(status === "SUBSCRIBED"));
    });
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void load();
  };

  const readOne = (item: NotificationItem) => {
    if (item.read_at) return;
    const now = new Date().toISOString();
    setItems((current) => current?.map((i) => (i.id === item.id ? { ...i, read_at: now } : i)) ?? current);
    setUnread((n) => Math.max(0, n - 1));
    void markNotificationRead(item.id);
  };

  const readAll = async () => {
    const now = new Date().toISOString();
    setItems((current) => current?.map((i) => (i.read_at ? i : { ...i, read_at: now })) ?? current);
    setUnread(0);
    await markAllNotificationsRead();
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip content={t("shell.notifications")} side="bottom">
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            aria-label={unread > 0 ? t("notifications.labelUnread", { count: unread }) : t("shell.notifications")}
            data-live={live}
            className="relative text-ink-2"
          >
            <Bell size={18} strokeWidth={1.8} />
            {unread > 0 ? (
              <span
                data-testid="notifications-badge"
                className="absolute top-2.5 right-[11px] size-2 rounded-full border-2 border-surface bg-danger box-content"
              />
            ) : null}
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-15 font-semibold text-ink">{t("shell.notifications")}</h2>
          <Button variant="ghost" size="sm" onClick={readAll} disabled={unread === 0}>
            <CheckCheck size={15} />
            {t("notifications.markAll")}
          </Button>
        </div>
        <div className="max-h-[420px] overflow-y-auto" data-testid="notifications-list">
          {items === null ? (
            <p className="px-4 py-8 text-center text-14 text-muted">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-14 text-muted">{t("notifications.empty")}</p>
          ) : (
            <ul>
              {items.map((item) => {
                const Icon = ICONS[item.type] ?? Bell;
                const href = safeLink(item.link);
                const content = (
                  <>
                    <span
                      className={cn(
                        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                        item.read_at ? "bg-bg text-muted" : "bg-primary-soft text-primary",
                      )}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-14 text-ink", !item.read_at && "font-semibold")}>{item.title}</span>
                      {item.body ? <span className="block truncate text-13 text-ink-2">{item.body}</span> : null}
                      <span className="block text-12 text-muted">{relativeTime(item.created_at)}</span>
                    </span>
                    {!item.read_at ? <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-primary" /> : null}
                  </>
                );
                const className = "flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-bg";
                return (
                  <li key={item.id}>
                    {href ? (
                      <Link
                        href={href}
                        className={className}
                        onClick={() => {
                          readOne(item);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button type="button" className={className} onClick={() => readOne(item)}>
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
