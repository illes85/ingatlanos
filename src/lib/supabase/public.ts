import "server-only";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { assertSupabaseConfigured, publicEnv } from "@/lib/env";

/**
 * Névtelen (anon) kliens a nyilvános oldalakhoz: nincs munkamenet, nincs süti, így a kérés soha nem fut
 * bejelentkezett felhasználóként. Csak a szűk, kifejezetten névtelenre szánt függvényeket éri el.
 */
export function createPublicClient() {
  assertSupabaseConfigured();
  return createPlainClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
