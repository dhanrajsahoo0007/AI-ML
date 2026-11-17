import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ANSWER_PHASES, ROUND_MINUTES } from "@/components/diagrams/presets/llm-roadmap";

// The 45-minute GenAI design answer as a timeline (genai-interview-roadmap, Interview framework), applied to the
// page's running prompt, the help-centre assistant. Phases, order and minutes come from ANSWER_PHASES in
// presets/llm-roadmap.ts, the same split the page lists; it is ILLUSTRATIVE, and the figure says so.
// Working:
//   start of each phase = running sum: 0, 5, 10, 30, 40; end = 45 = ROUND_MINUTES (5 + 5 + 20 + 10 + 5).
//   deep dive share = 20 ÷ 45 = 0.444, printed as 44 %.
//
// Layout (880 × 344): a time strip from x 40 to 850 at 18 px a minute (45 × 18 = 810), one cell per phase with 2 px
// gaps, its length its minutes; ticks and minute labels (0, 5, 10, 30, 40, 45) at every boundary under it. Below, one row per phase on a 32
// pitch: a swatch with the phase's minutes, then what to cover. A rule and one note close the figure.
// Colour: orange for the requirements (Clarify), violet for the design (Baseline, Deep dive), lime for the checks
// (Evaluate and operate), neutral for the wrap-up; three tones plus neutral. Deep dive is the one highlight: the
// longest phase and the one the interviewer steers.

const X0 = 40;
const PX_PER_MIN = 18;
const STRIP_Y = 34;
const STRIP_H = 52;
const TICK_Y = STRIP_Y + STRIP_H + 2;
const ROWS_Y = 134;
const PITCH = 32;
const SWATCH_W = 104;
const TEXT_H = 18;

const TONE: Record<(typeof ANSWER_PHASES)[number]["id"], LayoutTone> = {
  clarify: "orange",
  baseline: "violet",
  deep: "violet",
  evaluate: "lime",
  wrap: "neutral",
};

// Text shapes are centred in their box, so the box is sized to the text: a per-character estimate of the 12.5 px
// label face, scaled to widths measured on a spec-shot render (llm/roadmap-study-path uses the same estimate).
const textW = (s: string) =>
  1.08 *
  [...s].reduce(
    (a, ch) =>
      a +
      (/[ilj'.,:·!|]/.test(ch)
        ? 3
        : /[frt]/.test(ch)
          ? 4.2
          : ch === " "
            ? 3.4
            : /[mw]/.test(ch)
              ? 9.6
              : /[MW]/.test(ch)
                ? 10
                : /[A-Z]/.test(ch)
                  ? 8
                  : /[0-9]/.test(ch)
                    ? 7
                    : 6.6),
    0
  );
const text = (id: string, x: number, y: number, label: string, align: "left" | "centre" = "left"): LayoutShape => {
  const w = Math.ceil(textW(label));
  return { id, type: "text", x: align === "left" ? x : x - w / 2, y, w, h: TEXT_H, label, tone: "neutral" };
};

const starts = ANSWER_PHASES.map((_, i) => ANSWER_PHASES.slice(0, i).reduce((sum, p) => sum + p.minutes, 0));
const xAt = (min: number) => X0 + min * PX_PER_MIN;
const deep = ANSWER_PHASES.find((p) => p.id === "deep")!;
const deepShare = Math.round((deep.minutes / ROUND_MINUTES) * 100);

const strip: LayoutShape[] = ANSWER_PHASES.map((p, i) => ({
  id: `phase-${p.id}`,
  type: "cell",
  x: xAt(starts[i]) + 2,
  y: STRIP_Y,
  w: p.minutes * PX_PER_MIN - 4,
  h: STRIP_H,
  label: p.label,
  sub: `${p.minutes} min`,
  tone: TONE[p.id],
  fill: "pastel",
  highlight: p.id === "deep" || undefined,
}));

const bounds = [...starts, ROUND_MINUTES];
const ticks: LayoutShape[] = bounds.flatMap((m) => [
  {
    id: `tick-${m}`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [xAt(m), TICK_Y],
      [xAt(m), TICK_Y + 8],
    ],
  },
  text(`tick-label-${m}`, xAt(m), TICK_Y + 10, `${m}`, "centre"),
]);

const rows: LayoutShape[] = ANSWER_PHASES.flatMap((p, i) => {
  const y = ROWS_Y + i * PITCH;
  return [
    {
      id: `row-${p.id}-time`,
      type: "cell",
      x: X0,
      y,
      w: SWATCH_W,
      h: 24,
      label: `${starts[i]}–${starts[i] + p.minutes} min`,
      tone: TONE[p.id],
      fill: "soft",
    },
    text(`row-${p.id}-covers`, X0 + SWATCH_W + 14, y + 3, `${p.label}: ${p.covers}`),
  ];
});

const RULE_Y = ROWS_Y + ANSWER_PHASES.length * PITCH + 6;

const spec: LayoutSpec = {
  kind: "layout",
  title: `One ${ROUND_MINUTES}-minute GenAI design answer, phase by phase (illustrative)`,
  width: 880,
  height: RULE_Y + 44,
  shapes: [
    text("head", X0, 6, `Minutes into an illustrative ${ROUND_MINUTES}-minute round: the help-centre assistant`),
    ...strip,
    ...ticks,
    ...rows,
    {
      id: "rule",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [X0, RULE_Y],
        [xAt(ROUND_MINUTES), RULE_Y],
      ],
    },
    text(
      "note",
      X0,
      RULE_Y + 12,
      `Illustrative minutes. The deep dive is ${deep.minutes} of ${ROUND_MINUTES} (${deepShare} %): go deepest where the interviewer leans in.`
    ),
  ],
};

export default spec;
