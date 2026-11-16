import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { BIAS } from "@/components/diagrams/presets/production-judge";

// Three judge biases, each with the number from the MT-Bench paper (Zheng et al., 2023, arXiv 2306.05685, checked
// 2026-11-15): position (Table 2, share of answers where the judge preferred the first position: GPT-4 30.0 %,
// GPT-3.5 50.0 %, Claude-v1 75.0 %), verbosity (Table 3, failure rate under the "repetitive list" attack on 23
// answers: 8.7 %, 91.3 %, 91.3 %) and self-preference (§3.3, win rate for the judge's own answers: about +10 points
// for GPT-4, about +25 for Claude-v1, none for GPT-3.5; the authors say the data cannot settle it). Bar length is
// 3.2 px per percentage point. A fix sits under each panel.
//
// Three steps, one bias each, stacked top to bottom: 1 position · 2 verbosity · 3 self-preference.
//
// Layout: panels 140 high from y 10; label box x 20 (w 230, h 84); bar rows at x 270 (name, 70 wide) and bars from
// x 346; the fix line under the bars at x 270.
//
// Colour (production legend): the judge's check box lime, the biased share red (where the judge breaks), text neutral.

const PH = 142;
/** Left-aligned text: a text shape centres its label in its box, so size the box to the label (about 5.2 px a character at 12.5 px). */
const tw = (label: string) => Math.ceil(label.length * 5.2) + 2;
const BAR_X = 346;
const K = 3.2;

interface Row {
  model: string;
  value: number;
}

function panel(
  p: string,
  i: number,
  title: string,
  sub: string,
  unit: string,
  rows: readonly Row[],
  fix: string[],
  fmt: (v: number) => string
): LayoutShape[] {
  const y = 10 + i * PH;
  const step = i + 1;
  const out: LayoutShape[] = [
    {
      id: `${p}-title`,
      type: "box",
      x: 20,
      y: y + 6,
      w: 230,
      h: 84,
      label: title,
      sub,
      tone: PROD_TONE.check,
      fill: "pastel",
      step,
    },
  ];
  rows.forEach((r, j) => {
    const ry = y + j * 24;
    out.push({
      id: `${p}-name-${j}`,
      type: "text",
      x: 270,
      y: ry + 2,
      w: 70,
      h: 18,
      label: r.model,
      tone: PROD_TONE.infra,
      step,
    });
    const w = Math.max(r.value * K, 3);
    out.push({
      id: `${p}-bar-${j}`,
      type: "cell",
      x: BAR_X,
      y: ry,
      w,
      h: 20,
      tone: PROD_TONE.failure,
      fill: "pastel",
      step,
      quiet: true,
    });
    out.push({
      id: `${p}-val-${j}`,
      type: "text",
      x: BAR_X + w + 6,
      y: ry + 2,
      w: 64,
      h: 18,
      label: fmt(r.value),
      tone: PROD_TONE.infra,
      step,
    });
  });
  out.push({
    id: `${p}-unit`,
    type: "text",
    x: 270,
    y: y + 72,
    w: tw(unit),
    h: 18,
    label: unit,
    tone: PROD_TONE.infra,
    step,
  });
  fix.forEach((line, k) =>
    out.push({
      id: `${p}-fix-${k}`,
      type: "text",
      x: 270,
      y: y + 92 + k * 18,
      w: tw(line),
      h: 18,
      label: line,
      tone: PROD_TONE.infra,
      step,
    })
  );
  return out;
}

const pct = (v: number) => `${v.toFixed(1)} %`;
const pts = (v: number) => (v === 0 ? "none" : `about +${v}`);

const shapes: LayoutShape[] = [
  ...panel(
    "pos",
    0,
    "Position bias",
    "favours the answer shown first",
    "Share of answers where the judge preferred the first position (Table 2)",
    BIAS.position,
    ["Fix: judge every pair twice with the order swapped,", "and count a win only when both orders agree."],
    pct
  ),
  ...panel(
    "len",
    1,
    "Verbosity bias",
    "rewards padding, not content",
    "Failure rate on 23 answers padded with a repeated list (Table 3)",
    BIAS.verbosity,
    ["Fix: score length-controlled, give the rubric a line", "that padding earns nothing, test with a padded copy."],
    pct
  ),
  ...panel(
    "self",
    2,
    "Self-preference",
    "favours its own writing",
    "Win-rate points above average for the judge's own answers (§3.3)",
    BIAS.self,
    [
      "Fix: judge with a different model family from the writer.",
      "The authors say their data cannot settle it; later work links it to self-recognition.",
    ],
    pts
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three ways a model judge goes wrong, from the MT-Bench study",
  width: 860,
  height: 10 + 3 * PH + 8,
  steps: [{ title: "Position bias" }, { title: "Verbosity bias" }, { title: "Self-preference" }],
  shapes: shapes.map((sh) => (sh.type === "text" ? { ...sh, quiet: true } : sh)),
};

export default spec;
