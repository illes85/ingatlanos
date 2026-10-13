import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Aláírt URL-ek élettartama: egy oldalbetöltéshez bőven elég, tárolni nem érdemes. */
const SIGNED_URL_SECONDS = 3600;

/** Az ingatlanok borítófotói aláírt URL-lel (privát bucket). Hiányzó fotónál nincs bejegyzés a térképben. */
export async function signedCoverUrls(supabase: SupabaseClient<Database>, propertyIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (propertyIds.length === 0) return result;
  const { data: media } = await supabase
    .from("property_media")
    .select("property_id, storage_path")
    .in("property_id", propertyIds)
    .eq("is_cover", true)
    .not("storage_path", "is", null);
  const paths = (media ?? []).map((m) => m.storage_path!).filter(Boolean);
  if (paths.length === 0) return result;
  const { data: signed } = await supabase.storage.from("property-media").createSignedUrls(paths, SIGNED_URL_SECONDS);
  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  for (const m of media ?? []) {
    const url = m.storage_path ? byPath.get(m.storage_path) : undefined;
    if (url) result.set(m.property_id, url);
  }
  return result;
}
