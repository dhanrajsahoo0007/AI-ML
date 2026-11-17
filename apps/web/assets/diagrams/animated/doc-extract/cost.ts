import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// "Batch processing, throughput and cost" (genai-system-design/case-studies/document-extraction-pipeline). Where the
// money goes per 1,000 Brightpost supplier invoices. All prices and times are illustrative:
// - Manual entry today: 6 minutes per invoice at 30 US dollars an hour = 3.00 per invoice → 3,000 per 1,000.
// - OCR and layout: 2 pages per invoice at 1.50 per 1,000 pages = 0.003 per invoice → 3.00 per 1,000.
// - LLM extraction: 2 pages × 1,500 tokens + 1,000 tokens of schema and instructions = 4,000 input tokens at 1 per
//   million, plus 600 output tokens at 4 per million = 0.004 + 0.0024 = 0.0064 per invoice → 6.40 per 1,000.
// - Clerk review: 90 seconds per reviewed invoice at 30 an hour = 0.75. At a 70% straight-through rate, 300 of 1,000
//   are reviewed = 225.00; at 85%, 150 are = 112.50.
// - Pipeline total: 3.00 + 6.40 + 225.00 = 234.40 per 1,000 (about 0.23 per invoice); at 85% straight-through,
//   3.00 + 6.40 + 112.50 = 121.90.
//
// Manual entry would be a bar 13 times longer than the review bar (3,000 / 234.40 = 12.8), so it is a line of text
// under the chart rather than a bar that misleads.
//
// Tones (RAG legend, two plus neutral): pages and OCR blue, the LLM green, people neutral.
// Bars: 2.2 units per US dollar from x 250, so 225 → 495 units.

const X0 = 250;
const PER_USD = 2.2;
const MANUAL = 3_000;
const OCR = 3;
const LLM = 6.4;
const REVIEW_70 = 300 * 0.75;
const REVIEW_85 = 150 * 0.75;
const usd = (v: number) => v.toFixed(2);

const rows: { label: string; usd: number; tone: LayoutTone; step: number }[] = [
  { label: "OCR and layout, 2 pages", usd: OCR, tone: RAG_TONE.text, step: 1 },
  { label: "LLM extraction", usd: LLM, tone: RAG_TONE.answer, step: 1 },
  { label: "Clerk review, 30% of invoices", usd: REVIEW_70, tone: RAG_TONE.infra, step: 2 },
  { label: "Clerk review, 15% of invoices", usd: REVIEW_85, tone: RAG_TONE.infra, step: 3 },
];

const ROW_Y = (i: number) => 64 + i * 48;
const BAR_H = 30;

const text = (id: string, x: number, y: number, w: number, label: string, step: number, h = 20): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Cost per 1,000 supplier invoices",
  width: 860,
  height: 360,
  steps: [
    { title: "The models cost under 10 dollars" },
    { title: "Clerks checking 30% of invoices cost 225" },
    { title: "Raising the straight-through rate halves it" },
  ],
  shapes: [
    text("h", X0, 24, 560, "US dollars per 1,000 invoices (illustrative)", 1),
    ...rows.flatMap((r, i): LayoutShape[] => {
      const w = Math.max(4, Math.round(r.usd * PER_USD));
      const inside = w >= 70;
      const tag = usd(r.usd);
      return [
        text(`r${i}-label`, 20, ROW_Y(i) + 5, 220, r.label, r.step),
        {
          id: `r${i}-bar`,
          type: "cell",
          x: X0,
          y: ROW_Y(i),
          w,
          h: BAR_H,
          label: inside ? tag : undefined,
          tone: r.tone,
          fill: "pastel",
          step: r.step,
        },
        ...(inside ? [] : [text(`r${i}-usd`, X0 + w + 8, ROW_Y(i) + 5, 60, tag, r.step)]),
      ];
    }),
    text(
      "total-70",
      20,
      ROW_Y(rows.length) + 4,
      820,
      `Pipeline at 70% straight-through: ${usd(OCR)} + ${usd(LLM)} + ${usd(REVIEW_70)} = ${usd(OCR + LLM + REVIEW_70)}`,
      2
    ),
    text(
      "manual",
      20,
      ROW_Y(rows.length) + 30,
      820,
      `Manual entry today: 6 min at 30 an hour = ${fmt(MANUAL)}.00, about ${Math.round(MANUAL / (OCR + LLM + REVIEW_70))} times the pipeline`,
      2
    ),
    text(
      "total-85",
      20,
      ROW_Y(rows.length) + 56,
      820,
      `At 85% straight-through: ${usd(OCR)} + ${usd(LLM)} + ${usd(REVIEW_85)} = ${usd(OCR + LLM + REVIEW_85)}`,
      3
    ),
  ],
};

export default spec;
