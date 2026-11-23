import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { LATENCY as L, TARGETS } from "@/components/diagrams/presets/gcase-docextract";
import { PROD_TONE, n, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";

// The document-extraction latency budget, p50 per path (design sheet §12). Every stage is LATENCY in
// presets/gcase-docextract.ts (illustrative log-normal fits: no vendor publishes extraction latency; decode small 150
// tokens a second at p50, mid 60):
//   A (digital, template): ingest 300 + render 500 + classify 600 + small model on words 9,167 (500 + 1,300 tokens at
//     150 a second) + rules 400 + score 20 + outbox 500 = L.A ≈ 11,487 ms (p95 21,450). OCR runs beside it, off the path.
//   B (scan) with a tie-break: ingest and render 800 + OCR on 2 pages in parallel L.ocr2 ≈ 2,076 (the slower of two
//     1,500 ms pages: maxOf) + classify 600 + small VLM 9,667 ∥ Textract 4,000 → the pair ends at L.pairB ≈ 9,975
//     (maxOf: Textract's long tail) + image-only tie-break 4,000 + rules 400 + score 20 + outbox 500 = L.BscanTie ≈
//     18,371 (p95 34,413). Without the tie-break (92% of B invoices): L.Bscan ≈ 14,371 (p95 27,663).
//   C (pre-fill): 800 + 2,076 + 600 + mid VLM 23,167 ∥ Textract → L.pairC ≈ 23,199 + 400 + 20 = L.CPrefill ≈ 27,095 to
//     a review task (p95 45,307).
//   Receipt: ingest 300 + render 300 + OCR 1,500 + classify 600 + small VLM 2,800 (300 tokens) + card match 100 + score
//     20 + notify 500 = L.receipt = 6,120 (p95 14,250).
//   N3 (TARGETS): straight-through in the outbox ≤ 2 min p50 and ≤ 10 min p95; the slowest auto-posting path is 34 s at
//   p95. Receipts ≤ 30 s p95: 14.3 s. The p95 per path is the sum of stage p95s, a conservative estimate.
// Steps: 1 A · 2 B with the tie-break (the max-of-2 OCR and the parallel pair noted on their rows) · 3 C to a review task · 4 a
// receipt.
// Layout (880 wide): waterfall() from presets/production.ts four times, one msPerPx fitted to the longest path (C), so
// bar lengths compare across paths; label column 176 px, rows 22 px; a heading over each; two footer lines.
// Rules and score share a row (420 ms), and no dashed total line is drawn: a total line ran through the duration
// text of the short rows before it, so each heading carries the p50 and p95 totals instead.
// Colours: ingest, render and score neutral; OCR blue (page data); classifier, extraction models and the tie-break green
// (model calls); Textract green; rules lime (checks); the outbox and card match teal (actions).

const X = 12;
const LABEL_W = 176;
const r = (v: number) => Math.round(v);
const sec = (ms: number) => `${(ms / 1_000).toFixed(1)} s`;

/** A path as spans: [id, label, start, duration, tone, note?]. */
type Row = [string, string, number, number, LayoutTone, string?];
const spans = (rows: Row[], step: number): WaterfallSpan[] =>
  rows.map(([id, label, startMs, durationMs, tone, note]) => ({
    id,
    label,
    startMs: r(startMs),
    durationMs: r(durationMs),
    tone,
    step,
    note,
  }));

const front = L.ingest.p50 + L.render.p50; // 800
const MODEL = GENAI_TONE.model;
const INFRA = PROD_TONE.infra;

// A
const aExtract = front + L.classify.p50;
const aRules = aExtract + L.routeA.p50;
const pathA = spans(
  [
    ["front", "Ingest, render", 0, front, INFRA],
    ["classify", "Classify, split", front, L.classify.p50, MODEL],
    ["extract", "Small model, words", aExtract, L.routeA.p50, MODEL],
    ["rules", "Rules, score", aRules, L.validate.p50 + L.score.p50, GENAI_TONE.check],
    ["post", "Outbox write", aRules + L.validate.p50 + L.score.p50, L.post.p50, GENAI_TONE.tool],
  ],
  1
);

// B with the tie-break
const bClassify = front + L.ocr2.p50;
const bPair = bClassify + L.classify.p50;
const bTie = bPair + L.pairB.p50;
const bRules = bTie + L.tieBreak.p50;
const pathB = spans(
  [
    ["front", "Ingest, render", 0, front, INFRA],
    ["ocr", "OCR, 2 pages", front, L.ocr2.p50, GENAI_TONE.data, `slower of two ${n(L.ocrPage.p50)} ms pages`],
    ["classify", "Classify, split", bClassify, L.classify.p50, MODEL],
    ["vlm", "Small VLM, image + words", bPair, L.smallVlm.p50, MODEL],
    ["second", "Textract, own OCR", bPair, L.second.p50, MODEL, `in parallel; pair ends at ${n(r(L.pairB.p50))}`],
    ["tie", "Tie-break (8%)", bTie, L.tieBreak.p50, MODEL],
    ["rules", "Rules, score", bRules, L.validate.p50 + L.score.p50, GENAI_TONE.check],
    ["post", "Outbox write", bRules + L.validate.p50 + L.score.p50, L.post.p50, GENAI_TONE.tool],
  ],
  2
);

// C to a review task
const cPair = bPair;
const cRules = cPair + L.pairC.p50;
const pathC = spans(
  [
    ["front", "Ingest, render", 0, front, INFRA],
    ["ocr", "OCR, 2 pages", front, L.ocr2.p50, GENAI_TONE.data],
    ["classify", "Classify, split", bClassify, L.classify.p50, MODEL],
    ["vlm", "Mid VLM pre-fill", cPair, L.midVlm.p50, MODEL],
    ["second", "Textract, own OCR", cPair, L.second.p50, MODEL, "in parallel"],
    ["rules", "Rules, score", cRules, L.validate.p50 + L.score.p50, GENAI_TONE.check],
  ],
  3
);

// A receipt
const rFront = L.ingest.p50 + 300;
const rClassify = rFront + L.ocrPage.p50;
const rVlm = rClassify + L.classify.p50;
const rMatch = rVlm + L.receiptVlm.p50;
const pathR = spans(
  [
    ["front", "Ingest, render", 0, rFront, INFRA],
    ["ocr", "OCR, 1 photo", rFront, L.ocrPage.p50, GENAI_TONE.data],
    ["classify", "Classify", rClassify, L.classify.p50, MODEL],
    ["vlm", "Small VLM, 300 tokens", rVlm, L.receiptVlm.p50, MODEL],
    ["match", "Card match, score", rMatch, 100 + L.score.p50, GENAI_TONE.tool],
    ["notify", "Notify the employee", rMatch + 100 + L.score.p50, L.post.p50, GENAI_TONE.tool],
  ],
  4
);

const scale = waterfallSize([...pathA, ...pathB, ...pathC, ...pathR], {
  width: 856,
  labelW: LABEL_W,
  total: { ms: L.CPrefill.p50 },
});
const common = { msPerPx: scale.msPerPx, labelW: LABEL_W, tickMs: 5_000, rowH: 22, barH: 14 };

const head = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const blocks = [
  { id: "a", spans: pathA, step: 1, total: L.A, head: "A · digital, known template, OCR off the path" },
  { id: "b", spans: pathB, step: 2, total: L.BscanTie, head: "B · scan, with a tie-break" },
  { id: "c", spans: pathC, step: 3, total: L.CPrefill, head: "C · pre-fill a review task" },
  { id: "r", spans: pathR, step: 4, total: L.receipt, head: "Receipt" },
];

const shapes: LayoutShape[] = [];
let y = 4;
for (const b of blocks) {
  const extra = b.id === "b" ? ` (no tie-break ${n(r(L.Bscan.p50))} / ${n(r(L.Bscan.p95))})` : "";
  shapes.push(head(`h-${b.id}`, y, `${b.head}: ${n(r(b.total.p50))} ms p50, ${n(r(b.total.p95))} p95${extra}`, b.step));
  const top = y + 24;
  const marks: { ms: number; label: string }[] = [];
  shapes.push(
    ...waterfall(b.id, X, top, b.spans, {
      ...common,
      step: b.step,
      total: false,
      marks,
    })
  );
  y = top + waterfallSize(b.spans, { ...common, total: false, marks }).height + 14;
}

shapes.push(
  head(
    "foot-1",
    y,
    `N3: straight-through in the outbox ≤ ${TARGETS.stpP50Ms / 60_000} min p50, ≤ ${TARGETS.stpP95Ms / 60_000} min p95 (slowest path ${sec(L.BscanTie.p95)} p95); receipts ≤ ${sec(TARGETS.receiptP95Ms)} p95 (${sec(L.receipt.p95)}).`,
    4
  ),
  head(
    "foot-2",
    y + 20,
    "Stage times are illustrative fits; a path's p95 adds its stage p95s, so it is conservative.",
    4
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Latency per path, p50: 11.5 s digital, 18.4 s for a disputed scan, 27.1 s to a pre-filled review task",
  width: 880,
  height: y + 46,
  steps: [
    { title: `A, digital with a known template: ${sec(L.A.p50)}` },
    { title: `B, a scan with a tie-break: ${sec(L.BscanTie.p50)}` },
    { title: `C, a pre-filled review task: ${sec(L.CPrefill.p50)}` },
    { title: `A receipt: ${sec(L.receipt.p50)}` },
  ],
  shapes,
};

export default spec;
