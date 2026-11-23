import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { COST, PEOPLE, PEOPLE_NO_CAP, SAFETY_CURVE } from "@/components/diagrams/presets/gcase-moderation";

// People: an hourly roster with skills, languages and wellbeing (content-moderation-system, design sheet deep dive 2,
// §5, §12, §13 "Capacity buys recall"; preset PEOPLE, PEOPLE_NO_CAP, SAFETY_CURVE, COST in presets/gcase-moderation.ts).
// Every volume and handle time is ILLUSTRATIVE.
//   Step 1, handling hours a day by queue (items × handle seconds ÷ 3,600; PEOPLE.queues): appeals 923, threats and
//     self-harm 873, hate 400, terrorism 273, escalated reports 267, threat reports 219, CSEA 204, CSEA/NCII reports
//     120, spam 114, graphic 109, notifier appeals 105, legal-ground notices 90, QA 69, and eight smaller queues (NCII,
//     possible minors, local law, trusted flaggers, specialist calibration, NCII requests, calibration, prevalence)
//     ≈ 202; PEOPLE.hours ≈ 3,965 in all, PEOPLE.severeHours ≈ 1,919 severe (specialists, threats, graphic).
//   Step 2, the roster: urgent pools staffed per hour by Erlang C for their p95 wait (specialist hubs ≤ 15 min, peaks
//     20 / 12 / 21 in queue; threat pools ≤ 10 min, 93 across 16 languages), severe work ≤ 4 of 8 hours, general work at
//     the daily mean ÷ 0.85 (worst backlog ≈ 341 h, cleared in ≈ 3.2 h) → PEOPLE.onShift ≈ 6,282 on-shift hours a day →
//     FTE = on-shift ÷ 8 × 7 ÷ 5 × 1.15 = 1,264 reviewers + 18% support 228 = PEOPLE.fte ≈ 1,492 ≈ 6.76M USD a month
//     (COST.shares.people ≈ 83% of the total). The 4-hour cap costs PEOPLE_NO_CAP.capFte = 0 extra staff while
//     PEOPLE.capSlackHours ≈ 1,066 h of non-severe work exceed the severe reviewers' spare hours. Handle times × 1.5 →
//     PEOPLE.fteAt15 ≈ 1,897; × 2 → PEOPLE.fteAt2 ≈ 2,303 FTE ≈ 10.5M USD.
//   Step 3, capacity buys recall on threats and self-harm (SAFETY_CURVE): lowering the band's lower edge from 0.02 to
//     0.00125 lifts recall 65.0% → 83.6% for 576 → 1,555 review hours a day; the design runs 0.005 (75.9%, 859 h).
// Layout (880 wide): horizontal bars at x 230, 0–1,000 h scale over 400 px (step 1); three result boxes (step 2); a
// five-row capacity table (step 3).
// Colours: severe queues red (exposure-capped), others neutral; the roster boxes orange (people); the design row lime.

const n0 = (v: number) => Math.round(v).toLocaleString("en-GB");
const M = (v: number) => `${(v / 1e6).toFixed(2)}M`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const NAME: Record<string, string> = {
  appeals: "Appeals",
  "threats and self-harm": "Threats, self-harm",
  hate: "Hate band",
  terror: "Terrorism",
  "reports (escalated)": "Escalated reports",
  "threat reports": "Threat reports",
  csea: "CSEA",
  "CSEA/NCII reports": "CSEA, NCII reports",
  spam: "Spam band",
  graphic: "Graphic band",
  "notifier appeals": "Notifier appeals",
  "legal-ground notices": "Legal-ground notices",
  QA: "QA double review",
};
const SEVERE_POOLS = new Set(["specialists", "threats", "general (severe)"]);
const sorted = [...PEOPLE.queues].sort((a, b) => b.hours - a.hours);
const shown = sorted.filter((q) => NAME[q.id]);
const rest = sorted.filter((q) => !NAME[q.id]);
const restHours = rest.reduce((t, q) => t + q.hours, 0);

const X = 12;
const LABEL_W = 200;
const BAR_X = 230;
const BAR_W = 400;
const MAX_H = 1000;
const Y0 = 34;
const PITCH = 22;
const bw = (h: number) => Math.max(3, Math.round((h / MAX_H) * BAR_W));
const rightText = (id: string, right: number, y: number, label: string, step: number): LayoutShape => {
  const w = Math.ceil(label.length * 6.7) + 6;
  return { id, type: "text", x: right - w, y, w, h: 18, label, tone: PROD_TONE.infra, step, quiet: true };
};
const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  quiet = true,
  tone: LayoutTone = PROD_TONE.infra
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

const rowsData = [
  ...shown.map((q) => ({ id: q.id, label: NAME[q.id], hours: q.hours, severe: SEVERE_POOLS.has(q.pool) })),
  { id: "rest", label: `${rest.length} smaller queues`, hours: restHours, severe: false },
];
const bars: LayoutShape[] = rowsData.flatMap((r, i): LayoutShape[] => {
  const y = Y0 + i * PITCH;
  const w = bw(r.hours);
  return [
    rightText(`q-${i}-l`, BAR_X - 10, y, r.label, 1),
    {
      id: `q-${i}`,
      type: "cell",
      x: BAR_X,
      y: y + 2,
      w,
      h: 15,
      tone: r.severe ? PROD_TONE.failure : "neutral",
      fill: "pastel",
      step: 1,
      quiet: i > 0,
    },
    text(`q-${i}-n`, BAR_X + w + 6, y, `${n0(r.hours)} h`.length * 7 + 6, `${n0(r.hours)} h`, 1),
  ];
});
const BARS_END = Y0 + rowsData.length * PITCH;
const legend: LayoutShape[] = [
  {
    id: "leg-sev",
    type: "cell",
    x: 660,
    y: Y0 + 4,
    w: 14,
    h: 12,
    tone: PROD_TONE.failure,
    fill: "pastel",
    step: 1,
    quiet: true,
  },
  text("leg-sev-l", 680, Y0, 190, `severe: ${n0(PEOPLE.severeHours)} h, ≤ 4 h a shift`, 1, true, PROD_TONE.failure),
  {
    id: "leg-oth",
    type: "cell",
    x: 660,
    y: Y0 + 26,
    w: 14,
    h: 12,
    tone: "neutral",
    fill: "pastel",
    step: 1,
    quiet: true,
  },
  text("leg-oth-l", 680, Y0 + 22, 190, "other work, staffed at the mean", 1),
  text("leg-tot", 660, Y0 + 50, 208, `in all ≈ ${n0(PEOPLE.hours)} handling h a day`, 1, true),
];

// Step 2: the roster and what it costs.
const R_Y = BARS_END + 40;
const RW = 278;
const roster: LayoutShape[] = [
  text(
    "r-head",
    X,
    R_Y - 26,
    856,
    "An hourly roster: Erlang per urgent pool and hour, severe work at most 4 of 8 hours",
    2,
    true
  ),
  {
    id: "r-urgent",
    type: "box",
    x: X,
    y: R_Y,
    w: RW,
    h: 58,
    label: "Urgent pools, per hour",
    sub: `hubs peak ${PEOPLE.specialistPeak.join(" / ")}; threats ${PEOPLE.threatPeakTotal} in 16 languages`,
    tone: GENAI_TONE.user,
    fill: "pastel",
    step: 2,
  },
  {
    id: "r-fte",
    type: "box",
    x: X + RW + 11,
    y: R_Y,
    w: RW,
    h: 58,
    label: `${n0(PEOPLE.onShift)} on-shift h → ${n0(PEOPLE.fte)} FTE`,
    sub: `${n0(PEOPLE.agents)} reviewers + ${n0(PEOPLE.support)} support; ${M(PEOPLE.perMonth)} USD a month`,
    tone: GENAI_TONE.user,
    fill: "pastel",
    step: 2,
    quiet: true,
  },
  {
    id: "r-sens",
    type: "box",
    x: X + 2 * (RW + 11),
    y: R_Y,
    w: RW,
    h: 58,
    label: "If handle times are wrong",
    sub: `× 1.5 → ${n0(PEOPLE.fteAt15)} FTE; × 2 → ${n0(PEOPLE.fteAt2)} (${M(PEOPLE.perMonthAt2)} USD)`,
    tone: "neutral",
    fill: "pastel",
    step: 2,
    quiet: true,
  },
  text(
    "r-note",
    X,
    R_Y + 66,
    856,
    `The 4-hour cap costs ${n0(Math.abs(PEOPLE_NO_CAP.capFte))} extra staff while ≈ ${n0(PEOPLE.capSlackHours)} h of other work fill the rest of the shift. People ≈ ${pct(COST.shares.people)} of the monthly total.`,
    2
  ),
];

// Step 3: capacity buys recall on threats and self-harm.
const C_Y = R_Y + 66 + 58;
const COLS = [
  { key: "edge", label: "Band lower edge", w: 150 },
  { key: "recall", label: "Recall", w: 110 },
  { key: "hours", label: "Review h a day", w: 150 },
  { key: "usd", label: "USD a day", w: 150 },
  { key: "harm", label: "Harm units avoided vs row above", w: 290 },
];
const colX = (i: number) => X + COLS.slice(0, i).reduce((t, c) => t + c.w, 0);
const DESIGN = 0.005;
const curve: LayoutShape[] = [
  text(
    "c-head",
    X,
    C_Y - 26,
    856,
    "Capacity buys recall on threats and self-harm: the policy lead signs the operating point",
    3,
    true
  ),
  ...COLS.map((c, i) => text(`c-th-${c.key}`, colX(i), C_Y, c.w, c.label, 3)),
  ...SAFETY_CURVE.flatMap((r, j): LayoutShape[] => {
    const y = C_Y + 22 + j * 24;
    const design = r.pLo === DESIGN;
    const vals = [
      String(r.pLo) + (design ? " (design)" : ""),
      pct(r.recall),
      n0(r.hours),
      n0(r.usdPerDay),
      r.harmAvoided === null ? "—" : n0(r.harmAvoided),
    ];
    return vals.map((v, i): LayoutShape => ({
      id: `c-${j}-${i}`,
      type: "cell",
      x: colX(i) + 2,
      y,
      w: COLS[i].w - 4,
      h: 20,
      label: v,
      tone: design ? PROD_TONE.check : "neutral",
      fill: design ? "pastel" : "soft",
      step: 3,
      quiet: !(design && i === 0),
    }));
  }),
];
const FOOT = C_Y + 22 + SAFETY_CURVE.length * 24 + 10;

const spec: LayoutSpec = {
  kind: "layout",
  title: `People are the cost: ≈ ${n0(PEOPLE.hours)} handling hours a day, ≈ ${n0(PEOPLE.fte)} FTE from an hourly roster`,
  width: 880,
  height: FOOT + 26,
  steps: [
    { title: `Handling hours a day by queue: ≈ ${n0(PEOPLE.hours)}, ${n0(PEOPLE.severeHours)} of them severe` },
    { title: `An hourly roster: ≈ ${n0(PEOPLE.fte)} FTE, ${M(PEOPLE.perMonth)} USD a month` },
    { title: "Capacity buys recall on threats and self-harm" },
  ],
  shapes: [
    text("head", X, 6, 856, "Handling hours a day by queue (illustrative volumes and handle times)", 1),
    ...bars,
    ...legend,
    ...roster,
    ...curve,
    text(
      "foot",
      X,
      FOOT,
      856,
      "Harm units are a policy device, not dollars; every volume, handle time and rate is illustrative.",
      3
    ),
  ],
};

export default spec;
