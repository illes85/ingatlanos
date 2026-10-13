import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Elavult munkamenet (törölt felhasználó) takarítása: kijelentkeztet, majd a belépéshez irányít. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${request.nextUrl.origin}/belepes`);
}
