import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Near-duplicate test with 64-bit simhash fingerprints (web-crawler, Deep dive 2). Each fingerprint is drawn as 16 hex
// digits (4 bits each). Similar pages get fingerprints that differ in few bits; the test is "at most K = 3 bits differ".
// Two steps: 1 page A and page B (the same article with a different ad block): B differs from A in 3 bits, so
// A xor B has 3 one-bits: a near-duplicate, B is not parsed or indexed again · 2 page C (another article on the same
// site): C differs from A in 9 bits: a different page, which goes on to the parser.
// Working: the fingerprints are illustrative. B = A with bits flipped by the masks 0x4, 0x1 and 0x8 in hex digits 2,
// 7 and 13 (1 bit each = 3 bits); C = A with masks 0x3, 0x5, 0x7 and 0x3 in digits 0, 4, 9 and 15 (2 + 2 + 3 + 2 =
// 9 bits). The xor rows and the bit counts are computed below, not typed.
// Layout (840 wide): a label column x 20 (w 130); 16 cells of 40 × 34 from x 160; rows A 40, B 84, A xor B 128,
// verdict 172; step 2 rows C 232, A xor C 276, verdict 320.
// Colours (PATTERN_TONE): fingerprint digits pink (ids and hashes), digits that differ and non-zero xor digits orange,
// the near-duplicate verdict green, the "different page" verdict blue, zero xor digits and labels neutral.

const K = 3;
const X0 = 160;
const CELL = 40;
const CELL_H = 34;
const W = X0 + 16 * CELL + 40;

const A = "3F9A2C71E04B8D56";
const flip = (fp: string, masks: Record<number, number>) =>
  fp
    .split("")
    .map((d, i) => (parseInt(d, 16) ^ (masks[i] ?? 0)).toString(16).toUpperCase())
    .join("");
const xor = (p: string, q: string) =>
  p
    .split("")
    .map((d, i) => (parseInt(d, 16) ^ parseInt(q[i], 16)).toString(16).toUpperCase())
    .join("");
const bits = (hex: string) =>
  hex.split("").reduce((n, d) => n + (parseInt(d, 16).toString(2).match(/1/g)?.length ?? 0), 0);

const B = flip(A, { 2: 0x4, 7: 0x1, 13: 0x8 });
const C = flip(A, { 0: 0x3, 4: 0x5, 9: 0x7, 15: 0x3 });
const AB = xor(A, B);
const AC = xor(A, C);

const shapes: LayoutShape[] = [];

function row(id: string, title: string, hex: string, y: number, step: number, diff?: string, isXor = false) {
  shapes.push({
    id: `${id}-label`,
    type: "text",
    x: 20,
    y,
    w: 130,
    h: CELL_H,
    label: title,
    tone: PATTERN_TONE.infra,
    step,
  });
  hex.split("").forEach((d, i) => {
    const changed = isXor ? d !== "0" : diff !== undefined && diff[i] !== "0";
    shapes.push({
      id: `${id}-${i}`,
      type: "cell",
      x: X0 + i * CELL,
      y,
      w: CELL,
      h: CELL_H,
      label: d,
      tone: changed ? PATTERN_TONE.traffic : isXor ? PATTERN_TONE.infra : PATTERN_TONE.id,
      quiet: true,
      step,
    });
  });
}

function verdict(id: string, y: number, n: number, step: number) {
  const near = n <= K;
  shapes.push({
    id,
    type: "box",
    x: X0,
    y,
    w: 16 * CELL,
    h: 40,
    label: near
      ? `${n} bits differ ≤ ${K}: near-duplicate, do not parse or index`
      : `${n} bits differ > ${K}: a different page, send to the parser`,
    tone: near ? PATTERN_TONE.pattern : PATTERN_TONE.data,
    fill: "pastel",
    step,
  });
}

shapes.push({
  id: "head",
  type: "text",
  x: X0,
  y: 8,
  w: 16 * CELL,
  h: 22,
  label: "64-bit simhash fingerprints, as 16 hex digits of 4 bits",
  tone: PATTERN_TONE.infra,
});
row("a", "Page A", A, 40, 1);
row("b", "Page B", B, 84, 1, AB);
row("ab", "A xor B", AB, 128, 1, undefined, true);
verdict("v-ab", 172, bits(AB), 1);

row("c", "Page C", C, 232, 2, AC);
row("ac", "A xor C", AC, 276, 2, undefined, true);
verdict("v-ac", 320, bits(AC), 2);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Simhash: near-duplicates differ in at most 3 bits",
  width: W,
  height: 376,
  shapes,
  steps: [{ title: "Page B: 3 bits differ, a near-duplicate" }, { title: "Page C: 9 bits differ, a new page" }],
};

export default spec;
