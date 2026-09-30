"use client";

import { useEffect, useState } from "react";

/** How long a notice stays before it fades. */
const SHOWN_MS = 5000;
const FADE_MS = 400;

/**
 * A notice said once: shown for a few seconds the first time this browser sees
 * it, then faded out and never drawn again, so "Scan done" is news when it
 * happens and not a banner every later visit has to read past. It draws nothing
 * on the server, so a refresh never flashes a notice already seen.
 */
export function Fleeting({ id, children }: { id: string; children: React.ReactNode }) {
  const [state, setState] = useState<"hidden" | "shown" | "leaving">("hidden");
  useEffect(() => {
    const key = `lurk:seen:${id}`;
    let seen = false;
    try {
      seen = window.localStorage.getItem(key) !== null;
    } catch {
      // Storage refused (private mode): show it this once all the same.
    }
    if (seen) {
      return;
    }
    // Marked seen only once it is on screen, so an effect run and undone
    // before then (React runs them twice in development) does not spend it.
    const show = setTimeout(() => {
      try {
        window.localStorage.setItem(key, "1");
      } catch {
        // As above.
      }
      setState("shown");
    }, 0);
    const fade = setTimeout(() => setState("leaving"), SHOWN_MS);
    const gone = setTimeout(() => setState("hidden"), SHOWN_MS + FADE_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, [id]);
  if (state === "hidden") {
    return null;
  }
  return (
    <div style={{ opacity: state === "leaving" ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}>{children}</div>
  );
}
