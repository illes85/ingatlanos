/**
 * A navigáció ikonjai a látványtervből (Main.dc.html) átvett, pixelpontos SVG-k.
 * 24×24 viewBox, 1.8-as vonal, kerek végek — a lucide-react stílusával összhangban.
 */
import type { NavKey } from "@/config/navigation";
import { AiSpark } from "@/components/ai/ai";

const PATHS: Record<Exclude<NavKey, "valuation" | "acquisition" | "marketing">, React.ReactNode> = {
  today: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  properties: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M10 21v-4h4v4" />
    </>
  ),
  contacts: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2" />
    </>
  ),
  leads: (
    <>
      <path d="M3 13h5l2 3h4l2-3h5" />
      <path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />
    </>
  ),
  deals: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="11" rx="1.5" />
      <rect x="17" y="4" width="4" height="7" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  tasks: (
    <>
      <path d="M9 11l2.5 2.5L16 9" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </>
  ),
  documents: (
    <>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
};

export function NavIcon({ name, size = 18 }: { name: NavKey; size?: number }) {
  if (name === "valuation" || name === "acquisition" || name === "marketing") {
    return <AiSpark size={size} filled={false} className="text-ai-text" />;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Kulcs logójel: kulcs ikon zöld lekerekített négyzetben. */
export function BrandMark({ size = 34 }: { size?: number }) {
  const icon = Math.round(size * 0.53);
  return (
    <span
      className="flex shrink-0 items-center justify-center bg-primary text-on-primary"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.29) }}
      aria-hidden="true"
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="15" r="4" />
        <path d="M10.8 12.2 20 3" />
        <path d="M16 7l3 3" />
        <path d="M13.5 9.5l2 2" />
      </svg>
    </span>
  );
}

/** Mikrofon (mobil FAB). */
export function MicIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/** Telefon (hívás gomb). */
export function PhoneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}
