import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { INTENTS, PSI, PSI_BANDS, PSI_OTHER_SHARE, PSI_TERMS } from "@/components/diagrams/presets/production-drift";

// Drift detection as a flow with a worked statistic (drift-detection, Architecture). Step 1: window -> statistic ->
// alert -> refresh the evaluation set. Step 2: the PSI of Brightpost's intent mix, baseline against this week, term by
// term. Step 3: where 0.276 falls on the usual bands.
// Working (presets/production-drift.ts; the shares are illustrative): PSI = sum of (actual − expected) × ln(actual ÷
//   expected) with shares as fractions. Refunds (0.28 − 0.40) × ln(0.28 ÷ 0.40) = 0.0428; delivery 0.0004; product 0.0021;
//   account 0.0011; other (0.21 − 0.05) × ln(0.21 ÷ 0.05) = 0.16 × 1.4351 = 0.2296. Total 0.276; "other" is 83 % of it.
//   Bands (rule of thumb from credit-scoring practice, checked November 2026): under 0.10 stable, 0.10 to 0.25 watch,
//   0.25 or more substantial change. They are conventions to calibrate on your own history, not tests.
// Layout (880 x 470): flow boxes y 16 at x 20 + 215 i (w 190, h 56), notes y 80; table at x 40, y 150, columns at x 40,
// 250, 350, 450, rows pitch 28; working note x 580; scale bar y 392 (800 px for PSI 0 to 0.40, x 40).
// Colours: window blue (data), statistic lime (a check), alert red (drift alarm), refresh green; table neutral with the
// "other" row highlighted; scale segments lime (stable), neutral (watch), red (alert).

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone,
  step,
  quiet: true,
  ...extra,
});

const flow = [
  {
    id: "window",
    label: "Window",
    sub: "this week against baseline",
    tone: PROD_TONE.data,
    note: "same bins every time;\nfixed baseline or rolling",
  },
  {
    id: "stat",
    label: "Statistic",
    sub: "PSI on the intent mix",
    tone: PROD_TONE.check,
    note: "one number per feature,\nbins never changed",
  },
  {
    id: "alert",
    label: "Alert",
    sub: "PSI at 0.25 or more",
    tone: PROD_TONE.failure,
    note: "needs two windows in a\nrow, then a person looks",
  },
  {
    id: "refresh",
    label: "Refresh",
    sub: "the evaluation set",
    tone: PROD_TONE.model,
    note: "add the new topic to the\ngolden set, rebaseline",
  },
] as const;
const shapes: LayoutShape[] = [];
flow.forEach((f, i) => {
  shapes.push(
    {
      id: f.id,
      type: "box",
      x: 20 + 215 * i,
      y: 16,
      w: 190,
      h: 56,
      label: f.label,
      sub: f.sub,
      tone: f.tone,
      fill: "pastel",
      step: 1,
    },
    text(`${f.id}-note`, 20 + 215 * i, 80, 190, 36, f.note, 1)
  );
  if (i > 0) shapes.push({ id: `fa-${i}`, type: "arrow", x: 0, y: 0, from: flow[i - 1].id, to: f.id, step: 1 });
});

const X = [40, 250, 350, 450];
const hdr = ["Intent", "Baseline", "This week", "Term"];
hdr.forEach((h, i) => shapes.push(text(`h${i}`, X[i], 148, i === 0 ? 190 : 90, 20, h, 2)));
const pc = (v: number) => `${Math.round(v * 100)} %`;
INTENTS.forEach((r, i) => {
  const y = 176 + 28 * i;
  const hot = i === INTENTS.length - 1;
  const cells = [r.name, pc(r.base), pc(r.now), PSI_TERMS[i].toFixed(4)];
  cells.forEach((c, ci) =>
    shapes.push(text(`r${i}c${ci}`, X[ci], y, ci === 0 ? 190 : 90, 22, c, 2, hot ? PROD_TONE.failure : PROD_TONE.infra))
  );
});
shapes.push(
  text("tot-l", X[0], 176 + 28 * 5, 190, 22, "PSI (sum of terms)", 2),
  text("tot-v", X[3], 176 + 28 * 5, 90, 22, PSI.toFixed(3), 2),
  text("work1", 580, 176, 290, 54, "term = (this week − baseline)\n× ln(this week ÷ baseline)", 2),
  text(
    "work2",
    580,
    246,
    290,
    72,
    `Other: (0.21 − 0.05) × ln(4.2)\n= 0.16 × 1.435 = 0.2296,\n${Math.round(PSI_OTHER_SHARE * 100)} % of the total`,
    2
  )
);

const W = 800;
const scale = (v: number) => 40 + (v / 0.4) * W;
const seg = (
  id: string,
  a: number,
  b: number,
  label: string,
  tone: LayoutShape["tone"],
  fill: "soft" | "pastel" | "paper"
) => shapes.push({ id, type: "box", x: scale(a), y: 396, w: scale(b) - scale(a), h: 34, label, tone, fill, step: 3 });
seg("s-stable", 0, PSI_BANDS.stable, "under 0.10", PROD_TONE.check, "pastel");
seg("s-watch", PSI_BANDS.stable, PSI_BANDS.alert, "0.10 to 0.25: watch", PROD_TONE.infra, "soft");
seg("s-alert", PSI_BANDS.alert, 0.4, "0.25 or more: alert", PROD_TONE.failure, "pastel");
shapes.push(
  {
    id: "mark",
    type: "circle",
    x: scale(PSI),
    y: 383,
    w: 14,
    tone: PROD_TONE.failure,
    fill: "pastel",
    highlight: true,
    step: 3,
  },
  text("mark-t", scale(PSI) - 150, 330, 300, 30, `this week: ${PSI.toFixed(3)}\nthe alert fires`, 3, PROD_TONE.failure),
  text(
    "cav",
    40,
    436,
    800,
    20,
    "The bands are a convention from credit scoring, not a test: calibrate them on your own history.",
    3
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A drift check: window, statistic, alert, refresh",
  width: 880,
  height: 466,
  steps: [
    { title: "Window, statistic, alert, refresh" },
    { title: "PSI on the intent mix, term by term" },
    { title: "0.276 is past the alert line" },
  ],
  shapes,
};

export default spec;
