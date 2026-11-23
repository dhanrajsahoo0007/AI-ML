// Text widths for the diagram renderers and the spec lint: one model, so a label the lint passes is one the
// browser draws inside its box. Pure (no DOM): the server render, hydration and tests all get the same numbers.
//
// Calibration: advance widths of Inter (next/font, the site's --font-sans) measured with getBBox() in Chromium at
// 100px, weights 400 and 700, in thousandths of an em. Inter is a variable font and its advances move linearly with
// weight (500 and 600 measured within 0.01px of the interpolation at 100px), and they scale linearly with size (no
// optical sizing in use), so two tables cover every size and weight the renderers use. Characters outside the table
// (rare symbols drawn from a fallback font) count as FALLBACK em. Kerning is ignored: against the measured width of
// every label in the specs (about 21,000 strings) the estimate is within 0.7 units for 99% of them and at most 1.3
// narrow for Latin text (Greek and math symbols from the fallback font up to about 3), at full size and at phone
// scale (the drawing at 0.45 of its size) alike. tests/unit/diagrams/text-width.test.ts pins measured widths.
// Re-measure (and update that test) if the font, its features or the renderers' sizes change.

const GLYPHS =
  "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~×·→≈÷−§–£≤…“”≥²±α°√Σθᵢε‖∞πΔ₁₂ᵀβλ′✓⌈⌉¹γ↔κσµ⁰’‘⊕⌊⌋⇄τ⁴∂≠⁻μΦ≡Ψₑ∥δ₀←ü↓φ⁶₃⁹∈Π³—₄¼½✗∏é⁷₅ℓΘ∝ⁿö↗↑∅⁵⁸₆ΓÉ€•▁└Āᾱₜ▾▒▸ⁱ©⋮чай茶🍵";
const W400 = [
  631, 407, 610, 618, 646, 593, 620, 583, 619, 620, 281, 288, 466, 633, 642, 982, 644, 300, 365, 365, 645, 662, 288,
  460, 288, 360, 288, 302, 662, 662, 662, 511, 966, 703, 654, 730, 722, 601, 590, 746, 743, 269, 571, 672, 565, 903,
  753, 765, 639, 765, 644, 642, 645, 744, 703, 1007, 682, 679, 629, 365, 316, 365, 471, 459, 323, 562, 612, 571, 612,
  583, 335, 613, 591, 242, 242, 549, 242, 876, 591, 600, 612, 612, 392, 528, 329, 591, 563, 818, 546, 563, 552, 426,
  333, 426, 662, 662, 288, 1071, 588, 662, 662, 568, 500, 611, 588, 864, 440, 440, 588, 442, 662, 619, 456, 588, 662,
  596, 168, 478, 442, 764, 739, 715, 278, 278, 463, 616, 536, 223, 764, 602, 602, 304, 536, 1071, 536, 661, 586, 278,
  261, 261, 724, 602, 602, 1000, 423, 278, 529, 588, 166, 617, 855, 625, 895, 398, 346, 596, 278, 1071, 591, 834, 695,
  278, 278, 278, 576, 774, 446, 1000, 278, 802, 847, 571, 882, 583, 278, 278, 346, 833, 519, 391, 600, 1000, 834, 717,
  278, 278, 278, 590, 601, 666, 562, 1000, 759, 703, 619, 201, 639, 759, 530, 111, 914, 411, 558, 596, 598, 1004, 998,
];
const W700 = [
  674, 431, 630, 645, 676, 622, 650, 599, 651, 650, 237, 338, 551, 649, 655, 1015, 672, 339, 377, 377, 673, 679, 334,
  468, 334, 388, 334, 343, 679, 679, 679, 559, 1016, 760, 662, 740, 722, 607, 587, 751, 747, 281, 584, 719, 565, 932,
  762, 770, 648, 777, 657, 655, 668, 732, 760, 1057, 738, 731, 664, 377, 344, 377, 487, 481, 365, 580, 630, 588, 630,
  596, 361, 632, 623, 271, 271, 580, 271, 912, 622, 613, 630, 630, 415, 560, 358, 623, 601, 850, 580, 603, 573, 469,
  372, 469, 679, 679, 334, 1071, 588, 679, 679, 568, 500, 639, 588, 1002, 540, 532, 588, 460, 679, 619, 460, 588, 662,
  596, 168, 478, 442, 764, 739, 715, 278, 278, 463, 616, 536, 274, 764, 602, 602, 333, 536, 1071, 536, 661, 628, 278,
  311, 311, 724, 602, 602, 1000, 423, 278, 529, 588, 167, 617, 855, 625, 895, 398, 346, 596, 278, 1071, 623, 905, 695,
  278, 278, 278, 576, 774, 472, 1000, 278, 846, 881, 571, 882, 596, 278, 278, 346, 833, 519, 391, 613, 1000, 905, 717,
  278, 278, 278, 590, 607, 685, 474, 1000, 759, 760, 619, 242, 639, 759, 530, 139, 914, 411, 558, 596, 598, 1004, 998,
];

/** Width in em of a character missing from the table. */
const FALLBACK = 0.72;

const ADVANCE = new Map<string, [number, number]>([...GLYPHS].map((c, i) => [c, [W400[i], W700[i]]]));

export interface TextFont {
  /** Font size in viewBox units. */
  size: number;
  /** 400 to 700 (default 400). */
  weight?: number;
  /** Extra space after every character, in viewBox units (the SVG letter-spacing attribute). */
  letterSpacing?: number;
}

/** The text styles the renderers draw, by role. Keep in step with the fontSize / fontWeight in the renderers. */
export const FONTS = {
  /** Card and glyph node labels, lane headers (animated-diagram.tsx, sequence-diagram.client.tsx). */
  label: { size: 13.5, weight: 600 },
  /** Node sub line. */
  sub: { size: 11.5, weight: 400 },
  /** Edge and arrow label pills (LabelPill); `pillBold` for bold pills. */
  pill: { size: 11.5, weight: 500 },
  pillBold: { size: 11.5, weight: 600 },
  /** Sequence message labels. */
  message: { size: 11.5, weight: 500 },
  /** Sequence notes and note-kind messages. */
  note: { size: 11.5, weight: 400 },
  /** Zone title tabs (Zone). */
  zoneTab: { size: 14, weight: 600 },
  /** Region and VPC tabs (BoundaryZone). */
  boundaryTab: { size: 13, weight: 700 },
  /** Subnet band labels, drawn in capitals. */
  subnet: { size: 11.5, weight: 700, letterSpacing: 0.6 },
  /** Layout box and cell labels. */
  shape: { size: 13, weight: 600 },
  /** Layout `text` shapes. */
  shapeText: { size: 12.5, weight: 500 },
  /** Layout box sub line. */
  shapeSub: { size: 11, weight: 400 },
  /** The NEW tag. */
  tag: { size: 10.5, weight: 700, letterSpacing: 0.6 },
} as const satisfies Record<string, TextFont>;

/** Estimated rendered width of `text` in `font`, in viewBox units. */
export function measureText(text: string, font: TextFont): number {
  const t = Math.min(1, Math.max(0, ((font.weight ?? 400) - 400) / 300));
  let em = 0;
  let n = 0;
  for (const c of text) {
    const a = ADVANCE.get(c);
    // Combining marks (a macron over a letter) take no room of their own.
    em += a ? (a[0] + (a[1] - a[0]) * t) / 1000 : /[\u0300-\u036f]/.test(c) ? 0 : FALLBACK;
    n++;
  }
  return em * font.size + n * (font.letterSpacing ?? 0);
}
