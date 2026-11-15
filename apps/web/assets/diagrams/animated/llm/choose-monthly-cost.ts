import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// A worked monthly cost estimate, for "Capability, cost, latency and context trade-offs" on the Choosing a Model page.
// The prices are ILLUSTRATIVE round numbers for two tiers, not quotes from any provider; the formula is what matters:
//
//   cost per request = input tokens × input price / 1,000,000 + output tokens × output price / 1,000,000
//   cost per month   = requests per day × 30 × cost per request
//
// Workload (our example): 50,000 requests a day, 30 days, 2,000 input and 400 output tokens per request.
// Illustrative prices per million tokens: large tier $5 in / $20 out; small tier $0.50 in / $2 out (10× cheaper).
//
// Working:
//   Large: input 2,000 × 5 / 1e6 = $0.0100; output 400 × 20 / 1e6 = $0.0080; per request $0.0180
//          per month 50,000 × 30 × 0.0180 = $27,000 (input $15,000 + output $12,000)
//   Small: input 2,000 × 0.5 / 1e6 = $0.0010; output 400 × 2 / 1e6 = $0.0008; per request $0.0018
//          per month 1,500,000 × 0.0018 = $2,700 (input $1,500 + output $1,200)
//   Router, 80% small and 20% large (each request goes to one model, decided up front):
//          per request 0.8 × 0.0018 + 0.2 × 0.0180 = 0.00144 + 0.00360 = $0.00504
//          per month 1,500,000 × 0.00504 = $7,560 (input 0.8 × 1,500 + 0.2 × 15,000 = $4,200;
//          output 0.8 × 1,200 + 0.2 × 12,000 = $3,360) → 7,560 / 27,000 = 28% of large-only, 72% less.
//   The router's own cost (a small classifier) is left out; the cascade diagram shows the escalate-after variant.
//
// Scale: $27,000 → 520 px (0.019259 px per dollar). Input cost blue, output cost violet.

const REQ_PER_DAY = 50_000;
const DAYS = 30;
const IN_TOK = 2_000;
const OUT_TOK = 400;
const M = 1_000_000;

interface Tier {
  inPrice: number;
  outPrice: number;
}
const LARGE: Tier = { inPrice: 5, outPrice: 20 };
const SMALL: Tier = { inPrice: 0.5, outPrice: 2 };
const SHARE_LARGE = 0.2;

const perReq = (t: Tier) => ({ input: (IN_TOK * t.inPrice) / M, output: (OUT_TOK * t.outPrice) / M });
const monthly = (x: { input: number; output: number }) => ({
  input: REQ_PER_DAY * DAYS * x.input,
  output: REQ_PER_DAY * DAYS * x.output,
});
const mix = (a: { input: number; output: number }, b: { input: number; output: number }, shareB: number) => ({
  input: (1 - shareB) * a.input + shareB * b.input,
  output: (1 - shareB) * a.output + shareB * b.output,
});

const L = perReq(LARGE);
const S = perReq(SMALL);
const R = mix(S, L, SHARE_LARGE);

interface Row {
  id: string;
  name: string;
  sub: string;
  req: { input: number; output: number };
  tone: LayoutTone;
}
const ROWS: Row[] = [
  { id: "large", name: "Large tier only", sub: "$5 in · $20 out", req: L, tone: "neutral" },
  { id: "small", name: "Small tier only", sub: "$0.50 in · $2 out", req: S, tone: "neutral" },
  { id: "router", name: "Router: 80% small", sub: "20% sent to large", req: R, tone: "green" },
];

const total = (x: { input: number; output: number }) => x.input + x.output;
const LARGE_MONTH = total(monthly(L)); // 27,000
const RATIO = total(monthly(R)) / LARGE_MONTH; // 0.28
if (Math.round(LARGE_MONTH) !== 27_000) throw new Error(`large tier should cost $27,000, got ${LARGE_MONTH}`);

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const usdReq = (n: number) => `$${(Math.round(n * 1e5) / 1e5).toString()}`;

// ── Grid ───────────────────────────────────────────────────────────────────────────────────────────────────────
const NAME_X = 24;
const NAME_W = 170;
const BAR_X = 206;
const BAR_MAX = 520;
const BAR_H = 40;
const ROW_STEP = 72;
const FIRST = 150;
const pxPer = BAR_MAX / LARGE_MONTH;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone = "neutral"
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone });

/** A text box as wide as its longest line (about 6.2 px per character), so a centred label reads left-aligned. */
const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 6.2) + 8;

const shapes: LayoutShape[] = [
  text(
    "workload",
    24,
    16,
    832,
    20,
    `Example workload: ${REQ_PER_DAY.toLocaleString("en-US")} requests a day × ${DAYS} days, ` +
      `${IN_TOK.toLocaleString("en-US")} input + ${OUT_TOK} output tokens each`
  ),
  text(
    "prices",
    24,
    40,
    832,
    20,
    "Illustrative prices per million tokens, not quotes: large $5 in / $20 out · small $0.50 in / $2 out",
    "red"
  ),
  text(
    "formula",
    24,
    70,
    832,
    20,
    "Monthly cost = requests per day × 30 × (input tokens × input price + output tokens × output price) ÷ 1,000,000",
    "neutral"
  ),
];

ROWS.forEach((r, i) => {
  const y = FIRST + i * ROW_STEP;
  const m = monthly(r.req);
  const wIn = Math.round(m.input * pxPer * 10) / 10;
  const wOut = Math.round(m.output * pxPer * 10) / 10;
  shapes.push(
    {
      id: `${r.id}-name`,
      type: "text",
      x: NAME_X,
      y: y - 2,
      w: NAME_W,
      h: 24,
      label: r.name,
      tone: r.tone,
    },
    text(`${r.id}-sub`, NAME_X, y + 20, NAME_W, 20, r.sub),
    {
      id: `${r.id}-in`,
      type: "cell",
      x: BAR_X,
      y,
      w: wIn,
      h: BAR_H,
      tone: "blue",
      fill: "pastel",
      label: wIn >= 120 ? `input ${usd(m.input)}` : undefined,
      quiet: true,
    },
    {
      id: `${r.id}-out`,
      type: "cell",
      x: BAR_X + wIn,
      y,
      w: wOut,
      h: BAR_H,
      tone: "violet",
      fill: "pastel",
      label: wOut >= 120 ? `output ${usd(m.output)}` : undefined,
      quiet: true,
    }
  );
  const valueLabel = `${usd(total(m))} / month\n${usdReq(total(r.req))} per request`;
  shapes.push(text(`${r.id}-value`, BAR_X + wIn + wOut + 8, y, hug(valueLabel), BAR_H, valueLabel, r.tone));
});

// Legend under the bars.
const LEG_Y = FIRST + ROWS.length * ROW_STEP - 14;
shapes.push(
  { id: "leg-in", type: "cell", x: BAR_X, y: LEG_Y, w: 16, h: 16, tone: "blue", fill: "pastel" },
  text("leg-in-label", BAR_X + 20, LEG_Y - 2, 90, 20, "input tokens"),
  { id: "leg-out", type: "cell", x: BAR_X + 124, y: LEG_Y, w: 16, h: 16, tone: "violet", fill: "pastel" },
  text("leg-out-label", BAR_X + 144, LEG_Y - 2, 100, 20, "output tokens")
);

shapes.push(
  text(
    "note",
    24,
    LEG_Y + 44,
    832,
    36,
    `Routing 20% of traffic to the large tier costs ${Math.round(RATIO * 100)}% of large-only ` +
      `(${100 - Math.round(RATIO * 100)}% less). Whether that is acceptable depends on the quality\n` +
      "of the 80% the small model answers, which only your own eval set can tell you.",
    "neutral"
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Monthly cost: two price tiers and a routed mix",
  width: 880,
  height: LEG_Y + 44 + 36 + 16,
  groups: [
    {
      id: "g-bars",
      title: "Monthly cost, drawn to scale",
      tone: "neutral",
      x: 12,
      y: FIRST - 34,
      w: 856,
      h: ROWS.length * ROW_STEP + 44,
    },
  ],
  shapes,
};

export default spec;
