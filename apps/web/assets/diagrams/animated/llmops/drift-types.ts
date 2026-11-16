import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, TOKENS } from "@/components/diagrams/presets/production";
import { INTENTS } from "@/components/diagrams/presets/production-drift";

// The four places an LLM system can drift (drift-detection, Core concepts). Four columns: inputs (what customers ask),
// outputs (what the assistant says), the provider's model (changes under a name you call), the knowledge (policies and
// the index). Three rows built up in three steps: what moves · a Brightpost example · how you notice.
// Examples are illustrative except two numbers computed from presets: the "other" intent share 5 % -> 21 % (INTENTS)
// and the average answer of 250 tokens (TOKENS.outputPerRequest) growing to an illustrative 330.
// Layout (880 x 372): row labels x 10 (w 90); columns x 110 + 190 i (w 172); headers y 12 (h 52); rows y 80, 168, 256
// (h 70, three lines of up to 26 characters). Colours (four tones): inputs orange, outputs
// green, the provider's model neutral (outside our control), knowledge blue.

const COL_X = (i: number) => 110 + 190 * i;
const cols = [
  { id: "inputs", label: "Inputs", sub: "what customers ask", tone: PROD_TONE.traffic },
  { id: "outputs", label: "Outputs", sub: "what the assistant says", tone: PROD_TONE.model },
  { id: "model", label: "Provider's model", sub: "changes under a name", tone: PROD_TONE.infra },
  { id: "know", label: "Knowledge", sub: "policies and the index", tone: PROD_TONE.data },
] as const;
const other = INTENTS[4];
const rows: { id: string; label: string; step: number; cells: string[] }[] = [
  {
    id: "moves",
    label: "What moves",
    step: 1,
    cells: [
      "topics, languages and\nphrasing of the\nquestions shift",
      "length, tone, refusal\nrate and format of\nanswers shift",
      "the vendor updates the\nweights behind a model\nname you call",
      "policies, prices and\narticles change; the\nindex goes stale",
    ],
  },
  {
    id: "example",
    label: "Brightpost\nexample",
    step: 2,
    cells: [
      `gift-card questions go\nfrom ${other.base * 100} % to ${other.now * 100} % of\ntickets`,
      `average answer grows\nfrom ${TOKENS.outputPerRequest} to 330 tokens\n(illustrative)`,
      "an alias moves: pass\nrate falls from 90 % to\n84 % (illustrative)",
      "a returns window is cut\nbut the index still\nquotes the old one",
    ],
  },
  {
    id: "notice",
    label: "How you notice",
    step: 3,
    cells: [
      "PSI on the intent mix;\nembedding distance\nfrom the baseline",
      "length, refusal rate and\njudge score over time",
      "a golden-set run each\nweek; model version\nin every trace",
      "stale-article checks;\ngrounding scores\nfall",
    ],
  },
];

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet: true,
});

const shapes: LayoutShape[] = cols.map((c, i) => ({
  id: `col-${c.id}`,
  type: "box" as const,
  x: COL_X(i),
  y: 12,
  w: 172,
  h: 52,
  label: c.label,
  sub: c.sub,
  tone: c.tone,
  fill: "pastel" as const,
  step: 1,
}));
rows.forEach((r, ri) => {
  const y = 80 + 88 * ri;
  shapes.push(text(`row-${r.id}`, 10, y, 92, 70, r.label, r.step));
  r.cells.forEach((label, ci) =>
    shapes.push({
      id: `cell-${r.id}-${ci}`,
      type: "box",
      x: COL_X(ci),
      y,
      w: 172,
      h: 70,
      label,
      tone: cols[ci].tone,
      fill: "paper",
      step: r.step,
      quiet: true,
    })
  );
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Four places an LLM system drifts",
  width: 880,
  height: 340,
  steps: [
    { title: "Four things can move" },
    { title: "What each looks like at Brightpost" },
    { title: "How you notice each one" },
  ],
  shapes,
};

export default spec;
