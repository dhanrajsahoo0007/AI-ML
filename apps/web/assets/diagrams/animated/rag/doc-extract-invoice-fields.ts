import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "Validation and confidence scoring" (genai-system-design/case-studies/document-extraction-pipeline). One of
// Brightpost's supplier invoices, a scan, becomes typed fields with a confidence each; rules check the totals and a
// 0.90 threshold decides which fields a clerk must look at.
//
// The invoice (illustrative; the supplier is invented):
// - Three line items: 400 boxes at 2.00 = 800.00, 200 rolls of tape at 1.20 = 240.00, 1,000 labels at 0.20 = 200.00.
//   Subtotal 800 + 240 + 200 = 1,240.00; VAT at 20% = 248.00; total 1,240 + 248 = 1,488.00.
// - Fields on this invoice: 12 header fields + 3 line items × 4 fields (description, quantity, unit price, amount)
//   = 24. The page's averages (5 line items, 32 fields) are for the whole month's mix.
// - The date is printed "03/11/2026": a UK supplier means 3 November, but the format is ambiguous, so the model reads
//   2026-11-03 at 0.71. The purchase order number is handwritten, read at 0.62. Every other field is 0.93 or more.
// - Threshold 0.90 (illustrative): 2 of 24 fields fall below it, so the invoice goes to review with those two fields
//   marked; the clerk does not re-key the other 22.
//
// Tones (four, RAG legend): the invoice text blue, extracted values green, confidence scores lime, fields below the
// threshold red. Confidence bars run from 0.5 (x 672) to 1.0 (x 802), 130 units, so the threshold sits at x 776.

const THRESHOLD = 0.9;
const BAR_X = 672;
const BAR_W = 130;
const barW = (c: number) => Math.round(((c - 0.5) / 0.5) * BAR_W);
const ROW_Y = (i: number) => 74 + i * 38;

const fields: { name: string; value: string; conf: number }[] = [
  { name: "supplier_name", value: "Harbourline Packaging", conf: 0.99 },
  { name: "supplier_vat", value: "GB 123 4567 89", conf: 0.97 },
  { name: "invoice_number", value: "INV-20417", conf: 0.98 },
  { name: "invoice_date", value: "2026-11-03", conf: 0.71 },
  { name: "po_number", value: "PO-7731", conf: 0.62 },
  { name: "line_items", value: "3 rows, 1,240.00", conf: 0.93 },
  { name: "vat_amount", value: "248.00", conf: 0.95 },
  { name: "total", value: "1,488.00", conf: 0.96 },
];
const flagged = fields.filter((f) => f.conf < THRESHOLD).length;
const FIELDS_ON_INVOICE = 12 + 3 * 4;

const text = (id: string, x: number, y: number, w: number, label: string, step?: number, h = 20): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  step,
});

const region = (id: string, x: number, y: number, w: number, h: number, label: string, sub?: string): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w,
  h,
  label,
  sub,
  tone: RAG_TONE.text,
  fill: "soft",
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "One invoice becomes typed fields with confidences",
  width: 880,
  height: 500,
  steps: [
    { title: "A scanned supplier invoice" },
    { title: "Each field gets a value and a confidence" },
    { title: "Rules check the sums; two fields go to a clerk" },
  ],
  groups: [
    { id: "g-invoice", title: "Supplier invoice (scan)", tone: RAG_TONE.infra, x: 8, y: 28, w: 328, h: 372 },
    { id: "g-fields", title: "Extracted fields", tone: RAG_TONE.infra, x: 352, y: 28, w: 520, h: 372 },
  ],
  shapes: [
    // Step 1: the invoice's regions.
    region("inv-supplier", 20, 54, 304, 48, "Harbourline Packaging Ltd", "VAT GB 123 4567 89"),
    region("inv-number", 20, 112, 148, 40, "Invoice INV-20417"),
    region("inv-date", 176, 112, 148, 40, "Date 03/11/2026"),
    region("inv-po", 20, 162, 304, 40, "PO: PO-7731 (handwritten)"),
    region(
      "inv-lines",
      20,
      212,
      304,
      70,
      "Boxes 40×30 cm · 400 · 800.00\nTape 48 mm · 200 · 240.00\nLabels A6 · 1,000 · 200.00"
    ),
    region("inv-totals", 20, 292, 304, 70, "Subtotal 1,240.00\nVAT 20% 248.00\nTotal 1,488.00"),

    // Step 2: the extracted fields.
    text("h-field", 364, 48, 124, "field", 2),
    text("h-value", 500, 48, 160, "value", 2),
    text("h-conf", BAR_X, 48, 190, "confidence", 2),
    ...fields.flatMap((f, i): LayoutShape[] => {
      const low = f.conf < THRESHOLD;
      return [
        text(`f${i}-name`, 364, ROW_Y(i) + 5, 128, f.name, 2),
        {
          id: `f${i}-value`,
          type: "cell",
          x: 500,
          y: ROW_Y(i),
          w: 160,
          h: 30,
          label: f.value,
          tone: RAG_TONE.answer,
          fill: "pastel",
          step: 2,
        },
        {
          id: `f${i}-bar`,
          type: "cell",
          x: BAR_X,
          y: ROW_Y(i),
          w: barW(f.conf),
          h: 30,
          tone: low ? RAG_TONE.failure : RAG_TONE.rank,
          fill: "pastel",
          step: 2,
        },
        text(`f${i}-score`, BAR_X + BAR_W + 4, ROW_Y(i) + 5, 56, f.conf.toFixed(2), 2),
      ];
    }),
    {
      id: "threshold",
      type: "path",
      x: 0,
      y: 0,
      dashed: true,
      step: 2,
      points: [
        [BAR_X + barW(THRESHOLD), ROW_Y(0) - 8],
        [BAR_X + barW(THRESHOLD), ROW_Y(fields.length - 1) + 38],
      ],
    },
    text("threshold-label", BAR_X + barW(THRESHOLD) - 70, ROW_Y(fields.length) + 2, 140, "threshold 0.90", 2),

    // Step 3: validation and routing.
    text(
      "checks",
      20,
      414,
      520,
      "Lines add up: 800 + 240 + 200 = 1,240.00\nVAT: 20% of 1,240.00 = 248.00; total 1,488.00\nSupplier VAT number found in the ERP",
      3,
      60
    ),
    {
      id: "route",
      type: "box",
      x: 560,
      y: 418,
      w: 300,
      h: 52,
      label: `${flagged} of ${FIELDS_ON_INVOICE} fields below ${THRESHOLD.toFixed(2)}`,
      sub: "to the review queue, both marked",
      tone: RAG_TONE.failure,
      fill: "soft",
      step: 3,
    },
  ],
};

export default spec;
