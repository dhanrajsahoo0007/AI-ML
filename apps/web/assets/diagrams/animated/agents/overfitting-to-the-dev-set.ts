import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { GATE, HELD_OUT, PICK, RUN, SPLITS } from "@/components/diagrams/presets/agents-optimize";

// Overfitting to the dev set (automated-prompt-optimization, Technical mechanics "Avoiding overfitting to small dev
// sets"). The same GEPA run as agents/optimization-loop, scored two ways for each candidate c0 (= v12) to c6: on the
// 200 training chats the reflection model learned from, and on the 100 validation chats it never read. The training
// score climbs every round (84 → 98 %); the validation score peaks at c3 (89 %) and falls to 84 % as the new rules get
// specific to training chats. The fixed set, read once, agrees with validation: c3 passes 189 of 200, c6 only 181,
// below v12's 184. Every number comes from RUN, PICK and HELD_OUT in presets/agents-optimize (illustrative, except the
// gate's 200 cases and v12's 184).
//
// Three steps: 1 the training score climbs every round · 2 the validation score peaks at c3, then falls (c3 ringed) ·
// 3 the held-out check: c3 passes, c6, the pick by training score, is blocked.
//
// Layout: plot x 90–570 (80 units per candidate), y 50 (100 %) to 250 (80 %), 10 units per point. Dashed guides at 100 %
// and 90 %; candidate names under the axis. Vertical dashed guides at c3 and c6 carry the two picks above the plot. Line
// names and end values to the right of c6 (x 584). The held-out panel at x 744–874.
//
// Colour (agents legend: a score is lime): both lines lime, training dashed and validation solid; the passing
// held-out cell lime, the blocked one red (the only failure); axes and text neutral. Two tones plus neutral.

const PLOT = { x: 90, top: 50, base: 250, step: 80 } as const;
const PANEL = { x: 744, w: 130 } as const;
const xAt = (i: number) => PLOT.x + i * PLOT.step;
const yAt = (pct: number) => Math.round((PLOT.base - (pct - 80) * 10) * 10) / 10;
const trainPct = (i: number) => (RUN[i].train / SPLITS.train) * 100;
const valPct = (i: number) => (RUN[i].val / SPLITS.val) * 100;
const last = RUN.length - 1;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  step = 1,
  quiet?: boolean,
  tone: LayoutTone = AGENT_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet });

/** Axis and guide text: drawn in step 1 without a NEW ring, so the ring goes to the line. */
const axis = (id: string, x: number, y: number, w: number, h: number, label: string) =>
  text(id, x, y, w, h, label, 1, true);

const line = (id: string, points: [number, number][], dashed = false, step = 1): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  dashed,
  tone: AGENT_TONE.infra,
  quiet: true,
  step,
});

const dot = (id: string, i: number, pct: number, step: number, highlight?: boolean): LayoutShape => ({
  id,
  type: "circle",
  x: xAt(i),
  y: yAt(pct),
  w: 10,
  tone: AGENT_TONE.check,
  fill: "pastel",
  step,
  highlight,
  quiet: !highlight,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Overfitting to the dev set: training keeps rising, validation turns",
  width: 880,
  height: 316,
  steps: [
    { title: `Training score climbs every round: ${trainPct(0)} → ${trainPct(last)} %` },
    { title: `Validation peaks at c${PICK.byVal} (${valPct(PICK.byVal)} %), then falls` },
    { title: `Held out: c${PICK.byVal} ${HELD_OUT.selected}, c${PICK.byTrain} ${HELD_OUT.byTrain} of ${GATE.cases}` },
  ],
  shapes: [
    axis("heading", PLOT.x, 4, 480, 20, "Score by candidate, one GEPA run (illustrative)"),
    line(
      "top",
      [
        [PLOT.x, PLOT.top],
        [xAt(last), PLOT.top],
      ],
      true
    ),
    line(
      "ninety",
      [
        [PLOT.x, yAt(90)],
        [xAt(last), yAt(90)],
      ],
      true
    ),
    line("x-axis", [
      [PLOT.x, PLOT.base],
      [xAt(last) + 10, PLOT.base],
    ]),
    line("y-axis", [
      [PLOT.x, PLOT.base],
      [PLOT.x, PLOT.top - 8],
    ]),
    axis("y-100", 26, PLOT.top - 9, 56, 18, "100 %"),
    axis("y-90", 26, yAt(90) - 9, 56, 18, "90 %"),
    axis("y-80", 26, PLOT.base - 9, 56, 18, "80 %"),
    ...RUN.map((c, i) => axis(`tick-${c.id}`, xAt(i) - 16, PLOT.base + 6, 32, 16, c.id)),
    axis("x-label", PLOT.x, PLOT.base + 28, 480, 20, "candidate, in the order the optimiser wrote it (c0 = v12)"),

    // Step 1: the score on the training chats the reflection model reads.
    {
      id: "train",
      type: "path",
      x: 0,
      y: 0,
      points: RUN.map((_, i) => [xAt(i), yAt(trainPct(i))] as [number, number]),
      dashed: true,
      tone: AGENT_TONE.check,
      weight: 0.9,
    },
    dot("train-end", last, trainPct(last), 1),
    text(
      "train-name",
      xAt(last) + 14,
      yAt(trainPct(last)) - 18,
      150,
      36,
      `Train, ${SPLITS.train} chats\n${trainPct(last)} %`
    ),

    // Step 2: the score on the validation chats it never reads.
    {
      id: "val",
      type: "path",
      x: 0,
      y: 0,
      points: RUN.map((_, i) => [xAt(i), yAt(valPct(i))] as [number, number]),
      tone: AGENT_TONE.check,
      weight: 0.9,
      step: 2,
    },
    dot("val-peak", PICK.byVal, valPct(PICK.byVal), 2, true),
    dot("val-end", last, valPct(last), 2),
    text(
      "val-name",
      xAt(last) + 14,
      yAt(valPct(last)) - 18,
      150,
      36,
      `Validation, ${SPLITS.val} chats\n${valPct(last)} %`,
      2,
      true
    ),
    line(
      "pick-val",
      [
        [xAt(PICK.byVal), PLOT.top - 6],
        [xAt(PICK.byVal), PLOT.base],
      ],
      true,
      2
    ),
    text("pick-val-label", xAt(PICK.byVal) - 90, 26, 180, 18, `picked by validation: c${PICK.byVal}`, 2, true),

    // Step 3: the pick by training score, and the one held-out check.
    line(
      "pick-train",
      [
        [xAt(PICK.byTrain), PLOT.top - 6],
        [xAt(PICK.byTrain), PLOT.base],
      ],
      true,
      3
    ),
    text("pick-train-label", xAt(PICK.byTrain) - 66, 26, 132, 18, `picked by train: c${PICK.byTrain}`, 3, true),
    text("panel-head", PANEL.x, 50, PANEL.w, 20, "Fixed set, read once", 3, true),
    {
      id: "held-val",
      type: "box",
      x: PANEL.x,
      y: 78,
      w: PANEL.w,
      h: 58,
      label: `c${PICK.byVal}: ${HELD_OUT.selected} of ${GATE.cases}`,
      sub: "passes the gate",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 3,
    },
    {
      id: "held-train",
      type: "box",
      x: PANEL.x,
      y: 148,
      w: PANEL.w,
      h: 58,
      label: `c${PICK.byTrain}: ${HELD_OUT.byTrain} of ${GATE.cases}`,
      sub: `below v12's ${GATE.live}`,
      tone: AGENT_TONE.failure,
      fill: "pastel",
      step: 3,
    },
    text("panel-floor", PANEL.x, 214, PANEL.w, 18, `floor ${GATE.floor} · v12 ${GATE.live}`, 3, true),
  ],
};

export default spec;
