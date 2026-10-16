import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseHost = new URL(supabaseUrl);

const isDev = process.env.NODE_ENV !== "production";
const mapHost = (() => {
  try {
    return new URL((process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png").replace(/{[^}]+}/g, "0")).origin;
  } catch {
    return "";
  }
})();
const wsOrigin = supabaseHost.origin.replace(/^http/, "ws");

// Biztonsági fejlécek minden útvonalra. A 'unsafe-inline' a Next.js beágyazott szkriptjei és a Tailwind miatt kell
// (nonce-alapú szigorítás későbbi feladat); a fejlesztői módban az 'unsafe-eval' a hot reload miatt.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseHost.origin} ${mapHost}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseHost.origin} ${wsOrigin} ${mapHost}${isDev ? " ws://localhost:* http://localhost:*" : ""}`.trim(),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // A next-intl a kérés-konfigurációt a „next-intl/config” aliason keresztül tölti be.
  // A createNextIntlPlugin() ugyanezt állítaná be, de betölti a @swc/core natív modult is,
  // ami egyes Windows-gépeken a profilmappa jogosultságai miatt nem indul (DECISIONS D-009).
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./src/i18n/request.ts",
    },
  },
  // Fejlesztés közben a telefonról (azonos Wi-Fi) is megnyitható az oldal erről a címről.
  allowedDevOrigins: ["10.204.68.11"],
  images: {
    remotePatterns: [
      {
        protocol: supabaseHost.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseHost.hostname,
        port: supabaseHost.port,
        pathname: "/storage/v1/**",
      },
    ],
    // A helyi Supabase a 127.0.0.1-en fut; élesben a Supabase felhő-domainje van itt.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    qualities: [70, 75, 85],
  },
};

export default nextConfig;
