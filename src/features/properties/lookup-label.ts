import "server-only";
import { getTranslations } from "next-intl/server";

type LookupCategory = "heating" | "material" | "condition" | "parking";

/**
 * Szerkeszthető választólisták (fűtés, falazat, állapot, parkolás) magyar címkéi (D-016).
 * Ismeretlen kulcsnál (pl. a szervezet saját értéke) a nyers érték jelenik meg.
 */
export async function lookupLabel() {
  const t = await getTranslations("lookups");
  return (category: LookupCategory, key: string): string => {
    const path = `${category}.${key}`;
    return t.has(path as Parameters<typeof t.has>[0]) ? t(path as Parameters<typeof t>[0]) : key;
  };
}
