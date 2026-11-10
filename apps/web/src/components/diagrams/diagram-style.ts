import type { Phase } from "./build-view";
import type { Tone } from "./types";

// Pure styling helpers for the diagram renderers: no React, no client code, so server modules and tests can
// import them without pulling the renderer chunk (./diagram-shared.client.tsx) into a route's first-load JS.

export const TONES: readonly Tone[] = ["blue", "green", "orange", "red", "violet", "teal", "neutral"];
export const stroke = (t: Tone) => `var(--dg-${t})`;
export const soft = (t: Tone) => `var(--dg-${t}-soft)`;

/** Estimated text width at the engine's label size, for pills and tabs. */
export const textWidth = (text: string, perChar = 6.3) => text.length * perChar;

export const markerUrl = (uid: string, tone: Tone) => `url(#${uid}-arrow-${tone})`;

/** Opacity of a group by phase; `dim` (highlight/path) wins through the .dg-dim class. */
export function phaseOpacity(phase: Phase, old = 0.6) {
  return phase === "old" ? old : 1;
}
