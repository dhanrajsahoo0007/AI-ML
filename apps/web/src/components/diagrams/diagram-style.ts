import type { Phase } from "./build-view";
import { FONTS, measureText } from "./text-width";
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

/** Width of an edge or arrow label pill (LabelPill): the text plus 7 units of padding each side. */
export const pillWidth = (text: string, bold = false) => measureText(text, bold ? FONTS.pillBold : FONTS.pill) + 14;

/** Width of a zone's title tab (Zone): the text plus 14 units each side. */
export const zoneTabWidth = (title: string) => measureText(title, FONTS.zoneTab) + 28;

/** Width of a region or VPC title tab (BoundaryZone): the text plus 12 units each side. */
export const boundaryTabWidth = (title: string) => measureText(title, FONTS.boundaryTab) + 24;

export const markerUrl = (uid: string, tone: LayoutTone) => `url(#${uid}-arrow-${tone})`;

/** Opacity of a group by phase; `dim` (highlight/path) wins through the .dg-dim class. */
export function phaseOpacity(phase: Phase, old = 0.6) {
  return phase === "old" ? old : 1;
}
