/**
 * Egyszerű vonalas illusztrációk az üres állapotokhoz (Alapelemek: „Üres állapot”).
 * Egységes stílus: 1.6 vonalvastagság, kerek végek, tompa zöldesszürke vonal.
 */

const common = {
  fill: "none",
  stroke: "var(--illustration, #9AA39C)",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function HouseIllustration({ className }: { className?: string }) {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" className={className} {...common}>
      <path d="M10 64h68" />
      <path d="M20 64V34l24-18 24 18v30" />
      <rect x="38" y="44" width="12" height="20" />
      <path d="M60 14l4-4M66 20l6-2M54 10l1-6" />
    </svg>
  );
}

export function CalendarIllustration({ className }: { className?: string }) {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" className={className} {...common}>
      <rect x="18" y="14" width="52" height="48" rx="6" />
      <path d="M18 28h52M32 8v12M56 8v12" />
      <path d="M32 44l6 6 12-12" />
    </svg>
  );
}

export function InboxIllustration({ className }: { className?: string }) {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" className={className} {...common}>
      <path d="M14 40h18l5 8h14l5-8h18" />
      <path d="M22 16h44l8 24v20a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V40z" />
      <path d="M44 4v18M38 16l6 6 6-6" />
    </svg>
  );
}

export function PeopleIllustration({ className }: { className?: string }) {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" className={className} {...common}>
      <circle cx="34" cy="26" r="10" />
      <path d="M14 62c2-12 10-18 20-18s18 6 20 18" />
      <path d="M56 18a9 9 0 0 1 0 17M62 46c6 2 10 8 12 16" />
    </svg>
  );
}

export function BoardIllustration({ className }: { className?: string }) {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" className={className} {...common}>
      <rect x="10" y="12" width="18" height="50" rx="4" />
      <rect x="35" y="12" width="18" height="34" rx="4" />
      <rect x="60" y="12" width="18" height="22" rx="4" />
    </svg>
  );
}

export function DocumentIllustration({ className }: { className?: string }) {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" className={className} {...common}>
      <path d="M52 6H26a2 2 0 0 0-2 2v56a2 2 0 0 0 2 2h36a2 2 0 0 0 2-2V18z" />
      <path d="M52 6v12h12M34 34h20M34 44h20M34 54h12" />
    </svg>
  );
}
