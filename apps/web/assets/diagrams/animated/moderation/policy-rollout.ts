import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { POLICY_CHANGE as P, UNIT } from "@/components/diagrams/presets/gcase-moderation";

// Shipping a policy change in a day: a new coded slur (content-moderation-system, design sheet deep dive 3, review 6
// and R2-5; preset POLICY_CHANGE and UNIT in presets/gcase-moderation.ts). Every duration and count is ILLUSTRATIVE.
//   Step 1, the timeline, serial: write the rule, the term list and 5 boundary examples 2 h → find 400 new gold items
//     1 h → 4 experts label and adjudicate 400 × 1.2 × 45 s ÷ 4 + 15 min = 1.75 h (translations into 13 language groups
//     in parallel, 2 h, so 2 h) → old and new prompt on the hold-out and the new items, 2 × 1,400 = 2,800 calls ≈ 1 min,
//     ≈ 0.26 USD → shadow 6 h on ≈ 202,800 hate-band and rule-match calls (≈ 19 USD) → experts read 300 sampled
//     disagreements 1.25 h → canary in one market 4 h → all markets 1 h: P.totalHours ≈ 17.3 h. From hour 0 a term
//     rule sends every match to the model, whatever its score (≈ 20,000 a day, ≈ 1.88 USD): a new term scores near zero.
//   Step 2, the gates: new-rule recall 186 of 200 = 0.93 (Wilson 0.886–0.958) ≥ 0.85; near-miss fine 190 of 200 = 0.95
//     (0.910–0.973) ≥ 0.90; plus the paired hold-out gate; 282 of 300 disagreements explained (0.907–0.962) ≥ 0.85;
//     canary boosted QA ≈ 137 labels, precision 0.90 (0.838–0.940): a gross-shift detector only.
//   Step 3, the backfill: 30 days of posts, ≈ 400,000 matches (≈ 37.6 USD), ≈ 240,000 removals spread over 7 days,
//     highest reach first, no strikes; ≈ 20,400 appeals (≈ 48.6 h a day for 7 days); ≈ 73,440 EU statements.
// Layout (880 wide): an hour axis 0–18 h at x 300–840 (30 px an hour), one row a stage, labels right-aligned at x 290;
// the term-rule line from hour 0; the total line at 17.3 h; gate cells and the backfill box below.
// Colours: authoring and labelling orange (people), evaluation and shadow lime (checks), canary and rollout teal (it
// acts), the term rule green (it sends matches to the model); passing gates lime; the backfill violet (stored posts).

const AX0 = 300;
const AX1 = 840;
const HOURS = 18;
const px = (h: number) => Math.round(AX0 + (h / HOURS) * (AX1 - AX0));
const r2 = (v: number) => v.toFixed(2);
const r3 = (v: number) => v.toFixed(3);
const n0 = (v: number) => Math.round(v).toLocaleString("en-GB");
const hrs = (h: number) => (h < 0.1 ? `${Math.round(h * 60)} min` : `${Number(h.toFixed(2))} h`);

const TONE: Record<string, LayoutTone> = {
  write: GENAI_TONE.user,
  find: GENAI_TONE.user,
  label: GENAI_TONE.user,
  eval: GENAI_TONE.check,
  shadow: GENAI_TONE.check,
  review: GENAI_TONE.user,
  canary: GENAI_TONE.tool,
  rollout: GENAI_TONE.tool,
};
const SHORT: Record<string, string> = {
  write: "Write the rule, terms, 5 examples",
  find: "Find 400 new gold items",
  label: "Label, adjudicate; translate",
  eval: "Old vs new prompt: hold-out",
  shadow: "Shadow on live band traffic",
  review: "Experts read 300 disagreements",
  canary: "Canary: one market",
  rollout: "All markets; backfill starts",
};

const Y0 = 52;
const PITCH = 28;
const BAR_H = 20;
const rightText = (
  id: string,
  right: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => {
  const w = Math.ceil(label.length * 6.7) + 6;
  return { id, type: "text", x: right - w, y, w, h: 18, label, tone, step, quiet: true };
};
const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  quiet = true
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone,
  step,
  quiet,
});

let t = 0;
const rows: LayoutShape[] = P.steps.flatMap((s, i): LayoutShape[] => {
  const y = Y0 + i * PITCH;
  const x1 = px(t);
  const x2 = Math.max(x1 + 4, px(t + s.hours));
  t += s.hours;
  const inside = x2 - x1 >= 50;
  return [
    rightText(`l-${s.id}`, AX0 - 10, y + 1, SHORT[s.id], 1),
    {
      id: `b-${s.id}`,
      type: "cell",
      x: x1,
      y,
      w: x2 - x1,
      h: BAR_H,
      label: inside ? hrs(s.hours) : undefined,
      tone: TONE[s.id],
      fill: "pastel",
      step: 1,
      quiet: i > 0,
    },
    ...(inside ? [] : [text(`d-${s.id}`, x2 + 4, y + 1, hrs(s.hours).length * 7 + 6, hrs(s.hours), 1)]),
  ];
});
const AXIS_Y = Y0 + P.steps.length * PITCH + 2;
const ticks = [0, 3, 6, 9, 12, 15, 18];
const axis: LayoutShape[] = [
  {
    id: "axis",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [AX0, AXIS_Y],
      [AX1, AXIS_Y],
    ],
    step: 1,
    quiet: true,
  },
  ...ticks.map((h, i) => text(`tick-${i}`, px(h) - 20, AXIS_Y + 4, 40, `${h} h`, 1)),
  {
    id: "total",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [px(P.totalHours), Y0 - 22],
      [px(P.totalHours), AXIS_Y],
    ],
    dashed: true,
    step: 1,
    quiet: true,
  },
  text("total-l", px(P.totalHours) - 90, Y0 - 40, 120, `live everywhere ${P.totalHours.toFixed(1)} h`, 1),
  {
    id: "rule",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [AX0, Y0 - 22],
      [AX0, AXIS_Y],
    ],
    tone: GENAI_TONE.model,
    step: 1,
    quiet: true,
  },
  text(
    "rule-l",
    AX0 - 4,
    Y0 - 40,
    360,
    `hour 0: a term rule sends every match to the model (${n0(P.ruleMatchesPerDay)} a day)`,
    1,
    GENAI_TONE.model
  ),
];

// Step 2: the gates.
const G_Y = AXIS_Y + 58;
const G = P.gates;
const cellW = 208;
const gates: { id: string; label: string; sub: string }[] = [
  {
    id: "recall",
    label: `New-rule recall ${G.newRuleRecall.k}/${G.newRuleRecall.n}`,
    sub: `${r3(G.newRuleRecall.lo)}–${r3(G.newRuleRecall.hi)} ≥ ${G.newRuleRecall.floor.toFixed(2)}`,
  },
  {
    id: "fine",
    label: `Near-miss fine ${G.nearMissFine.k}/${G.nearMissFine.n}`,
    sub: `${r3(G.nearMissFine.lo)}–${r3(G.nearMissFine.hi)} ≥ ${G.nearMissFine.floor.toFixed(2)}`,
  },
  {
    id: "explained",
    label: `Explained ${G.disagreementsExplained.k}/${G.disagreementsExplained.n}`,
    sub: `of ${n0(P.disagreements)} shadow disagreements`,
  },
  {
    id: "canary",
    label: `Canary precision ${r2(P.canaryPrecision.p)}`,
    sub: `${r3(P.canaryPrecision.lo)}–${r3(P.canaryPrecision.hi)} on ${n0(P.canaryQa)} labels`,
  },
];
const gateShapes: LayoutShape[] = [
  text(
    "g-head",
    12,
    G_Y - 24,
    856,
    "The gates (Wilson 95% intervals; the paired hold-out gate runs too)",
    2,
    PROD_TONE.infra,
    true
  ),
  ...gates.map((g, i): LayoutShape => ({
    id: `g-${g.id}`,
    type: "box",
    x: 12 + i * (cellW + 8),
    y: G_Y,
    w: cellW,
    h: 48,
    label: g.label,
    sub: g.sub,
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 2,
    quiet: i > 0,
  })),
];

// Step 3: the backfill.
const B_Y = G_Y + 48 + 40;
const backfill: LayoutShape[] = [
  text("bf-head", 12, B_Y - 24, 856, "Then the backfill over the last 30 days of posts", 3, PROD_TONE.infra, true),
  {
    id: "bf",
    type: "box",
    x: 12,
    y: B_Y,
    w: 424,
    h: 54,
    label: `${n0(P.backfillMatches)} matches → ≈ ${n0(P.backfillActions)} removals`,
    sub: `≈ ${P.backfillCostUsd.toFixed(1)} USD; over ${P.backfillDays} days, highest reach first; no strikes`,
    tone: GENAI_TONE.store,
    fill: "pastel",
    step: 3,
  },
  {
    id: "bf-load",
    type: "box",
    x: 444,
    y: B_Y,
    w: 424,
    h: 54,
    label: `≈ ${n0(P.backfillAppeals)} appeals; ${n0(P.backfillEuStatements)} EU statements`,
    sub: `≈ ${P.backfillAppealHoursPerDay.toFixed(1)} appeal hours a day for ${P.backfillDays} days`,
    tone: "neutral",
    step: 3,
    quiet: true,
  },
];
const FOOT = B_Y + 54 + 14;

const spec: LayoutSpec = {
  kind: "layout",
  title: `A new coded slur, live everywhere in ≈ ${P.totalHours.toFixed(1)} hours: a term rule at hour 0, gates, a shadow, a canary and a backfill`,
  width: 880,
  height: FOOT + 26,
  steps: [
    { title: `The timeline: ≈ ${P.totalHours.toFixed(1)} hours, a term rule from hour 0` },
    { title: "The gates on the new items, the shadow and the canary" },
    { title: `The backfill: ${n0(P.backfillMatches)} older matches over ${P.backfillDays} days` },
  ],
  shapes: [
    ...axis,
    ...rows,
    ...gateShapes,
    ...backfill,
    text(
      "foot",
      12,
      FOOT,
      856,
      `Shadow ≈ ${n0(P.shadowCalls)} calls (≈ ${P.shadowCostUsd.toFixed(0)} USD) at ${UNIT.smallText.toFixed(6)} USD a call; every duration and count is illustrative.`,
      3
    ),
  ],
};

export default spec;
