import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseHost = new URL(supabaseUrl);

const nextConfig: NextConfig = {
  // A next-intl a kérés-konfigurációt a „next-intl/config” aliason keresztül tölti be.
  // A createNextIntlPlugin() ugyanezt állítaná be, de betölti a @swc/core natív modult is,
  // ami egyes Windows-gépeken a profilmappa jogosultságai miatt nem indul (DECISIONS D-009).
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./src/i18n/request.ts",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: supabaseHost.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseHost.hostname,
        port: supabaseHost.port,
        pathname: "/storage/v1/object/**",
      },
    ],
    // A helyi Supabase a 127.0.0.1-en fut; élesben a Supabase felhő-domainje van itt.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    qualities: [70, 75, 85],
  },
};

export default nextConfig;
