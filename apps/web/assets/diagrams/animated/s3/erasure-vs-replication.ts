import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Three copies against erasure coding, over three zones (s3, Step 4 and Deep dive 1).
// Three steps, one row each: 1 three full copies, one per zone: 3.0 × raw, any 2 copies may be lost · 2 ten data
// shards and four parity shards (10 + 4): 14 ÷ 10 = 1.4 × raw, any 4 of 14 may be lost; but 14 shards over 3 zones
// put at least ⌈14 ÷ 3⌉ = 5 in one zone, so losing that zone leaves 9 < 10 and the object is unreadable (red) ·
// 3 ten data shards and five parity shards (10 + 5), five per zone: 15 ÷ 10 = 1.5 × raw; any 5 may be lost, and a
// whole zone holds exactly 5, so a zone loss leaves 10 = k and every object still reads.
// Working (round numbers from the page): 1 EB stored; drives 20 TB filled to 75 % = 15 TB used.
// 3.0 × → 3 EB ÷ 15 TB = 200,000 drives · 1.4 × → 1.4 EB ÷ 15 TB ≈ 93,000 drives · 1.5 × → 1.5 EB ÷ 15 TB =
// 100,000 drives.
// Layout (920 × 370): three zone columns drawn as dotted groups (x 205, 390, 575; w 180); a label box on the left
// of each row (x 20, w 170); the shards as cells (w 30, gap 3) inside each zone; the verdict as text on the right
// (x 770, w 140). Rows centred at y 105, 205, 305.
// Colours (PATTERN_TONE): copies and data shards blue (data), parity shards green (the pattern's own part), the
// label boxes violet (store), red only for the zone loss that breaks 10 + 4.

const ZONES = [205, 390, 575];
const ZW = 180;
const CW = 30;
const GAP = 3;
const CH = 40;
const ROWS = [105, 205, 305];

const shapes: LayoutShape[] = [];

function rowLabel(step: number, label: string, sub: string) {
  shapes.push({
    id: `label-${step}`,
    type: "box",
    x: 20,
    y: ROWS[step - 1] - 28,
    w: 170,
    h: 56,
    label,
    sub,
    tone: PATTERN_TONE.store,
    fill: "pastel",
    step,
  });
}

function verdict(step: number, label: string, tone: string) {
  shapes.push({
    id: `verdict-${step}`,
    type: "text",
    x: 770,
    y: ROWS[step - 1] - 28,
    w: 140,
    h: 56,
    label,
    tone: tone as LayoutShape["tone"],
    step,
  });
}

/** Cells for one zone in one row: names like "d1" (data) or "p1" (parity). */
function cells(step: number, zone: number, names: string[]) {
  names.forEach((name, i) => {
    shapes.push({
      id: `r${step}-z${zone}-${name}`,
      type: "cell",
      x: ZONES[zone] + 9 + i * (CW + GAP),
      y: ROWS[step - 1] - CH / 2,
      w: CW,
      h: CH,
      label: name,
      tone: name.startsWith("p") ? PATTERN_TONE.pattern : PATTERN_TONE.data,
      fill: "pastel",
      step,
      quiet: i > 0 || zone > 0,
    });
  });
}

// Row 1: three full copies.
rowLabel(1, "3 copies", "3.0 ×: 200,000 drives");
ZONES.forEach((zx, z) => {
  shapes.push({
    id: `copy-${z}`,
    type: "cell",
    x: zx + 9,
    y: ROWS[0] - CH / 2,
    w: 162,
    h: CH,
    label: `full copy ${z + 1}`,
    tone: PATTERN_TONE.data,
    fill: "pastel",
    step: 1,
    quiet: z > 0,
  });
});
verdict(1, "any 2 lost: OK\na zone lost: OK", PATTERN_TONE.infra);

// Row 2: 10 + 4, spread 5 / 5 / 4.
rowLabel(2, "10 + 4 shards", "1.4 ×: 93,000 drives");
cells(2, 0, ["d1", "d2", "d3", "d4", "d5"]);
cells(2, 1, ["d6", "d7", "d8", "d9", "d10"]);
cells(2, 2, ["p1", "p2", "p3", "p4"]);
verdict(2, "any 4 lost: OK\nzone A lost:\n9 left < 10", PATTERN_TONE.fail);

// Row 3: 10 + 5, five per zone.
rowLabel(3, "10 + 5 shards", "1.5 ×: 100,000 drives");
cells(3, 0, ["d1", "d2", "d3", "d4", "p1"]);
cells(3, 1, ["d5", "d6", "d7", "d8", "p2"]);
cells(3, 2, ["d9", "d10", "p3", "p4", "p5"]);
verdict(3, "any 5 lost: OK\na zone lost:\n10 left = 10", PATTERN_TONE.pattern);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three copies against erasure coding over three zones",
  width: 920,
  height: 370,
  groups: ZONES.map((x, z) => ({
    id: `zone-${z}`,
    title: `Zone ${"ABC"[z]}`,
    tone: PATTERN_TONE.infra,
    x,
    y: 40,
    w: ZW,
    h: 310,
  })),
  shapes,
  steps: [
    { title: "Three full copies: 3.0 ×" },
    { title: "10 + 4: cheaper, but not zone-safe" },
    { title: "10 + 5, five per zone: 1.5 ×" },
  ],
};

export default spec;
