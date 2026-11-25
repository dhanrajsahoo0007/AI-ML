import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { CRITICAL, INVOICE, INVOICE_FIELDS } from "@/components/diagrams/presets/gcase-docextract";

// Step 5 and deep dive 1 of the document-extraction case study (design sheet §9 walk-through, §15.1): confidence you can
// threshold. Harbourline Packaging's scanned invoice INV-20417, route B, field by field. Numbers from
// presets/gcase-docextract.ts:
//   INVOICE.lines: 400 × 2.00 = 800.00, 200 × 1.20 = 240.00, 1,000 × 0.20 = 200.00 → net INVOICE.net = 1,240.00;
//   VAT 20% = INVOICE.vat = 248.00; gross INVOICE.total = 1,488.00. The toner is faint on one digit of the total.
//   INVOICE_FIELDS: Azure Read word 311 reads INVOICE.misread "1,438.00" at word confidence 0.71; the small VLM cites
//   word 311 and copies it; Textract (its own OCR) reads "1,488.00", box IoU 0.90 with word 311; every other critical
//   field agrees on raw text. The blind image-only tie-break reads "1,488.00". Rules: Σ lines = net, 20% VAT, net +
//   VAT = gross all pass for 1,488.00 (1,240 + 248), and 1,438.00 would fail the last.
//   P(correct) per field is ILLUSTRATIVE; thresholds per family are CALIBRATION.thresholds (amounts 0.995, kind and
//   parties 0.998, invoice number 0.998, PO and dates 0.997). All CRITICAL = 11 pass: the invoice auto-approves.
// Steps: 1 the scan · 2 two readers on different OCR · 3 the tie-break and the rules · 4 P(correct) against each
// family's threshold, and the decision.
// Layout (880 wide): the invoice x 8–316 (a group of blue regions); the table x 330: field name 88, primary 108,
// Textract 108, tie-break and rules 92, P(correct) 124, 4 px apart; rows 30 apart from y 70; the rules and the decision
// under the table.
// Colours (GENAI_TONE): the invoice blue (page data), readers' values green (model output), the misread and the gross
// row's disputed cells red, rules and scores lime (checks), the decision green.

const TABLE_X = 330;
const COL = { field: 88, primary: 108, second: 108, check: 92, score: 124 } as const;
const GAP = 4;
const X = {
  field: TABLE_X,
  primary: TABLE_X + COL.field + GAP,
  second: TABLE_X + COL.field + COL.primary + 2 * GAP,
  check: TABLE_X + COL.field + COL.primary + COL.second + 3 * GAP,
  score: TABLE_X + COL.field + COL.primary + COL.second + COL.check + 4 * GAP,
} as const;
const ROW_Y = (i: number) => 70 + i * 30;
const ROW_H = 26;
const rows = INVOICE_FIELDS.rows;
const BELOW = ROW_Y(rows.length) + 8;

const money = (v: number) => v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number,
  quiet = true
): LayoutShape => ({ id, type: "cell", x, y, w, h: ROW_H, label, tone, fill: "pastel", step, quiet });
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
  tone: "neutral",
  step,
  quiet,
});
const region = (id: string, y: number, h: number, label: string, sub?: string, extra: Partial<LayoutShape> = {}) =>
  ({
    id,
    type: "box",
    x: 20,
    y,
    w: 284,
    h,
    label,
    sub,
    tone: GENAI_TONE.data,
    fill: "soft",
    step: 1,
    ...extra,
  }) as LayoutShape;

const lineText = INVOICE.lines
  .map(
    (l) =>
      `${l.description} · ${l.quantity.toLocaleString("en-GB")} × ${money(l.unitPrice)} · ${money(l.quantity * l.unitPrice)}`
  )
  .join("\n");
const passCount = rows.filter((r) => r.pCorrect >= r.threshold).length;
const isGross = (f: string) => f === INVOICE_FIELDS.disputed;

const spec: LayoutSpec = {
  kind: "layout",
  title: "One scanned invoice, field by field: two readers on different OCR, a tie-break, rules and a calibrated score",
  width: 880,
  height: BELOW + 110,
  steps: [
    { title: "A scanned invoice with one faint digit in the total" },
    { title: "Two readers on different OCR engines disagree on one field" },
    { title: "A blind image-only tie-break and the arithmetic settle it" },
    { title: `P(correct) per field against its family threshold: ${passCount} of ${CRITICAL} pass` },
  ],
  groups: [
    { id: "g-invoice", title: "Supplier invoice (scan, 2 pages)", tone: "neutral", x: 8, y: 28, w: 308, h: 370 },
  ],
  shapes: [
    // Step 1: the scan.
    region("inv-supplier", 56, 44, `${INVOICE.supplier} Ltd`, `VAT ${rows[2].primary}`),
    region("inv-number", 108, 34, `Invoice ${INVOICE.number}`, undefined, { w: 140 }),
    region("inv-date", 108, 34, "Date 03/11/2026", undefined, { x: 164, w: 140 }),
    region("inv-billto", 150, 34, `Bill to Brightpost UK · ${INVOICE.po}`),
    region("inv-lines", 192, 58, lineText),
    region(
      "inv-totals",
      258,
      58,
      `Net ${money(INVOICE.net)} · VAT 20% ${money(INVOICE.vat)}\nTotal 1,4▒8.00`,
      "one digit of the total is faint",
      { highlight: true }
    ),
    region("inv-page2", 324, 30, "Page 2 arrived upside down: de-rotated"),
    text("inv-note", 20, 362, 284, "No text layer: route B (scan of print)", 1),

    // Step 2: the two readers.
    text("h-field", X.field, 44, COL.field, "field", 2, true),
    text("h-primary", X.primary, 44, COL.primary, "Primary VLM", 2, true),
    text("h-second", X.second, 44, COL.second, "Second: Textract", 2, true),
    ...rows.flatMap((r, i): LayoutShape[] => {
      const disputed = isGross(r.field);
      const out: LayoutShape[] = [
        text(`f${i}-name`, X.field, ROW_Y(i) + 4, COL.field, r.field, 2, true),
        cell(
          `f${i}-primary`,
          X.primary,
          ROW_Y(i),
          COL.primary,
          disputed ? `${r.primary} · w${INVOICE_FIELDS.word}` : r.primary,
          disputed ? GENAI_TONE.failure : GENAI_TONE.model,
          2,
          !disputed
        ),
        cell(`f${i}-second`, X.second, ROW_Y(i), COL.second, r.second, GENAI_TONE.model, 2),
      ];
      return out;
    }),
    text(
      "iou",
      X.primary,
      BELOW,
      COL.primary + COL.second + GAP,
      `Word ${INVOICE_FIELDS.word} at confidence ${INVOICE_FIELDS.wordConfidence}; boxes overlap, IoU ${INVOICE_FIELDS.iou.toFixed(2)}`,
      2
    ),

    // Step 3: the tie-break for the disputed field; rules on every field.
    text("h-check", X.check, 44, COL.check, "tie-break, rules", 3, true),
    ...rows.map((r, i) =>
      isGross(r.field)
        ? cell(
            `f${i}-check`,
            X.check,
            ROW_Y(i),
            COL.check,
            `tie ${INVOICE_FIELDS.tieBreak}`,
            GENAI_TONE.check,
            3,
            false
          )
        : cell(`f${i}-check`, X.check, ROW_Y(i), COL.check, "rules ✓", GENAI_TONE.check, 3)
    ),
    text(
      "rules-1",
      40,
      BELOW + 24,
      520,
      `${INVOICE.lines.map((l) => money(l.quantity * l.unitPrice)).join(" + ")} = ${money(INVOICE.net)} ✓ · 20% VAT = ${money(INVOICE.vat)} ✓`,
      3
    ),
    text(
      "rules-2",
      40,
      BELOW + 44,
      520,
      `${money(INVOICE.net)} + ${money(INVOICE.vat)} = ${money(INVOICE.total)} ✓ (${INVOICE.misread} would fail)`,
      3,
      true
    ),

    // Step 4: P(correct) against each family's threshold; the decision.
    text("h-score", X.score, 44, COL.score, "P(correct) ≥ bar", 4, true),
    ...rows.map((r, i) =>
      cell(
        `f${i}-score`,
        X.score,
        ROW_Y(i),
        COL.score,
        `${r.pCorrect.toFixed(4)} ≥ ${r.threshold.toFixed(3)}`,
        r.pCorrect >= r.threshold ? GENAI_TONE.check : GENAI_TONE.failure,
        4,
        !isGross(r.field)
      )
    ),
    {
      id: "decision",
      type: "box",
      x: 600,
      y: BELOW + 22,
      w: 266,
      h: 48,
      label: `${passCount} of ${CRITICAL} critical fields pass`,
      sub: "auto-approved; the outbox posts it once",
      tone: GENAI_TONE.model,
      fill: "pastel",
      step: 4,
    },
    text(
      "illustrative",
      40,
      BELOW + 72,
      520,
      "P(correct) values are illustrative; thresholds per field family.",
      4,
      true
    ),
  ],
};

export default spec;
