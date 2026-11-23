import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { COST, LEVERS, REVIEW, VOLUME } from "@/components/diagrams/presets/gcase-docextract";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";

// The document-extraction pipeline's month, in US dollars (design sheet §5, §12). Numbers from COST, REVIEW and LEVERS
// in presets/gcase-docextract.ts (prices November 2026 list; volumes, staff and engineering illustrative):
//   models and cloud services COST.modelsMonthly ≈ 855 = 40,000 invoices × 0.0178 + 30,000 receipts × 0.0045 + 4,000
//     statement and other pages × 0.0020; the second reader is ≈ 50% of the per-invoice line;
//   infrastructure COST.infraMonthly = 800;
//   review roster REVIEW.steady.monthlyUsd = 35,040 (6 permanent clerks × 21 days × 8 h + 4 flex × 5 days × 8 h = 1,168
//     paid hours × 30 USD);
//   engineering COST.engineeringMonthly = 2.5 FTE × 12,000 + an AP-ops owner 0.5 × 6,000 = 33,000;
//   all-in COST.allInMonthly ≈ 69,695 ≈ 0.97 USD a document (72,000 documents); review 50%, engineering 47%, models 1.2%.
// Levers, in the same units: the mid model everywhere + COST.midEverywhereDeltaMonthly ≈ 1,851 (pays only for ≥ 11 STP
// points that remove clerks, or a 43% cut in escapes, LEVERS); one permanent clerk REVIEW.clerkMonthUsd = 5,040 ≈ 19
// STP points; Batch would save COST.batchSavingMonthly ≈ 120 but sits outside zero data retention; an AP-automation
// product wins below COST.buyBreakevenFeePerInvoice ≈ 0.72 USD an invoice.
// Steps: 1 what tokens and servers cost · 2 what people cost, and the total · 3 the levers priced in the same units.
// Layout (880 wide): label column x 12 (226 wide), bars from x 250 at 400 px for 36,000 USD (to scale; the models bar is
// 9 px), the value after each bar; rows 40 apart; footer lines.
// Colours: models green, infrastructure neutral, the review roster orange (people), engineering blue, levers neutral
// text.

const X0 = 250;
const SCALE_MAX = 36_000;
const BAR_W = 400;
const ROW_Y = (i: number) => 44 + i * 40;
const BAR_H = 26;
const px = (usd: number) => Math.max(3, Math.round((usd / SCALE_MAX) * BAR_W));

const rows: { id: string; label: string; usd: number; tone: LayoutTone; note: string; step: number }[] = [
  {
    id: "models",
    label: "Models and cloud services",
    usd: COST.modelsMonthly,
    tone: GENAI_TONE.model,
    note: `${COST.perInvoice.toFixed(4)} an invoice`,
    step: 1,
  },
  { id: "infra", label: "Infrastructure", usd: COST.infraMonthly, tone: PROD_TONE.infra, note: "", step: 1 },
  {
    id: "review",
    label: "Review roster",
    usd: REVIEW.steady.monthlyUsd,
    tone: GENAI_TONE.user,
    note: `${REVIEW.steady.permanent} + ${REVIEW.steady.flex} flex clerks`,
    step: 2,
  },
  {
    id: "eng",
    label: "Engineering and AP ops",
    usd: COST.engineeringMonthly,
    tone: GENAI_TONE.data,
    note: "3 FTE",
    step: 2,
  },
];

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  quiet = false
): LayoutShape => ({
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
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const FOOT_Y = ROW_Y(rows.length) + 6;

const spec: LayoutSpec = {
  kind: "layout",
  title: "A month of the extraction pipeline: people and engineers cost 80 times what the models do",
  width: 880,
  height: FOOT_Y + 136,
  steps: [
    { title: `Models and services: ≈ ${n(Math.round(COST.modelsMonthly))} USD a month` },
    { title: `With people and engineering: ≈ ${n(Math.round(COST.allInMonthly))} USD a month` },
    { title: "The levers, priced in the same units" },
  ],
  shapes: [
    text("h", X0, 14, BAR_W, `US dollars a month, bars to scale (${n(VOLUME.documents)} documents)`, 1, true),
    ...rows.flatMap((r, i): LayoutShape[] => {
      const w = px(r.usd);
      const value = `${n(Math.round(r.usd))}${r.note ? ` · ${r.note}` : ""}`;
      return [
        { ...text(`${r.id}-label`, 12, ROW_Y(i) + 4, 226, r.label, r.step, true) },
        {
          id: `${r.id}-bar`,
          type: "cell",
          x: X0,
          y: ROW_Y(i),
          w,
          h: BAR_H,
          tone: r.tone,
          fill: "pastel",
          step: r.step,
        },
        text(`${r.id}-value`, X0 + w + 8, ROW_Y(i) + 4, Math.ceil(value.length * 6.6) + 6, value, r.step, true),
      ];
    }),
    text(
      "total",
      12,
      FOOT_Y,
      856,
      `All-in ≈ ${n(Math.round(COST.allInMonthly))} USD ≈ ${COST.allInPerDocument.toFixed(2)} a document: review ${pct(COST.shares.review)}, engineering ${pct(COST.shares.engineering)}, models ${pct(COST.shares.models, 1)}.`,
      2
    ),
    text(
      "lever-1",
      12,
      FOOT_Y + 30,
      856,
      `Mid model everywhere: +${n(Math.round(COST.midEverywhereDeltaMonthly))} a month; pays for ≥ ${Math.ceil(LEVERS.breakEvenStpPoints)} STP points that remove clerks, or ${pct(LEVERS.escapeCutToPay)} fewer escapes.`,
      3
    ),
    text(
      "lever-2",
      12,
      FOOT_Y + 52,
      856,
      `One permanent clerk: ${n(REVIEW.clerkMonthUsd)} a month ≈ ${Math.round(REVIEW.stpPointsPerClerk)} STP points. Batch: −${n(Math.round(COST.batchSavingMonthly))}, not taken (no zero data retention).`,
      3,
      true
    ),
    text(
      "lever-3",
      12,
      FOOT_Y + 74,
      856,
      `Buy an AP-automation product only below ≈ ${COST.buyBreakevenFeePerInvoice.toFixed(2)} USD an invoice: it still needs the same review roster.`,
      3,
      true
    ),
  ],
};

export default spec;
