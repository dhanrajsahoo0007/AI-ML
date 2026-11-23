import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Pins or counts, by zoom level (zillow, Step 4 and Deep dive 1).
// Three steps, one panel each: 1 zoom 9: about 5,800 matches, so counts per cell · 2 zoom 11: 1,800 matches, still
// counts · 3 zoom 14: about 110 matches, under the 500 limit, so pins.
// Working (round numbers chosen to size the system): the zoom-13 viewport is 150 km² at 20 listings a km² = 3,000,
// and the filters keep 15 %: 450. Each zoom level out doubles both sides, so the area grows 4 × a level while the
// average density falls: zoom 14 = 150 ÷ 4 = 37.5 km² × 20 = 750 × 15 % ≈ 110; zoom 11 = 150 × 16 = 2,400 km² at 5 a
// km² = 12,000 × 15 % = 1,800; zoom 9 = 2,400 × 16 = 38,400 km² at 1 a km² = 38,400 × 15 % ≈ 5,800. The rule: up to 500
// matches return pins; above that, counts per cell at zoom + 2 (a 256 px tile split 4 × 4 into 64 px cells), about
// (1,200 ÷ 64) × (800 ÷ 64) ≈ 19 × 13 ≈ 250 cells. Each panel draws 4 × 3 of them; the drawn counts add up to the
// panel's total (zoom 9: 1,570 + 3,200 + 1,030 = 5,800; zoom 11: 560 + 870 + 370 = 1,800).
// Layout: three panels of 220 × 150 at x 30, 290, 550 (gap 40), titles above, results below. Colours (PATTERN_TONE):
// cells blue (data) shaded by count (weight = count ÷ panel maximum), pins blue circles, the frame of the pin panel
// neutral.

const PX = [30, 290, 550];
const GY = 70;
const CW = 55;
const CH = 50;
const shapes: LayoutShape[] = [];

const panels = [
  {
    title: "Zoom 9: 5,800 matches",
    result: "Counts per cell",
    counts: [
      [120, 340, 900, 210],
      [260, 1100, 1500, 340],
      [80, 410, 480, 60],
    ],
  },
  {
    title: "Zoom 11: 1,800 matches",
    result: "Still counts: over 500",
    counts: [
      [40, 120, 310, 90],
      [60, 280, 420, 110],
      [20, 90, 200, 60],
    ],
  },
];

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

panels.forEach((p, i) => {
  const step = i + 1;
  const max = Math.max(...p.counts.flat());
  shapes.push({
    id: `title-${i}`,
    type: "text",
    x: PX[i],
    y: 36,
    w: 4 * CW,
    h: 20,
    label: p.title,
    tone: PATTERN_TONE.infra,
    step,
  });
  p.counts.forEach((row, r) =>
    row.forEach((n, c) => {
      shapes.push({
        id: `c${i}-${r}-${c}`,
        type: "cell",
        x: PX[i] + c * CW,
        y: GY + r * CH,
        w: CW,
        h: CH,
        label: fmt(n),
        tone: PATTERN_TONE.data,
        weight: Math.round((n / max) * 100) / 100,
        step,
        quiet: !(r === 1 && c === 2),
        highlight: r === 1 && c === 2,
      });
    })
  );
  shapes.push({
    id: `result-${i}`,
    type: "text",
    x: PX[i],
    y: GY + 3 * CH + 14,
    w: 4 * CW,
    h: 20,
    label: p.result,
    tone: PATTERN_TONE.data,
    step,
  });
});

// Zoom 14: a frame and pins (a sample of the 110).
const FX = PX[2];
shapes.push({
  id: "title-2",
  type: "text",
  x: FX,
  y: 36,
  w: 4 * CW,
  h: 20,
  label: "Zoom 14: 110 matches",
  tone: PATTERN_TONE.infra,
  step: 3,
});
shapes.push({
  id: "frame",
  type: "box",
  x: FX,
  y: GY,
  w: 4 * CW,
  h: 3 * CH,
  tone: PATTERN_TONE.infra,
  step: 3,
});
const pins: [number, number][] = [
  [30, 30],
  [62, 44],
  [95, 26],
  [120, 60],
  [150, 38],
  [182, 52],
  [40, 82],
  [78, 96],
  [110, 104],
  [140, 88],
  [172, 110],
  [200, 84],
  [26, 126],
  [60, 132],
  [98, 128],
  [132, 124],
  [190, 132],
];
pins.forEach(([dx, dy], k) =>
  shapes.push({
    id: `pin-${k}`,
    type: "circle",
    x: FX + dx,
    y: GY + dy,
    w: 12,
    tone: PATTERN_TONE.data,
    fill: "pastel",
    step: 3,
    quiet: k !== 4,
  })
);
shapes.push({
  id: "result-2",
  type: "text",
  x: FX,
  y: GY + 3 * CH + 14,
  w: 4 * CW,
  h: 20,
  label: "Pins: 500 or fewer",
  tone: PATTERN_TONE.data,
  step: 3,
});
shapes.push({
  id: "rule",
  type: "text",
  x: PX[0],
  y: GY + 3 * CH + 52,
  w: PX[2] + 4 * CW - PX[0],
  h: 20,
  label: "Over 500 matches: counts per cell at zoom + 2 (about 250 cells); otherwise one pin per listing",
  tone: PATTERN_TONE.infra,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Pins or counts, by zoom level",
  width: PX[2] + 4 * CW + 30,
  height: GY + 3 * CH + 90,
  shapes,
  steps: [{ title: "Zoom 9: counts" }, { title: "Zoom 11: still counts" }, { title: "Zoom 14: pins" }],
};

export default spec;
