/**
 * Márka-konfiguráció. A termék neve, logója és alapszínei itt cserélhetők egy helyen.
 * A színek tényleges értékei a src/app/globals.css tokenjeiben élnek; ez a fájl a
 * nem-CSS helyekre (manifest, e-mail, PDF, meta theme-color) szolgáltat értéket.
 */
export const brand = {
  name: "Kulcs",
  tagline: "Ingatlanos munkaállomás ügynököknek és irodáknak",
  /** A logó jele: kulcs ikon (lásd components/shell/brand-mark.tsx). */
  logoMark: "key",
  colors: {
    primary: "#1F5C4A",
    accent: "#C8763A",
    aiFrom: "#6D5BF6",
    aiTo: "#C8763A",
    background: "#F7F6F2",
    backgroundDark: "#0E1013",
  },
  supportEmail: "hello@kulcs.app",
} as const;

export type Brand = typeof brand;
