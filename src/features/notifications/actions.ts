"use server";

import { requireAppContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Egy értesítés olvasottnak jelölése. Az adatbázis csak a saját sorra és csak az olvasottságra enged írást. */
export async function markNotificationRead(id: string): Promise<boolean> {
  const ctx = await requireAppContext();
  if (!UUID.test(id)) return false;
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .is("read_at", null);
  return !error;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const ctx = await requireAppContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", ctx.userId)
    .is("read_at", null);
  return !error;
}
