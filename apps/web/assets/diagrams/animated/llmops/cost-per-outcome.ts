import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { OUTCOME } from "@/components/diagrams/presets/production-observe";

// Cost per outcome, not per request (cost-tracking-attribution, Deep dive). Three steps, each adding a row; each row
// has its own scale (the longest bar is 450 px). Option A is the large model; option B is a model a tenth of the price.
// All numbers illustrative; working in presets/production-observe.ts OUTCOME:
//   125,000 tickets a day, 200,000 requests (1.6 per ticket). A: 0.0069 a request, resolves 70 %. B: 0.00069, resolves
//   55 %. A ticket the assistant does not resolve goes to a person at 4 dollars.
//   Row 1, per request: A 0.0069; B 0.00069 (10 times cheaper).
//   Row 2, per resolved ticket: A 1,380 / 87,500 = 0.0158; B 138 / 68,750 = 0.0020 (7.9 times cheaper).
//   Row 3, per ticket, people included: A (1,380 + 37,500 × 4) / 125,000 = 0.011 + 1.200 = 1.211;
//     B (138 + 56,250 × 4) / 125,000 = 0.0011 + 1.800 = 1.801. B costs 1.801 / 1.211 = 1.49 times A, 49 % more.
// Layout (880 x 350): rows at y 6, 118 and 230 (header, then two bars h 26 at y + 28 and y + 60, x 150); option labels at x 20
// (w 120); assumptions line at y 330.
// Colours (PROD_TONE): model spend green (the model), the cost of people neutral, the last note red (the cheaper model
// costs more). Two tones plus neutral.

const BAR_X = 150;
const BAR_W = 450;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step });

const usd = (v: number, d: number) => `$${v.toFixed(d)}`;

interface Bar {
  llm: number;
  other: number;
  label: string;
}
const A = OUTCOME.a;
const B = OUTCOME.b;

const rows: { step: number; head: string; a: Bar; b: Bar; note?: string }[] = [
  {
    step: 1,
    head: "Per request: the small model is 10 times cheaper",
    a: { llm: A.perRequest, other: 0, label: usd(A.perRequest, 4) },
    b: { llm: B.perRequest, other: 0, label: usd(B.perRequest, 5) },
  },
  {
    step: 2,
    head: "Per resolved ticket (spend ÷ tickets the assistant resolved): still about 8 times cheaper",
    a: { llm: A.perResolved, other: 0, label: usd(A.perResolved, 4) },
    b: { llm: B.perResolved, other: 0, label: usd(B.perResolved, 4) },
  },
  {
    step: 3,
    head: "Per ticket, counting the people who finish what the assistant cannot",
    a: {
      llm: A.llmPerTicket,
      other: A.humanPerTicket,
      label: `${usd(A.allIn, 2)} (people ${usd(A.humanPerTicket, 2)})`,
    },
    b: {
      llm: B.llmPerTicket,
      other: B.humanPerTicket,
      label: `${usd(B.allIn, 2)} (people ${usd(B.humanPerTicket, 2)})`,
    },
    note: `The small model costs ${Math.round((B.allIn / A.allIn - 1) * 100)} % more per ticket`,
  },
];

const shapes: LayoutShape[] = [];
rows.forEach((r, i) => {
  const y = 6 + i * 112;
  const max = Math.max(r.a.llm + r.a.other, r.b.llm + r.b.other);
  const px = (v: number) => (v / max) * BAR_W;
  shapes.push(text(`head-${r.step}`, 20, y, 840, r.head, r.step));
  (
    [
      ["a", "A: large model", r.a, 28],
      ["b", "B: small model", r.b, 60],
    ] as const
  ).forEach(([k, name, bar, dy]) => {
    const wl = Math.max(px(bar.llm), 3);
    const wo = px(bar.other);
    shapes.push(text(`${k}-name-${r.step}`, 20, y + dy + 4, 120, name, r.step));
    shapes.push({
      id: `${k}-llm-${r.step}`,
      type: "cell",
      x: BAR_X,
      y: y + dy,
      w: wl,
      h: 26,
      tone: PROD_TONE.model,
      fill: "pastel",
      step: r.step,
    });
    if (wo > 0) {
      shapes.push({
        id: `${k}-oth-${r.step}`,
        type: "cell",
        x: BAR_X + wl,
        y: y + dy,
        w: wo,
        h: 26,
        tone: PROD_TONE.infra,
        fill: "pastel",
        step: r.step,
      });
    }
    shapes.push(
      text(
        `${k}-val-${r.step}`,
        BAR_X + wl + wo + 8,
        y + dy + 4,
        Math.ceil(bar.label.length * 6.5) + 6,
        bar.label,
        r.step
      )
    );
  });
  if (r.note) shapes.push(text(`note-${r.step}`, BAR_X, y + 90, 450, r.note, r.step, PROD_TONE.failure));
});
shapes.push(
  text(
    "assume",
    20,
    350,
    840,
    `Illustrative: ${n(OUTCOME.tickets)} tickets a day; A resolves 70 %, B 55 %; a person handling a ticket costs $${OUTCOME.humanCost}. Green: model spend; grey: people.`,
    1
  )
);

// One labelled shape per step carries the "new" ring; the rest appear quietly.
const loud = new Set(["head-1", "head-2", "head-3"]);
const quietShapes = shapes.map((s) => (loud.has(s.id) ? s : { ...s, quiet: true }));

const spec: LayoutSpec = {
  kind: "layout",
  title: "The cheapest request is not always the cheapest ticket",
  width: 880,
  height: 376,
  steps: [
    { title: "Per request, the small model is 10 times cheaper" },
    { title: "Per resolved ticket, it is still cheaper" },
    { title: "Per ticket with people counted, it costs more" },
  ],
  shapes: quietShapes,
};

export default spec;
