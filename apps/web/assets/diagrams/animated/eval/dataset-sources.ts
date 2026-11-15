import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import { SOURCES } from "@/components/diagrams/presets/production-datasets";

// Where Brightpost's 200-ticket golden set comes from (building-eval-datasets, "Sourcing cases"). Four steps:
//   1 production logs: 120 tickets sampled from 30 days of real conversations, names and card numbers removed
//   2 expert-written: 50 cases that support leads write for rare and risky situations the logs hardly contain
//   3 synthetic: 30 cases a model writes from the policy text to fill thin cells; a person checks every one
//   4 the golden set: 120 + 50 + 30 = 200, shown as a bar with one pixel scale (3.4 px per ticket)
// The split is chosen to teach (illustrative); presets/production-datasets.ts checks that it sums to 200.
//
// Grid (880 wide): source boxes x 20, w 260, h 66, y 24 / 114 / 204; arrows to the golden-set box x 580, y 84, w 280,
// h 126; the stacked bar at y 304, x 20, h 34. Colours (PROD_TONE): logs blue (data), experts neutral (people),
// synthetic green (a model wrote them), golden set lime (it is the check). Three tones plus neutral.

const BOX = { x: 20, w: 260, h: 66 } as const;
const rowY = (i: number) => 24 + i * 90;
const PX = 3.4;
const BAR = { x: 20, y: 304, h: 34 } as const;

const copy = {
  logs: "real wording, real mix",
  experts: "rare and risky cases",
  synthetic: "fills thin cells, each checked",
} as const;
const tone = { logs: PROD_TONE.data, experts: PROD_TONE.infra, synthetic: PROD_TONE.model } as const;

const shapes: LayoutShape[] = [
  {
    id: "golden",
    type: "box",
    x: 580,
    y: 84,
    w: 280,
    h: 126,
    label: "Golden set",
    sub: `${DATASETS.goldenSet} tickets when full`,
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 1,
  },
];

let x = BAR.x;
SOURCES.forEach((s, i) => {
  const step = i + 1;
  const w = Math.round(s.count * PX * 10) / 10;
  shapes.push(
    {
      id: `src-${s.id}`,
      type: "box",
      x: BOX.x,
      y: rowY(i),
      w: BOX.w,
      h: BOX.h,
      label: s.label,
      sub: copy[s.id],
      tone: tone[s.id],
      fill: "pastel",
      step,
    },
    {
      id: `arrow-${s.id}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `src-${s.id}`,
      to: "golden",
      label: `${s.count}`,
      tone: PROD_TONE.infra,
      step,
    },
    {
      id: `bar-${s.id}`,
      type: "cell",
      x,
      y: BAR.y,
      w,
      h: BAR.h,
      label: `${s.count} ${s.id === "synthetic" ? "synthetic" : s.id === "logs" ? "from logs" : "expert"}`,
      tone: tone[s.id],
      fill: "pastel",
      step: 4,
      quiet: true,
    }
  );
  x += w;
});

shapes.push(
  {
    id: "bar-total",
    type: "text",
    x: x + 12,
    y: BAR.y + 7,
    w: 150,
    h: 20,
    label: `= ${DATASETS.goldenSet} tickets`,
    tone: PROD_TONE.check,
    step: 4,
  },
  {
    id: "bar-note",
    type: "text",
    x: BAR.x,
    y: BAR.y + 44,
    w: 560,
    h: 20,
    label: "One block per source, drawn to scale. Illustrative split.",
    tone: PROD_TONE.infra,
    step: 4,
    quiet: true,
  }
);
shapes.push({
  id: "golden-full",
  type: "text",
  x: 580,
  y: 222,
  w: 280,
  h: 20,
  label: "120 + 50 + 30 = 200",
  tone: PROD_TONE.check,
  step: 4,
  highlight: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three sources fill the golden set",
  width: 880,
  height: 380,
  steps: [
    { title: "Production logs: the real mix" },
    { title: "Expert-written: the cases logs rarely hold" },
    { title: "Synthetic: fill what is still thin" },
    { title: "Together: 200 tickets" },
  ],
  shapes,
};

export default spec;
