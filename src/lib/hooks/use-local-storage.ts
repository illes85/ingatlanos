"use client";

import * as React from "react";

const EVENT = "kulcs:local-storage";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // privát mód / tiltott tárhely
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/**
 * Böngészőnkénti kényelmi beállítás (pl. oldalsáv állapota) localStorage-ben.
 * Szerveren és az első kliens-renderben null — hidratálási eltérés nélkül.
 */
export function useLocalStorage(key: string): [string | null, (value: string) => void] {
  const value = React.useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const set = React.useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // nem kritikus
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set];
}

/** true a kliensen a hidratálás után, false szerveren — „mounted” állapot effect nélkül. */
export function useIsClient(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
