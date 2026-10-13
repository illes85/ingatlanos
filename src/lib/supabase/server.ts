import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { assertSupabaseConfigured, publicEnv, serverEnv } from "@/lib/env";

/**
 * Felhasználói munkamenettel futó kliens (Server Components, Server Actions, route handlerek).
 * Minden lekérdezés az RLS policy-k szerint fut — ez az alapértelmezett adatelérés.
 */
export async function createClient() {
  // Előbb a sütik: ettől az útvonal kérésenként renderelődik (nincs build-idejű előrenderelés).
  const cookieStore = await cookies();
  assertSupabaseConfigured();
  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Componentből hívva a cookie nem írható; a munkamenetet a proxy frissíti.
        }
      },
    },
  });
}

/**
 * Service role kliens — MEGKERÜLI az RLS-t. Csak kifejezetten rendszerszintű műveletekhez
 * (seed, AI-napló írása, webhookok). Felhasználói adatlekérdezéshez soha.
 */
export function createAdminClient() {
  const { supabaseServiceRoleKey } = serverEnv();
  if (!supabaseServiceRoleKey) {
    throw new Error("Hiányzik a SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createPlainClient<Database>(publicEnv.supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
