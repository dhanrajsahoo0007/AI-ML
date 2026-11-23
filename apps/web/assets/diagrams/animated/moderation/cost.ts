import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { COST } from "@/components/diagrams/presets/gcase-moderation";

// A month of moderation to scale (content-moderation-system, design sheet §5 "All-in a month", §12, §16; preset COST in
// presets/gcase-moderation.ts). Model prices are list prices as of November 2026 (gcase-answer PRICES); every other line
// is ILLUSTRATIVE.
//   Step 1, the month: people COST.people ≈ 6.76M USD (1,492 FTE); engineering 40–80 × 15,000 = 0.60–1.20M (base 0.90M);
//     policy 15–25 × 10,000 = 0.15–0.25M (base 0.20M); legal and compliance 90,000; infrastructure 60,000; models
//     COST.model ≈ 50,530 (incl. 2 labeller GPUs); training-label vendors 30,000; classifiers 25,200 (14 GPUs);
//     fallback 14,400 (8 GPUs) → COST.total ≈ 8.13M (7.78–12.20M) ≈ 1.94 USD per 1,000 units; people ≈ 83%, models
//     ≈ 0.6%. At 10× the model prices the model line is COST.modelAtTenTimesPrice ≈ 505,000 (≈ 6%).
//   Step 2, the alternatives on one scale: the design ≈ 8.13M; the model on every unit with one family a call
//     COST.modelEverywhereSmall ≈ 1.80M (all small) or COST.modelEverywhereMid ≈ 17.2M (as designed) for the model line
//     alone; people on the band instead of the model COST.peopleOnBandPerMonth ≈ 33.9M.
// Layout (880 wide): horizontal bars from x 230, 0–7M USD over 560 px (step 1), ranges as a pale extension past the base;
// a second panel 0–35M over 560 px (step 2).
// Colours: people orange, engineering, policy and legal neutral, models and GPUs green, labels violet; the alternatives
// red (what the design avoids), the design lime.

const X = 12;
const BAR_X = 230;
const BAR_W = 560;
const M = (v: number) => (v >= 1e5 ? `${(v / 1e6).toFixed(2)}M` : Math.round(v).toLocaleString("en-GB"));
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const rightText = (id: string, right: number, y: number, label: string, step: number): LayoutShape => {
  const w = Math.ceil(label.length * 6.7) + 6;
  return { id, type: "text", x: right - w, y, w, h: 18, label, tone: PROD_TONE.infra, step, quiet: true };
};
const text = (id: string, x: number, y: number, w: number, label: string, step: number, quiet = true): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet,
});

type Line = { id: string; label: string; base: number; lo?: number; hi?: number; tone: LayoutTone };
const lines: Line[] = [
  { id: "people", label: "People (1,492 FTE)", base: COST.people, tone: GENAI_TONE.user },
  {
    id: "eng",
    label: "Engineering (40–80)",
    base: COST.engineering.base,
    lo: COST.engineering.lo,
    hi: COST.engineering.hi,
    tone: "neutral",
  },
  {
    id: "policy",
    label: "Policy staff (15–25)",
    base: COST.policy.base,
    lo: COST.policy.lo,
    hi: COST.policy.hi,
    tone: "neutral",
  },
  { id: "legal", label: "Legal and compliance", base: COST.legal, tone: "neutral" },
  { id: "infra", label: "Infrastructure", base: COST.infrastructure, tone: "neutral" },
  { id: "model", label: "Model calls + labeller", base: COST.model, tone: GENAI_TONE.model },
  { id: "labels", label: "Training-label vendors", base: COST.labels, tone: GENAI_TONE.store },
  { id: "clf", label: "Classifiers (14 GPUs)", base: COST.classifiers, tone: GENAI_TONE.model },
  { id: "fallback", label: "Fallback (8 GPUs)", base: COST.fallback, tone: GENAI_TONE.model },
];

function panel(prefix: string, y0: number, rows: Line[], max: number, ticks: number[], step: number) {
  const px = (v: number) => Math.round((v / max) * BAR_W);
  const PITCH = 26;
  const shapes: LayoutShape[] = [];
  rows.forEach((r, i) => {
    const y = y0 + i * PITCH;
    const w = Math.max(3, px(r.base));
    shapes.push(rightText(`${prefix}-${r.id}-l`, BAR_X - 10, y + 1, r.label, step), {
      id: `${prefix}-${r.id}`,
      type: "cell",
      x: BAR_X,
      y: y + 2,
      w,
      h: 16,
      tone: r.tone,
      fill: "pastel",
      step,
      quiet: i > 0,
    });
    let end = BAR_X + w;
    if (r.hi !== undefined) {
      const hw = Math.max(3, px(r.hi) - w);
      shapes.push({
        id: `${prefix}-${r.id}-hi`,
        type: "cell",
        x: end,
        y: y + 5,
        w: hw,
        h: 10,
        tone: r.tone,
        fill: "soft",
        step,
        quiet: true,
      });
      end += hw;
    }
    const v = r.lo !== undefined ? `${M(r.base)} (${M(r.lo)}–${M(r.hi!)})` : M(r.base);
    shapes.push(text(`${prefix}-${r.id}-v`, end + 6, y + 1, v.length * 7 + 6, v, step));
  });
  const axisY = y0 + rows.length * PITCH + 2;
  shapes.push(
    {
      id: `${prefix}-axis`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [BAR_X, axisY],
        [BAR_X + BAR_W, axisY],
      ],
      step,
      quiet: true,
    },
    ...ticks.map((t, i) =>
      text(`${prefix}-t${i}`, BAR_X + px(t) - 22, axisY + 4, 44, t === 0 ? "0" : `${t / 1e6}M`, step)
    )
  );
  return { shapes, end: axisY + 24 };
}

const P1 = panel("m", 34, lines, 7e6, [0, 1e6, 2e6, 3e6, 4e6, 5e6, 6e6, 7e6], 1);
const T1 = P1.end + 2;
const alternatives: Line[] = [
  {
    id: "design",
    label: "This design, all-in",
    base: COST.total,
    lo: COST.totalLo,
    hi: COST.totalHi,
    tone: PROD_TONE.check,
  },
  { id: "small", label: "Model everywhere, all small", base: COST.modelEverywhereSmall, tone: PROD_TONE.failure },
  { id: "mid", label: "Model everywhere, as designed", base: COST.modelEverywhereMid, tone: PROD_TONE.failure },
  { id: "people", label: "People on the band instead", base: COST.peopleOnBandPerMonth, tone: PROD_TONE.failure },
];
const H2 = T1 + 60;
const P2 = panel("alt", H2 + 26, alternatives, 35e6, [0, 5e6, 10e6, 15e6, 20e6, 25e6, 30e6, 35e6], 2);
const FOOT = P2.end + 4;

const spec: LayoutSpec = {
  kind: "layout",
  title: `A month of moderation: ≈ ${M(COST.total)} USD, people ${pct(COST.shares.people)}, model calls ${pct(COST.shares.model)}`,
  width: 880,
  height: FOOT + 26,
  steps: [
    { title: `A month to scale: ≈ ${M(COST.total)} USD, people ≈ ${M(COST.people)}` },
    { title: "What the cascade avoids: the model everywhere, or people on the band" },
  ],
  shapes: [
    text("h1", X, 6, 856, "USD a month, to scale (model prices as of November 2026; every other line illustrative)", 1),
    ...P1.shapes,
    text(
      "t1",
      X,
      T1,
      856,
      `In all ≈ ${M(COST.total)} (${M(COST.totalLo)}–${M(COST.totalHi)}) ≈ ${COST.perThousandUnits.toFixed(2)} USD per 1,000 units; at 10× the model prices the model line is ≈ ${M(COST.modelAtTenTimesPrice)}.`,
      1
    ),
    text("h2", X, H2, 856, "The alternatives on one scale (the model lines alone, or people in its place)", 2),
    ...P2.shapes,
    text("foot", X, FOOT, 856, "Every line but the model prices is illustrative.", 2),
  ],
};

export default spec;
