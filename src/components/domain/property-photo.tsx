import Image from "next/image";
import { cn, pickByHash } from "@/lib/utils";
import type { Database } from "@/types/database";

type PropertyType = Database["public"]["Enums"]["property_type"];

/** Tónusos helykitöltők a látványtervből — ha még nincs fotó. */
const TONES = ["#CBD5CC", "#DDD3C3", "#D3D7DD", "#C7D2C9", "#D8CFC0", "#CDD3D9", "#D6DCCF", "#C9C1B4", "#CFC8BD"];

function TypeGlyph({ type, size }: { type: PropertyType; size: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "rgba(22,24,29,0.28)",
    strokeWidth: 1.2,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (type === "flat" || type === "office" || type === "retail") {
    return (
      <svg {...common}>
        <rect x="5" y="3" width="14" height="18" rx="1" />
        <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
      </svg>
    );
  }
  if (type === "plot") {
    return (
      <svg {...common}>
        <path d="M2 12l5-4 5 4 5-4 5 4v8H2z" />
        <path d="M7 20v-5M17 20v-5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <rect x="9" y="13" width="6" height="8" />
    </svg>
  );
}

export interface PropertyPhotoProps {
  src: string | null;
  alt: string;
  /** Helykitöltő tónusának kiválasztásához (pl. ingatlan id). */
  seed: string;
  type?: PropertyType;
  sizes: string;
  className?: string;
  glyphSize?: number;
  priority?: boolean;
  /** Hover-zoom (kártya-hover: fotó 1.03). A szülőn `group` osztály kell. */
  zoomOnHover?: boolean;
}

/** Ingatlanfotó kitöltő módban; fotó hiányában a terv tónusos helykitöltője. */
export function PropertyPhoto({ src, alt, seed, type = "house", sizes, className, glyphSize = 64, priority, zoomOnHover }: PropertyPhotoProps) {
  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={src ? undefined : { backgroundColor: pickByHash(seed, TONES) }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover",
            zoomOnHover && "transition-transform duration-[250ms] ease-out group-hover:scale-[1.03]",
          )}
        />
      ) : (
        <TypeGlyph type={type} size={glyphSize} />
      )}
    </div>
  );
}
