import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import {
  CALIBRATION,
  HUMAN,
  PREVALENCE,
  PREVALENCE_BOUNDS,
  PREVALENCE_WEEKLY,
  type FamilyId,
} from "@/components/diagrams/presets/gcase-moderation";

// Measuring what was missed (content-moderation-system, design sheet §13 and deep dive 4, after the interviewer pass;
// preset PREVALENCE, PREVALENCE_BOUNDS, PREVALENCE_WEEKLY, CALIBRATION in presets/gcase-moderation.ts). Every rate is
// ILLUSTRATIVE.
//   Step 1, the sample: uniform samples of views (PREVALENCE.labelsPerWeek 145,000 labels a week ≈ 20,700 a day),
//     content snapshotted with the policy version, every image through the hash and CSEA screens first; a labeller from
//     a different model family (2 self-hosted GPUs, a measurement prompt with no scores or account signals); people
//     confirm every positive and audit 1–2% of negatives (≈ 290 human labels a day); detection = sensitivity 0.90
//     (measured on live positives found by other routes) × the confirmer's 1 − 0.04 = PREVALENCE.det 0.864.
//   Step 2, per family on a rolling 4-week window, per 10,000 views: the point, the two-sided 95% interval
//     (PREVALENCE_BOUNDS.twoSided95) and the one-sided 95% upper bound that N1 tests (PREVALENCE_BOUNDS.upper95):
//     spam 6.04 (4.62–7.86; bound 7.58 ≤ 9), hate 5.29 (4.03–6.83; 6.59 ≤ 8), graphic 0.54 (0.20–1.05; 0.96 ≤ 1.5),
//     threats 0.43 (0.16–1.14; 1.03 ≤ 1.5), terrorism 0.042 (0–1.10; 0.89 ≤ 1.5). A one-week test at the design's own
//     rate would fail PREVALENCE_WEEKLY.weeklyFail 53–68% of weeks (terrorism every week). A 25% rise in hate is visible
//     between two windows only with ≈ 137,500 labels a week (PREVALENCE.rows.nFor25).
//   Step 3, calibration in the tails: labels per score bin at each family's lower edge to estimate P within ± 50% at
//     95%, n(p) = 1.96² (1 − p) ÷ (0.25 p): CSEA 7,668, terrorism 5,107, threats 3,058, NCII 1,522, graphic 972, hate
//     354, spam 240; ≈ 115,000 labels a quarter ≈ 1,264 a day; CSEA and NCII bins (≈ 670 a day) only by specialists.
// Layout (880 wide): five process boxes (step 1); two interval panels on their own scales, 0–10 for spam and hate and
// 0–2 for the rare families, x 200–640, notes right (step 2); horizontal bars for the calibration labels (step 3).
// Colours: the sample neutral; the labeller green (a model); people orange; intervals blue (measurement); the N1 bound
// red; calibration bars orange for specialists and blue for general labellers.

const X = 12;
const W = 856;
const n0 = (v: number) => Math.round(v).toLocaleString("en-GB");
const d2 = (v: number) => (v < 0.1 ? v.toFixed(3) : v.toFixed(2));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const NAME: Record<string, string> = {
  spam: "Spam, scams",
  hate: "Hate, harassment",
  graphic: "Adult, graphic",
  safety: "Threats, self-harm",
  terror: "Terrorism",
  csea: "CSEA",
  ncii: "NCII",
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
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet });

// ── Step 1: the sample ──────────────────────────────────────────────────────────────────────────────────────────
const BOX_W = 160;
const BOX_GAP = (W - 5 * BOX_W) / 4;
const B_Y = 30;
const B_H = 58;
const proc: { id: string; label: string; sub: string; tone: LayoutTone }[] = [
  { id: "views", label: "Uniform view sample", sub: `${n0(PREVALENCE.labelsPerWeek)} a week`, tone: "neutral" },
  { id: "snap", label: "Snapshot, screen", sub: "policy version; CSEA hash", tone: "neutral" },
  {
    id: "label",
    label: "Other-family model",
    sub: `${PREVALENCE.labellerGpus} GPUs; no scores`,
    tone: GENAI_TONE.model,
  },
  {
    id: "confirm",
    label: "People confirm",
    sub: `positives; ≈ ${n0(PREVALENCE.humanLabelsPerDay)} a day`,
    tone: GENAI_TONE.user,
  },
  {
    id: "det",
    label: `Detection ${PREVALENCE.det.toFixed(3)}`,
    sub: `0.90 × ${(1 - HUMAN.fnr).toFixed(2)} confirmer`,
    tone: "blue",
  },
];
const procShapes: LayoutShape[] = proc.flatMap((p, i): LayoutShape[] => [
  {
    id: `p-${p.id}`,
    type: "box",
    x: X + i * (BOX_W + BOX_GAP),
    y: B_Y,
    w: BOX_W,
    h: B_H,
    label: p.label,
    sub: p.sub,
    tone: p.tone,
    fill: "pastel",
    step: 1,
    quiet: i > 0,
  },
  ...(i > 0
    ? [{ id: `p-a${i}`, type: "arrow" as const, x: 0, y: 0, from: `p-${proc[i - 1].id}`, to: `p-${p.id}`, step: 1 }]
    : []),
]);
const S1_NOTE = B_Y + B_H + 8;

// ── Step 2: intervals against N1 ────────────────────────────────────────────────────────────────────────────────
const AX0 = 200;
const AX1 = 640;
const NOTE_X = 652;
const ROW = 30;
const bounds = (id: string) => PREVALENCE_BOUNDS.find((b) => b.id === id)!;
const weekly = (id: string) => PREVALENCE_WEEKLY.find((w) => w.id === id)!;
const row = (id: string) => PREVALENCE.rows.find((r) => r.id === id)!;

function panel(
  prefix: string,
  y0: number,
  ids: string[],
  max: number,
  ticks: number[]
): { shapes: LayoutShape[]; end: number } {
  const px = (v: number) => Math.round(AX0 + (Math.min(v, max) / max) * (AX1 - AX0));
  const shapes: LayoutShape[] = [];
  ids.forEach((id, i) => {
    const y = y0 + i * ROW;
    const r = row(id);
    const b = bounds(id);
    const target = Math.round(r.target * 1e6) / 100;
    shapes.push(
      text(`${prefix}-${id}-name`, X, y, AX0 - X - 12, NAME[id], 2),
      {
        id: `${prefix}-${id}-track`,
        type: "path",
        x: 0,
        y: 0,
        points: [
          [AX0, y + 9],
          [AX1, y + 9],
        ],
        step: 2,
        quiet: true,
      },
      {
        id: `${prefix}-${id}-ci`,
        type: "cell",
        x: px(b.twoSided95.lo),
        y: y + 3,
        w: Math.max(4, px(b.twoSided95.hi) - px(b.twoSided95.lo)),
        h: 12,
        tone: "blue",
        fill: "pastel",
        step: 2,
        quiet: true,
      },
      {
        id: `${prefix}-${id}-pt`,
        type: "circle",
        x: px(r.per10k),
        y: y + 9,
        w: 9,
        tone: "blue",
        fill: "pastel",
        step: 2,
        quiet: true,
      },
      {
        id: `${prefix}-${id}-n1`,
        type: "path",
        x: 0,
        y: 0,
        points: [
          [px(target), y - 2],
          [px(target), y + 20],
        ],
        tone: PROD_TONE.failure,
        step: 2,
        quiet: true,
      },
      text(
        `${prefix}-${id}-note`,
        NOTE_X,
        y,
        W + X - NOTE_X,
        `bound ${d2(b.upper95)} ≤ ${target} · ${n0(r.nWeek)} a week`,
        2
      )
    );
  });
  const axisY = y0 + ids.length * ROW;
  shapes.push(
    {
      id: `${prefix}-axis`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [AX0, axisY],
        [AX1, axisY],
      ],
      step: 2,
      quiet: true,
    },
    ...ticks.map((t, i) => text(`${prefix}-tick-${i}`, px(t) - 20, axisY + 4, 40, String(t), 2))
  );
  return { shapes, end: axisY + 22 };
}

const S2_HEAD = S1_NOTE + 34;
const panelA = panel("a", S2_HEAD + 26, ["spam", "hate"], 10, [0, 2.5, 5, 7.5, 10]);
const panelB = panel("b", panelA.end + 8, ["graphic", "safety", "terror"], 2, [0, 0.5, 1, 1.5, 2]);
const fails = PREVALENCE_WEEKLY.filter((w) => w.id !== "terror").map((w) => w.weeklyFail);
const hate25 = row("hate").nFor25;
const S2_FOOT = panelB.end + 2;

// ── Step 3: calibration labels per bin at each family's lower edge ──────────────────────────────────────────────
const S3_HEAD = S2_FOOT + 50;
const BAR_X = 200;
const BAR_MAX = 440;
const calRows = [...CALIBRATION.rows].sort((a, b) => b.nLo - a.nLo);
const maxN = Math.max(...calRows.map((r) => r.nLo));
const calShapes: LayoutShape[] = calRows.flatMap((r, i): LayoutShape[] => {
  const y = S3_HEAD + 26 + i * 24;
  const w = Math.max(6, Math.round((r.nLo / maxN) * BAR_MAX));
  return [
    text(`c-${r.id}-name`, X, y, BAR_X - X - 12, NAME[r.id as FamilyId], 3),
    {
      id: `c-${r.id}`,
      type: "cell",
      x: BAR_X,
      y: y + 1,
      w,
      h: 16,
      tone: r.specialist ? GENAI_TONE.user : "blue",
      fill: "pastel",
      step: 3,
      quiet: true,
    },
    text(`c-${r.id}-n`, BAR_X + w + 6, y, `${n0(r.nLo)} labels a bin`.length * 7, `${n0(r.nLo)} labels a bin`, 3),
  ];
});
const S3_FOOT = S3_HEAD + 26 + calRows.length * 24 + 6;

const spec: LayoutSpec = {
  kind: "layout",
  title: `Measuring what was missed: views sampled, labelled by another model family, confirmed by people; hate ${row("hate").per10k.toFixed(2)} per 10,000 views`,
  width: 880,
  height: S3_FOOT + 48,
  steps: [
    { title: "Sample views; another model family labels; people confirm" },
    { title: "Each family's 4-week interval against its target" },
    { title: "Calibration labels per score bin at each lower edge" },
  ],
  shapes: [
    text(
      "h1",
      X,
      6,
      W,
      "Every week, per family: what users saw, labelled by someone other than the enforcer",
      1,
      PROD_TONE.infra,
      true
    ),
    ...procShapes,
    text(
      "s1-note",
      X,
      S1_NOTE,
      W,
      "Sensitivity is measured on live positives other routes found (reports, flaggers, upheld appeals): biased high, so prevalence reads low.",
      1
    ),
    text(
      "h2",
      X,
      S2_HEAD,
      W,
      "Violating views per 10,000, rolling 4 weeks: point, two-sided 95% interval (blue), target (red); the N1 test uses the one-sided bound",
      2,
      PROD_TONE.infra,
      false
    ),
    ...panelA.shapes,
    ...panelB.shapes,
    text(
      "s2-foot",
      X,
      S2_FOOT,
      W,
      `A one-week test would fail ${pct(Math.min(...fails))}–${pct(Math.max(...fails))} of weeks at the design's own rate (terrorism every week). Seeing a 25% rise in hate needs ≈ ${n0(Math.round(hate25 / 100) * 100)} labels a week.`,
      2
    ),
    text(
      "h3",
      X,
      S3_HEAD,
      W,
      "Labels per score bin at each family's lower edge, to know P there within ± 50%: orange bins only by specialists",
      3,
      PROD_TONE.infra,
      false
    ),
    ...calShapes,
    text(
      "s3-foot",
      X,
      S3_FOOT,
      W,
      `≈ ${n0(CALIBRATION.perQuarter)} labels a quarter ≈ ${n0(CALIBRATION.perDay)} a day (${n0(CALIBRATION.specialistPerDay)} by specialists); the same labels measure the model's errors per bin.`,
      3
    ),
    text(
      "s3-foot2",
      X,
      S3_FOOT + 22,
      W,
      "Every rate and count is illustrative; CSEA and NCII are measured by hash re-scans, not sampled.",
      3
    ),
  ],
};

export default spec;
