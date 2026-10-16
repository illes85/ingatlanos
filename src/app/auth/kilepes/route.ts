import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Elavult munkamenet (törölt felhasználó) takarítása: kijelentkeztet, majd a belépéshez irányít.
 * Érvényes munkamenetet NEM léptet ki (idegen oldalról beágyazott kérés ne tudjon kiléptetni).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (userId) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (profile) return NextResponse.redirect(`${request.nextUrl.origin}/ma`);
  }
  await supabase.auth.signOut();
  return NextResponse.redirect(`${request.nextUrl.origin}/belepes`);
}
