import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// A two-model cascade, for "Routing and using more than one model" on the Choosing a Model page. Every request goes
// to a cheap model first; a check (the small model's confidence, a verifier, or a scoring model) accepts the answer
// or escalates the request to a large model. FrugalGPT (Chen et al., 2023, arXiv 2305.05176, §3) describes this
// "LLM cascade": a scoring function rates each answer and the next model is called only when the score is below a
// threshold; their scorer was a small DistilBERT regressor.
//
// Cost working, with the same ILLUSTRATIVE prices and workload as choose-monthly-cost (not real quotes):
//   per request: small tier $0.0018 (2,000 in × $0.50 + 400 out × $2, per million); large tier $0.018
//   (2,000 × $5 + 400 × $20, per million).
//   Cascade with 20% escalated: every request pays the small model, escalated ones pay the large model too:
//     0.0018 + 0.20 × 0.018 = 0.0018 + 0.0036 = $0.0054 per request
//     per month (50,000 a day × 30 = 1,500,000 requests) = $8,100, against $27,000 for large-only
//     → 0.0054 / 0.018 = 30% of large-only, 70% less.
//   Compare the up-front router in choose-monthly-cost ($0.00504): a cascade pays the small model again on the 20% it
//   escalates (0.2 × 0.0018 = $0.00036 more per request) but decides after seeing an answer.
//   The check's own cost is left out (a log-probability check is nearly free; an LLM verifier is not).
//
// Scale for the bars: $0.018 → 480 px (26,667 px per dollar): small 48 px, escalated share 96 px, total 144 px.
// Tones: small model blue, large model violet, check orange, answer green, requests neutral.

const SMALL = (2_000 * 0.5 + 400 * 2) / 1e6; // 0.0018
const LARGE = (2_000 * 5 + 400 * 20) / 1e6; // 0.018
const ESCALATE = 0.2;
const CASCADE = SMALL + ESCALATE * LARGE; // 0.0054
const MONTH_REQ = 50_000 * 30;
const pct = Math.round((CASCADE / LARGE) * 100); // 30
if (pct !== 30) throw new Error(`cascade should be 30% of large-only, got ${pct}%`);

const usd4 = (n: number) => `$${(Math.round(n * 1e4) / 1e4).toFixed(4)}`;
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const H = 44;
const W = 150;
const ROW1 = 72;
const ROW2 = 214;
const X = { req: 16, small: 206, check: 396, answer: 686 };

const box = (
  id: string,
  x: number,
  y: number,
  label: string,
  tone: LayoutTone,
  step: number,
  sub?: string,
  quiet?: boolean
): LayoutShape => ({ id, type: "box", x, y, w: W, h: H, label, sub, tone, fill: "pastel", step, quiet });

const arrow = (id: string, from: string, to: string, step: number, label?: string, extra: Partial<LayoutShape> = {}) =>
  ({ id, type: "arrow", x: 0, y: 0, from, to, label, step, tone: "neutral", quiet: true, ...extra }) as LayoutShape;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral"
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: true });

const BAR_X = 210;
const BAR_MAX = 480;
const PX = BAR_MAX / LARGE;
const BAR_H = 30;
const B1 = 356;
const B2 = B1 + 46;
const wSmall = Math.round(SMALL * PX);
const wEsc = Math.round(ESCALATE * LARGE * PX);

const CASCADE_SUM = `${usd4(SMALL)} + 0.2 × ${usd4(LARGE)} = ${usd4(CASCADE)} · ${usd(CASCADE * MONTH_REQ)} / mo · ${100 - pct}% less`;
/** A text box as wide as its longest line (about 6.2 px per character), so a centred label reads left-aligned. */
const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 6.2) + 8;

const shapes: LayoutShape[] = [
  // ── Step 1: every request goes to the small model ──
  box("req", X.req, ROW1, "Requests", "neutral", 1, "100% of traffic", true),
  box("small", X.small, ROW1, "Small model", "blue", 1, "answers everything first"),
  arrow("req>small", "req", "small", 1),

  // ── Step 2: the check accepts most answers ──
  box("check", X.check, ROW1, "Confidence check", "orange", 2, "score ≥ threshold?"),
  box("answer", X.answer, ROW1, "Answer to user", "green", 2, undefined, true),
  arrow("small>check", "small", "check", 2),
  arrow("check>answer", "check", "answer", 2, `${Math.round((1 - ESCALATE) * 100)}% accept`),
  text(
    "check-note",
    X.check - 70,
    ROW1 - 54,
    290,
    36,
    "The check can be the model's own token\nprobabilities, a verifier, or a small scorer.",
    2
  ),

  // ── Step 3: the rest escalate to the large model ──
  box("large", X.check, ROW2, "Large model", "violet", 3, "sees the hard 20%"),
  arrow("check>large", "check", "large", 3, `${Math.round(ESCALATE * 100)}% escalate`),
  arrow("large>answer", "large", "answer", 3, undefined, { via: [[X.answer + W / 2, ROW2 + H / 2]] }),
  text(
    "esc-note",
    X.req,
    ROW2 - 4,
    360,
    52,
    "Escalated requests pay for both models and\nwait for both: the cascade is slower for the\nhardest questions.",
    3
  ),

  // ── Step 4: blended cost, drawn to scale ──
  text("bar-large-name", 24, B1, 176, BAR_H, "Large model only", 4),
  {
    id: "bar-large",
    type: "cell",
    x: BAR_X,
    y: B1,
    w: BAR_MAX,
    h: BAR_H,
    tone: "violet",
    fill: "pastel",
    label: `${usd4(LARGE)} per request`,
    step: 4,
    quiet: true,
  },
  text("bar-large-month", BAR_X + BAR_MAX + 8, B1, 110, BAR_H, `${usd(LARGE * MONTH_REQ)} / mo`, 4),
  { ...text("bar-cascade-name", 24, B2, 176, BAR_H, "Cascade, 20% escalated", 4, "green"), quiet: undefined },
  {
    id: "bar-small",
    type: "cell",
    x: BAR_X,
    y: B2,
    w: wSmall,
    h: BAR_H,
    tone: "blue",
    fill: "pastel",
    label: "small",
    step: 4,
    quiet: true,
  },
  {
    id: "bar-esc",
    type: "cell",
    x: BAR_X + wSmall,
    y: B2,
    w: wEsc,
    h: BAR_H,
    tone: "violet",
    fill: "pastel",
    label: "20% × large",
    step: 4,
    quiet: true,
  },
  text("bar-cascade-sum", BAR_X + wSmall + wEsc + 8, B2, hug(CASCADE_SUM), BAR_H, CASCADE_SUM, 4, "green"),
  text(
    "bar-foot",
    24,
    B2 + BAR_H + 26,
    812,
    20,
    "Illustrative prices and workload from the cost chart: 50,000 requests a day, 2,000 input + 400 output tokens.",
    4
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A two-model cascade and its blended cost",
  width: 860,
  height: B2 + BAR_H + 26 + 20 + 14,
  groups: [
    {
      id: "g-cost",
      title: "Blended cost per request, to scale",
      tone: "neutral",
      x: 12,
      y: B1 - 36,
      w: 836,
      h: B2 + BAR_H + 16 - (B1 - 36),
    },
  ],
  steps: [
    { title: "Every request goes to the small model first" },
    { title: "A check accepts the answer when the score clears a threshold" },
    { title: "The rest escalate to the large model" },
    { title: "Blended cost: every request pays the small model, 20% also pay the large one" },
  ],
  shapes,
};

export default spec;
