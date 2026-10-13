"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/feedback";

/**
 * Streamelt szöveg gépelés-animációval. A 3. fázisban a valódi AI-stream adja a
 * `text` értékét folyamatosan; itt a kirajzolás a beérkezett szövegrészt követi.
 * Generálás előtt (üres szöveg + `pending`) csillámló AI-skeleton látszik.
 */
export function StreamingText({
  text,
  pending = false,
  speed = 18,
  className,
}: {
  text: string;
  pending?: boolean;
  /** ms / karakter */
  speed?: number;
  className?: string;
}) {
  const [shown, setShown] = React.useState(0);
  const reduceMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    if (reduceMotion) return;
    if (shown >= text.length) return;
    const id = window.setTimeout(() => setShown((n) => Math.min(text.length, n + 2)), speed);
    return () => window.clearTimeout(id);
  }, [shown, text, speed, reduceMotion]);

  if (pending && text.length === 0) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton ai className="h-3.5 w-full" />
        <Skeleton ai className="h-3.5 w-11/12" />
        <Skeleton ai className="h-3.5 w-2/3" />
      </div>
    );
  }

  const visible = reduceMotion ? text : text.slice(0, shown);
  const typing = !reduceMotion && shown < text.length;
  return (
    <p className={className} aria-live="polite">
      {visible}
      {typing ? <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-ai-text" /> : null}
    </p>
  );
}

function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
