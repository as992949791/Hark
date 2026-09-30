"use client";

import { useEffect, useState } from "react";

/** How long a notice stays before it goes, and how long it takes to open or close. */
const SHOWN_MS = 5000;
const MOVE_MS = 400;
/** The gap-3 between rows of the columns a notice sits in. */
const GAP = "0.75rem";

/**
 * A notice said once: shown for a few seconds the first time this browser sees
 * it, then closed and never drawn again, so "Scan done" is news when it happens
 * and not a banner every later visit has to read past. It draws nothing on the
 * server, so a refresh never flashes a notice already seen.
 */
export function Fleeting({ id, children }: { id: string; children: React.ReactNode }) {
  // Keyed so a new notice starts from nothing rather than inheriting the last one's state.
  return (
    <Notice key={id} id={id}>
      {children}
    </Notice>
  );
}

function Notice({ id, children }: { id: string; children: React.ReactNode }) {
  const [phase, setPhase] = useState<"off" | "opening" | "open" | "closing">("off");
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
    // Drawn closed first, then opened two frames later so the browser has
    // painted the closed row and animates the opening. Marked seen only once it
    // has finished opening, so an effect undone before then (React runs them twice in
    // development, or the page moves on) does not spend it.
    let frame = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    frame = requestAnimationFrame(() => {
      setPhase("opening");
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          setPhase("open");
          timers.push(
            setTimeout(() => {
              try {
                window.localStorage.setItem(key, "1");
              } catch {
                // As above.
              }
            }, MOVE_MS),
          );
          timers.push(setTimeout(() => setPhase("closing"), SHOWN_MS));
          timers.push(setTimeout(() => setPhase("off"), SHOWN_MS + MOVE_MS));
        });
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [id]);
  if (phase === "off") {
    return null;
  }
  // The row grows and shrinks with the fade, so the feed under it slides rather
  // than jumps. The columns these sit in space their rows with gap-3; the
  // negative margin takes back the gap this row adds and the padding inside the
  // folding part gives it back, so a closed row costs nothing.
  const open = phase === "open";
  return (
    <div
      style={{
        display: "grid",
        marginBottom: `-${GAP}`,
        gridTemplateRows: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        transition: `grid-template-rows ${MOVE_MS}ms ease, opacity ${MOVE_MS}ms ease`,
      }}
    >
      <div style={{ overflow: "hidden", minHeight: 0 }}>
        <div style={{ paddingBottom: GAP }}>{children}</div>
      </div>
    </div>
  );
}
