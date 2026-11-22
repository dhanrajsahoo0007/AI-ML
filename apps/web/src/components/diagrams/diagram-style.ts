import type { Phase } from "./build-view";
import type { LayoutTone, Tone } from "./types";

// Pure styling helpers for the diagram renderers: no React, no client code, so server modules and tests can
// import them without pulling the renderer chunk (./diagram-shared.client.tsx) into a route's first-load JS.

export const TONES: readonly Tone[] = ["blue", "green", "orange", "red", "violet", "teal", "neutral"];
/** Tones only layout specs may use; their arrow markers are added only to diagrams that use them. */
export const LAYOUT_ONLY_TONES: readonly LayoutTone[] = ["pink", "lime"];
export const stroke = (t: LayoutTone) => `var(--dg-${t})`;
export const soft = (t: LayoutTone) => `var(--dg-${t}-soft)`;
/** Tone-coloured text: AA-safe (4.5:1 on paper and on the soft fill). Never colour text with `stroke()`. */
export const toneText = (t: LayoutTone) => `var(--dg-${t}-text)`;
/** Pastel block fill (layout `fill: "pastel"`), strong enough to read as a coloured block with ink text on it. */
export const pastel = (t: LayoutTone) => `var(--dg-${t}-fill)`;

/** Estimated text width at the engine's label size, for pills and tabs. */
export const textWidth = (text: string, perChar = 6.3) => text.length * perChar;

/**
 * Estimated width of an edge or arrow label pill's text (11.5 px): capitals are wider than the 6.3 px average, so
 * relation names such as FROM_SOURCE or OWNED_BY stay inside their pill.
 */
export const pillTextWidth = (text: string) =>
  [...text].reduce((w, c) => w + (c >= "A" && c <= "Z" ? 8 : c === "_" ? 6.8 : 6.3), 0);

export const markerUrl = (uid: string, tone: LayoutTone) => `url(#${uid}-arrow-${tone})`;

/** Opacity of a group by phase; `dim` (highlight/path) wins through the .dg-dim class. */
export function phaseOpacity(phase: Phase, old = 0.6) {
  return phase === "old" ? old : 1;
}
