import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";

/** Nyilvános útvonalak — belépés nélkül is elérhetők. */
const PUBLIC_PATHS = ["/belepes", "/regisztracio", "/auth", "/p"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Munkamenet frissítése minden kérésnél + optimista átirányítás a belépéshez.
 * (A tényleges jogosultság-ellenőrzés a szerveroldali lekérdezésekben és az RLS-ben történik.)
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!publicEnv.supabaseAnonKey) return response;

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Fontos: a getClaims() hívás és a válasz között ne fusson más logika (munkamenet-frissítés).
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!isSignedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/belepes";
    url.search = pathname === "/" || pathname === "/ma" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (isSignedIn && (pathname === "/belepes" || pathname === "/regisztracio")) {
    const url = request.nextUrl.clone();
    url.pathname = "/ma";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
