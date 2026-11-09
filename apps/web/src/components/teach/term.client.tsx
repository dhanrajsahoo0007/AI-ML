"use client";

import { useEffect, useState, type ReactNode } from "react";

// The hover/focus root of an inline <Term>. The definition itself is shown by CSS (group-hover / focus-within);
// this island only adds Escape to hide it without moving the pointer or focus (WCAG 1.4.13). It sets
// data-dismissed while the pointer or focus stays on the term, and clears it once both have left.
export function TermRoot({ children }: { children: ReactNode }) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const active = hover || focus;

  useEffect(() => {
    if (!active) return;
    // On the document, so Escape also works while only the pointer rests on the term (focus is elsewhere).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDismissed(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <span
      className="group/term relative"
      data-dismissed={dismissed ? "true" : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        if (!focus) setDismissed(false);
      }}
      onFocus={() => setFocus(true)}
      onBlur={() => {
        setFocus(false);
        if (!hover) setDismissed(false);
      }}
    >
      {children}
    </span>
  );
}
