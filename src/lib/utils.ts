import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// A saját betűméret-skálát (text-13, text-22 …) a tailwind-merge-nek ismernie kell,
// különben összetévesztené a szövegszín-osztályokkal.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["11", "12", "13", "14", "15", "16", "18", "20", "22", "24", "28", "32", "34", "38", "44", "48"] }],
      shadow: [{ shadow: ["card", "raised", "ai", "glass", "popover", "chip", "fab", "selected"] }],
      rounded: [{ rounded: ["kbd", "seg", "control", "tile", "panel", "card", "card-lg", "map"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Determinisztikus választás egy listából szöveg alapján (pl. avatar-tónus név szerint). */
export function pickByHash<T>(key: string, items: readonly T[]): T {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return items[Math.abs(hash) % items.length]!;
}
