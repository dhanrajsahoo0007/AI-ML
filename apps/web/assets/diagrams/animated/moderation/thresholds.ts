import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import {
  CASCADE,
  LOCAL_LAW,
  WALKTHROUGH,
  familyById,
  type FamilyId,
} from "@/components/diagrams/presets/gcase-moderation";

// Thresholds from the cost of each error (content-moderation-system, design sheet §13 and deep dive 1; preset
// CASCADE[].edges, LOCAL_LAW and WALKTHROUGH in presets/gcase-moderation.ts). Costs are HARM UNITS (a policy device,
// illustrative), not dollars.
//   Step 1, one global rule per family: τ = cfp ÷ (cfp + cfn): CSEA 50 / 20,000 → 0.0025; NCII 10 / 2,000 → 0.0050;
//     terrorism 20 / 2,000 → 0.0099; threats 5 / 400 → 0.0123; hate 8 / 6 → 0.571; graphic 3 / 4 → 0.429; spam 1 / 0.5
//     → 0.667. Severity 0–1 bands are capacity-set and held for a person (pLo 0.002, 0.01, 0.003, 0.005; the release
//     lines 0.140 and 0.170 for the two families with a model); severity 2–3 bands are where the model's verdict can
//     flip the decision and publish with limited distribution.
//   Step 2, hate on one probability axis: pLo, where a "yes" lifts the posterior to τ: (0.03 × 8 + 0.0001) ÷
//     (6 × 0.92 + 0.24) = 0.0417; pHi, where a "no" drops it to τ: (8 × 0.97 − 0.0001) ÷ (7.76 + 0.08 × 6) = 0.942.
//     The EU local-law withhold is a separate, market-scoped line: τ = 6 ÷ (6 + 12) = 0.333, band 0.0161–0.858.
//   Step 3, the German comment: raw P 0.02 (below pLo: allowed), folded P 0.30 (in the band), the model says "yes",
//     posterior 0.30 × 0.92 ÷ (0.30 × 0.92 + 0.70 × 0.03) = 0.929 ≥ 0.571: removed worldwide.
// Layout (880 wide): a 7-row table of cells (step 1); two linear probability axes 0–1, x 150–830 (step 2); markers and
// an arrow on the hate axis (step 3).
// Colours: the hate band lime (ranking: the model decides there), the EU band blue, τ lines red, the worked comment's
// markers orange (the user's content), the posterior green (after the model); held paths orange (a person decides),
// limited paths green (the model decides).

const X = 12;
const W = 856;
const sig = (v: number) => (v < 0.01 ? v.toPrecision(2) : v.toPrecision(3));
const raw = (v: number) => String(Math.round(v * 10000) / 10000);
const n0 = (v: number) => v.toLocaleString("en-GB");

const NAME: Record<FamilyId, string> = {
  csea: "CSEA",
  ncii: "NCII",
  terror: "Terrorism",
  safety: "Threats, self-harm",
  hate: "Hate, harassment",
  graphic: "Adult, graphic",
  spam: "Spam, scams",
};

// ── Step 1: the table ───────────────────────────────────────────────────────────────────────────────────────────
const COLS = [
  { key: "family", label: "Family (severity)", w: 170 },
  { key: "costs", label: "False alarm / miss", w: 150 },
  { key: "tau", label: "τ", w: 80 },
  { key: "band", label: "Band", w: 170 },
  { key: "path", label: "While it waits", w: 286 },
] as const;
const colX = (i: number) => X + COLS.slice(0, i).reduce((s, c) => s + c.w, 0);
const T_Y = 30;
const ROW = 26;

const header: LayoutShape[] = COLS.map((c, i) => ({
  id: `th-${c.key}`,
  type: "text",
  x: colX(i),
  y: T_Y,
  w: c.w,
  h: 20,
  label: c.label,
  tone: PROD_TONE.infra,
  step: 1,
}));

const tableRows: LayoutShape[] = CASCADE.per.flatMap((p, r): LayoutShape[] => {
  const f = familyById(p.id);
  const e = p.edges;
  const held = p.sev <= 1;
  const band = !held
    ? `${sig(e.pLo)} – ${sig(e.pHi)}`
    : e.pHi > e.pLo
      ? `${raw(e.pLo)} – ${sig(e.pHi)}`
      : `≥ ${raw(e.pLo)}`;
  const path = held
    ? p.model
      ? `held; ${p.model} model, then a person`
      : "held for a specialist"
    : `limited; the ${p.model} model decides`;
  const y = T_Y + 24 + r * ROW;
  const cells: [string, string, LayoutTone, boolean][] = [
    ["family", `${NAME[p.id]} (${p.sev})`, "neutral", false],
    ["costs", `${n0(f.cfp)} / ${n0(f.cfn)}`, "neutral", false],
    ["tau", sig(e.tau), PROD_TONE.failure, true],
    ["band", band, held ? "neutral" : GENAI_TONE.rank, !held],
    ["path", path, held ? GENAI_TONE.user : GENAI_TONE.model, true],
  ];
  return cells.map(([key, label, tone, pastel], i) => ({
    id: `td-${p.id}-${key}`,
    type: "cell",
    x: colX(i) + 2,
    y,
    w: COLS[i].w - 4,
    h: ROW - 4,
    label,
    tone,
    fill: pastel ? "pastel" : "soft",
    step: 1,
    quiet: true,
  }));
});
const TABLE_END = T_Y + 24 + CASCADE.per.length * ROW;

// ── Step 2: hate's axis and the EU withhold axis ────────────────────────────────────────────────────────────────
const AX0 = 150;
const AX1 = 830;
const px = (p: number) => Math.round(AX0 + p * (AX1 - AX0));
const hate = familyById("hate");
const E = WALKTHROUGH.edges;
const EU = LOCAL_LAW.rows.find((r) => r.market === "EU")!;

const axis = (id: string, y: number, title: string, step: number): LayoutShape[] => [
  {
    id: `${id}-title`,
    type: "text",
    x: X,
    y: y - 10,
    w: AX0 - X - 14,
    h: 20,
    label: title,
    tone: PROD_TONE.infra,
    step,
    quiet: true,
  },
  {
    id: `${id}-line`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [AX0, y],
      [AX1, y],
    ],
    step,
  },
  ...[0, 0.25, 0.5, 0.75, 1].map((t, i): LayoutShape => ({
    id: `${id}-tick-${i}`,
    type: "text",
    x: px(t) - 20,
    y: y + 14,
    w: 40,
    h: 16,
    label: String(t),
    tone: PROD_TONE.infra,
    step,
    quiet: true,
  })),
];
const vline = (id: string, x: number, y1: number, y2: number, tone: LayoutTone, step: number): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: [
    [x, y1],
    [x, y2],
  ],
  tone,
  dashed: true,
  step,
});
const note = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number
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
  quiet: true,
});

const A1 = TABLE_END + 96; // hate axis
const A2 = A1 + 140; // EU axis
const BAND_H = 18;
const axes: LayoutShape[] = [
  note(
    "ax-head",
    X,
    TABLE_END + 14,
    W,
    `Hate, one global rule (cfp ${hate.cfp}, cfn ${hate.cfn}): below the band allowed, above it removed, no model call`,
    PROD_TONE.infra,
    2
  ),
  ...axis("hate", A1, "Hate, global", 2),
  {
    id: "hate-band",
    type: "cell",
    x: px(E.pLo),
    y: A1 - BAND_H - 2,
    w: px(E.pHi) - px(E.pLo),
    h: BAND_H,
    label: "band: the model's verdict decides",
    tone: GENAI_TONE.rank,
    fill: "pastel",
    step: 2,
  },
  vline("hate-tau", px(E.tau), A1 - 34, A1 - 20, PROD_TONE.failure, 2),
  vline("hate-tau-2", px(E.tau), A1 - 1, A1 + 8, PROD_TONE.failure, 2),
  note("hate-tau-l", px(E.tau) - 40, A1 - 54, 80, `τ ${sig(E.tau)}`, PROD_TONE.failure, 2),
  note("hate-lo-l", px(E.pLo) - 18, A1 - 54, 120, `pLo ${sig(E.pLo)}: “yes” → τ`, GENAI_TONE.rank, 2),
  note("hate-hi-l", px(E.pHi) - 110, A1 - 54, 120, `pHi ${sig(E.pHi)}: “no” → τ`, GENAI_TONE.rank, 2),
  ...axis("eu", A2, "EU local law", 2),
  {
    id: "eu-band",
    type: "cell",
    x: px(EU.pLo),
    y: A2 - BAND_H - 2,
    w: px(EU.pHi) - px(EU.pLo),
    h: BAND_H,
    label: "withhold in the EU only, with the legal ground",
    tone: "blue",
    fill: "pastel",
    step: 2,
  },
  vline("eu-tau", px(EU.tau), A2 - 34, A2 - 20, PROD_TONE.failure, 2),
  vline("eu-tau-2", px(EU.tau), A2 - 1, A2 + 8, PROD_TONE.failure, 2),
  note("eu-tau-l", px(EU.tau) - 40, A2 - 54, 80, `τ ${sig(EU.tau)}`, PROD_TONE.failure, 2),
  note("eu-range", px(EU.pHi) - 130, A2 - 54, 140, `band ${sig(EU.pLo)}–${sig(EU.pHi)}`, "blue", 2),
];

// ── Step 3: the worked German comment ───────────────────────────────────────────────────────────────────────────
const dot = (id: string, p: number, tone: LayoutTone, step: number): LayoutShape => ({
  id,
  type: "circle",
  x: px(p),
  y: A1,
  w: 12,
  tone,
  fill: "pastel",
  step,
  highlight: true,
});
const walk: LayoutShape[] = [
  dot("w-raw", WALKTHROUGH.rawP, GENAI_TONE.user, 3),
  dot("w-folded", WALKTHROUGH.p, GENAI_TONE.user, 3),
  dot("w-post", WALKTHROUGH.posteriorYes, GENAI_TONE.model, 3),
  {
    id: "w-arrow",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [px(WALKTHROUGH.p), A1 + 8],
      [px(WALKTHROUGH.p) + 40, A1 + 46],
      [px(WALKTHROUGH.posteriorYes) - 40, A1 + 46],
      [px(WALKTHROUGH.posteriorYes), A1 + 8],
    ],
    tone: GENAI_TONE.model,
    smooth: true,
    head: true,
    step: 3,
  },
  note("w-raw-l", AX0 - 30, A1 + 56, 140, `raw ${WALKTHROUGH.rawP}: allowed`, GENAI_TONE.user, 3),
  note("w-folded-l", px(WALKTHROUGH.p) - 65, A1 + 56, 130, `folded ${WALKTHROUGH.p.toFixed(2)}`, GENAI_TONE.user, 3),
  note(
    "w-yes",
    px(WALKTHROUGH.posteriorYes) - 320,
    A1 + 56,
    330,
    `model “yes” → posterior ${sig(WALKTHROUGH.posteriorYes)} ≥ τ: removed`,
    GENAI_TONE.model,
    3
  ),
];
const FOOT = A2 + 40;

const spec: LayoutSpec = {
  kind: "layout",
  title: `Thresholds from the cost of each error: hate τ ${sig(E.tau)}, band ${sig(E.pLo)}–${sig(E.pHi)}, and local law as a separate withhold`,
  width: 880,
  height: FOOT + 26,
  steps: [
    { title: "One global rule per family: τ from the cost of each error" },
    { title: `Hate: a band where the model's verdict can flip the decision; the EU withhold apart` },
    {
      title: `The German comment: ${WALKTHROUGH.rawP} raw, ${WALKTHROUGH.p.toFixed(2)} folded, ${sig(WALKTHROUGH.posteriorYes)} after the model's “yes”`,
    },
  ],
  shapes: [
    ...header,
    ...tableRows,
    ...axes,
    ...walk,
    note(
      "foot",
      X,
      FOOT,
      W,
      "Costs are harm units, a policy device, not dollars; every rate is illustrative.",
      PROD_TONE.infra,
      1
    ),
  ],
};

export default spec;
