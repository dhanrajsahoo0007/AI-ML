import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { COST, ROUTER, SCENARIOS, STEADY, UNIT } from "@/components/diagrams/presets/gcase-docextract";

// Step 4 of the document-extraction case study (design sheet §8 step 4, §10.2, §5): the difficulty router. Cheap
// signals (milliseconds, no model) send each invoice down one of three routes, each with its own pair of readers and
// its own cost. Numbers from presets/gcase-docextract.ts:
//   mix SCENARIOS.steady.mix: A 55%, B 40%, C 5%; signals ROUTER.templateMinInvoices = 5,
//   ROUTER.minMeanOcrConfidence = 0.80.
//   cost per invoice (2 pages) COST.path: common 0.0040 (OCR 0.0015 + render 0.0002 + classifier 0.0003 a page, × 2)
//     A  + small model on words 0.00127                    = 0.0053 (0.0026 a page)
//     B  + small VLM 0.00183 + Textract 2 × 0.01           = 0.0258 (0.0129 a page); + mid tie-break 0.0174 = 0.0432
//     C  + mid VLM 0.0401 + Textract 0.02                  = 0.0641 (0.0320 a page)
//   per invoice 0.55 × 0.0053 + 0.40 × 0.0258 + STEADY.tieBreak (8.0% of invoices) × 0.0174 + 0.05 × 0.0641
//     = COST.perInvoice ≈ 0.0178 USD (≈ 0.0089 a page); the second reader is COST.secondShare ≈ 50% of it.
// Steps: 1 the signals and the router · 2 three routes and their readers · 3 the cost of each and the blend.
// Layout (880 wide): signals x 16 (220 wide, five 34 px cells 62 apart), router x 268 (96 wide, as tall as the signal
// column, so every signal arrow is level), routes x 400 (200 wide), readers x 636 (228 wide); route rows at y 60 | 180 |
// 300 (60 tall); cost lines under each reader card; two footer lines. "∥" renders too small in a box, so the cards say
// "and".
// Colours (GENAI_TONE): signals blue (page data), the router and routes A and B lime (a router decision), route C
// orange (a person always decides), readers green (model calls), cost text neutral.

const SIG = { x: 16, w: 220, h: 34 } as const;
const RT = { x: 268, w: 96 } as const;
const ROUTE = { x: 400, w: 200, h: 60 } as const;
const READ = { x: 636, w: 228, h: 60 } as const;
const ROW_Y = [60, 180, 300] as const;
const FOOT_Y = 400;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  step: number
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step });
const arrow = (id: string, from: string, to: string, step: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
});
/** A level arrow from x1 to x2 at y (free, so it never aims at a box's centre). */
const level = (id: string, x1: number, x2: number, y: number, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: x1,
  y,
  w: x2 - x1,
  h: 0,
  step,
});
const text = (id: string, x: number, y: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: "neutral",
  step,
});

const mix = SCENARIOS.steady.mix;
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const usd = (v: number) => v.toFixed(4);

const signals = [
  "Text layer present?",
  `Known template (≥ ${ROUTER.templateMinInvoices} invoices)?`,
  "Handwriting on a critical field?",
  `Mean OCR confidence < ${ROUTER.minMeanOcrConfidence.toFixed(2)}?`,
  "Language Textract reads?",
];
const SIG_Y = (i: number) => 64 + i * 62;

const routes = [
  {
    id: "a",
    label: `A · ${pct(mix.A)} of invoices`,
    sub: "born-digital, known template",
    tone: GENAI_TONE.rank,
    reader: "Small model on text words",
    readerSub: "second: template anchors",
    cost: `${usd(COST.path.A)} USD an invoice (${usd(COST.perPage.A)} a page)`,
  },
  {
    id: "b",
    label: `B · ${pct(mix.B)}`,
    sub: "novel layout, or a scan of print",
    tone: GENAI_TONE.rank,
    reader: "Small VLM: image + words",
    readerSub: "and Textract on its own OCR",
    cost: `${usd(COST.path.B)} USD; ${usd(COST.path.BTie)} with a tie-break`,
  },
  {
    id: "c",
    label: `C · ${pct(mix.C)}`,
    sub: "handwriting, degraded, language",
    tone: GENAI_TONE.user,
    reader: "Mid VLM and Textract",
    readerSub: "pre-fills a review task",
    cost: `${usd(COST.path.C)} USD; always reviewed`,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The difficulty router: cheap signals pick one of three routes, each with its own readers and cost",
  width: 880,
  height: FOOT_Y + 50,
  steps: [
    { title: "Cheap signals, read in milliseconds" },
    { title: "Three routes, each with two independent readers" },
    { title: `Cost per route, blended to ${usd(COST.perInvoice)} USD an invoice` },
  ],
  shapes: [
    { ...text("h-sig", SIG.x, 24, SIG.w, "Signals (no model)", 1), quiet: true },
    { ...text("h-route", ROUTE.x, 24, ROUTE.w, "Route", 2), quiet: true },
    { ...text("h-read", READ.x, 24, READ.w, "Primary and second reader", 2), quiet: true },

    ...signals.map((s, i) => ({
      id: `sig-${i}`,
      type: "cell" as const,
      x: SIG.x,
      y: SIG_Y(i),
      w: SIG.w,
      h: SIG.h,
      label: s,
      tone: GENAI_TONE.data,
      fill: "pastel" as const,
      step: 1,
    })),
    box(
      "router",
      RT.x,
      SIG_Y(0),
      RT.w,
      SIG_Y(signals.length - 1) + SIG.h - SIG_Y(0),
      "Router",
      "rules",
      GENAI_TONE.rank,
      1
    ),
    ...signals.map((_, i) => level(`in-${i}`, SIG.x + SIG.w + 4, RT.x - 4, SIG_Y(i) + SIG.h / 2, 1)),

    ...routes.flatMap((r, i): LayoutShape[] => [
      box(`route-${r.id}`, ROUTE.x, ROW_Y[i], ROUTE.w, ROUTE.h, r.label, r.sub, r.tone, 2),
      level(`to-${r.id}`, RT.x + RT.w + 4, ROUTE.x - 4, ROW_Y[i] + ROUTE.h / 2, 2),
      box(`read-${r.id}`, READ.x, ROW_Y[i], READ.w, READ.h, r.reader, r.readerSub, GENAI_TONE.model, 2),
      arrow(`use-${r.id}`, `route-${r.id}`, `read-${r.id}`, 2),
      text(`cost-${r.id}`, READ.x - 30, ROW_Y[i] + READ.h + 6, READ.w + 30, r.cost, 3),
    ]),

    text(
      "foot-1",
      16,
      FOOT_Y,
      848,
      `Per invoice: ${mix.A.toFixed(2)} × ${usd(COST.path.A)} + ${mix.B.toFixed(2)} × ${usd(COST.path.B)} + ${pct(STEADY.tieBreak, 1)} tie-breaks × ${usd(UNIT.tieBreak)} + ${mix.C.toFixed(2)} × ${usd(COST.path.C)} ≈ ${usd(COST.perInvoice)} USD (${usd(COST.perInvoicePage)} a page).`,
      3
    ),
    text(
      "foot-2",
      16,
      FOOT_Y + 22,
      848,
      `The second reader is ${pct(COST.secondShare)} of it. Every price is a November 2026 list price; the mix is illustrative.`,
      3
    ),
  ],
};

export default spec;
