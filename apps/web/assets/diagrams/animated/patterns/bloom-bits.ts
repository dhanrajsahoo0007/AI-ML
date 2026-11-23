import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// How a Bloom filter answers (bloom-filter, Architecture figure). A toy filter of m = 16 bits and k = 3 hash functions
// in front of Brightpost's product database; the hash positions are illustrative. One row per step shows the bit
// array after that step.
// Five steps: 1 an empty filter, all 16 bits 0 · 2 add "kettle": its hashes set bits 1, 4, 6 · 3 add "toaster": bits
// 9, 12, 14 · 4 look up "mug" (bits 1, 3, 6): bit 3 is 0, so mug was never added and the database read is skipped ·
// 5 look up "lamp" (bits 6, 9, 12): all three are 1, set by kettle and toaster, so the filter says "maybe" and the
// database read finds nothing: a false positive.
// Working (computed below): after 2 items, 6 of 16 bits are set, so a key never added finds three set bits with
// chance (6 ÷ 16)^3 ≈ 5 %; the formula (1 − e^(−kn/m))^k gives 3.1 % for k = 3, n = 2, m = 16. Verdicts are computed
// from the bits, not typed.
// Layout: label column 160, 16 cells of 32 from x = 170, a verdict column from x = 700; rows 58 apart.
// Colours (PATTERN_TONE): bits 0 neutral, bits 1 green (the pattern), the bits a lookup checks orange (a request),
// the false positive red (the one wrong answer).

const M = 16;
const CELL = 32;
const CELL_H = 34;
const X0 = 170;
const Y0 = 44;
const ROW = 58;
const NOTE_X = X0 + M * CELL + 18;
const NOTE_W = 200;

type Row =
  | { kind: "empty"; title: string }
  | { kind: "add"; key: string; bits: number[] }
  | { kind: "look"; key: string; bits: number[] };

const ROWS: Row[] = [
  { kind: "empty", title: "empty filter" },
  { kind: "add", key: "kettle", bits: [1, 4, 6] },
  { kind: "add", key: "toaster", bits: [9, 12, 14] },
  { kind: "look", key: "mug", bits: [1, 3, 6] },
  { kind: "look", key: "lamp", bits: [6, 9, 12] },
];

const shapes: LayoutShape[] = [];
for (let i = 0; i < M; i++) {
  shapes.push({
    id: `ix${i}`,
    type: "text",
    x: X0 + i * CELL,
    y: Y0 - 24,
    w: CELL,
    h: 18,
    label: String(i),
    tone: PATTERN_TONE.infra,
  });
}
shapes.push({
  id: "ix-t",
  type: "text",
  x: 10,
  y: Y0 - 24,
  w: 150,
  h: 18,
  label: "bit index",
  tone: PATTERN_TONE.infra,
});

const set = new Set<number>();
ROWS.forEach((row, ri) => {
  const step = ri + 1;
  const y = Y0 + ri * ROW;
  const added = row.kind === "add" ? row.bits : [];
  const checked = row.kind === "look" ? row.bits : [];
  added.forEach((b) => set.add(b));
  const zeros = checked.filter((b) => !set.has(b));

  shapes.push({
    id: `r${step}-t`,
    type: "text",
    x: 10,
    y: y - 1,
    w: 150,
    h: 36,
    label:
      row.kind === "empty"
        ? `${row.title}\nm = ${M}, k = 3`
        : `${row.kind === "look" ? "look up" : "add"} ${row.key}\nhashes ${row.bits.join(", ")}`,
    tone: row.kind === "look" ? PATTERN_TONE.traffic : PATTERN_TONE.infra,
    step,
  });

  for (let i = 0; i < M; i++) {
    const on = set.has(i);
    const isNew = added.includes(i);
    const isChecked = checked.includes(i);
    const fpBit = row.kind === "look" && zeros.length === 0 && isChecked;
    shapes.push({
      id: `r${step}-b${i}`,
      type: "cell",
      x: X0 + i * CELL,
      y,
      w: CELL,
      h: CELL_H,
      label: on ? "1" : "0",
      tone: fpBit
        ? PATTERN_TONE.fail
        : isChecked
          ? PATTERN_TONE.traffic
          : on
            ? PATTERN_TONE.pattern
            : PATTERN_TONE.infra,
      fill: isNew || isChecked ? "pastel" : "soft",
      highlight: isChecked && !on ? true : undefined,
      step,
      quiet: true,
    });
  }

  let note: string;
  let tone: (typeof PATTERN_TONE)[keyof typeof PATTERN_TONE] = PATTERN_TONE.infra;
  if (row.kind === "empty") note = "every bit 0";
  else if (row.kind === "add") note = `${set.size} of ${M} bits set`;
  else if (zeros.length > 0) {
    note = `bit ${zeros.join(", ")} is 0: “no”\nskip the database`;
    tone = PATTERN_TONE.pattern;
  } else {
    note = `all 1, never added: “maybe”\nthe database finds nothing`;
    tone = PATTERN_TONE.fail;
  }
  shapes.push({ id: `r${step}-n`, type: "text", x: NOTE_X, y: y - 1, w: NOTE_W, h: 36, label: note, tone, step });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A 16-bit Bloom filter with three hashes",
  width: NOTE_X + NOTE_W + 10,
  height: Y0 + ROWS.length * ROW,
  shapes,
  steps: [
    { title: "An empty filter: 16 bits, 3 hashes" },
    { title: "Add kettle: three bits set" },
    { title: "Add toaster: three more bits" },
    { title: "Look up mug: a 0 bit means no" },
    { title: "Look up lamp: a false positive" },
  ],
};

export default spec;
