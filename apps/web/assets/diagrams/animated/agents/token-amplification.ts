import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { HARNESS_RUN, HARNESS_TOTALS } from "@/components/diagrams/presets/agents-pge";

// Rounds × roles (planner-generator-evaluator-loops, Deep dive). The cost of one real run of Anthropic's
// planner-generator-evaluator harness, from "Harness design for long-running application development" (24 Mar 2026):
// a digital audio workstation built in three build-and-check rounds. Sourced, not illustrative: every dollar and
// minute is from the post (HARNESS_RUN). Rows are roles, columns are rounds; the cell shade grows with cost. The
// generator's rounds carry the bill; the evaluator, the ringed total, is 8.3 % of it.
//
// Layout: a grid. Header row y 46; role rows at y 92, 156, 220; the totals row at y 290. Columns: role names x 30
// (w 150), rounds x 196, 356, 516 (w 148), totals x 676 (w 124). A formula line under the grid. Static: no steps.
//
// Colour (agents legend, two tones plus neutral): the planner and generator rows green (model runs), the evaluator
// row lime (the check), headers and totals neutral.

const COLS = [196, 356, 516] as const;
const TOTAL_X = 676;
const ROWS = { planner: 92, generator: 156, evaluator: 220, total: 290 } as const;
const H = 54;
const CW = 148;
const MAX = HARNESS_RUN.generator[0].usd;

// 4.7 + (127 + 62 + 10.9) + (8.8 + 6.8 + 9.6) = 229.8 min, which the post gives as 3 h 50 min.
const TOTAL_MIN = [HARNESS_RUN.planner, ...HARNESS_RUN.generator, ...HARNESS_RUN.evaluator].reduce(
  (a, r) => a + r.min,
  0
);

const usd = (v: number) => `$${v.toFixed(2)}`;
const mins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${m} min`);

const cell = (
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string | undefined,
  tone: LayoutShape["tone"],
  v?: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "cell",
  x,
  y,
  w: x === TOTAL_X ? 124 : CW,
  h: H,
  label,
  sub,
  tone,
  weight: v === undefined ? undefined : Math.max(0.06, Math.round((v / MAX) * 100) / 100),
  ...extra,
});

const head = (id: string, x: number, w: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x,
  y: 46,
  w,
  h: 30,
  label,
  tone: AGENT_TONE.infra,
});

const roleName = (id: string, y: number, label: string, tone: LayoutShape["tone"]): LayoutShape => ({
  id,
  type: "box",
  x: 30,
  y,
  w: 150,
  h: H,
  label,
  tone,
  fill: "pastel",
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Rounds × roles: the cost of one planner-generator-evaluator run",
  width: 820,
  height: 410,
  shapes: [
    head("h-r1", COLS[0], CW, "Round 1"),
    head("h-r2", COLS[1], CW, "Round 2"),
    head("h-r3", COLS[2], CW, "Round 3"),
    head("h-total", TOTAL_X, 124, "Role total"),

    roleName("planner", ROWS.planner, "Planner", AGENT_TONE.model),
    roleName("generator", ROWS.generator, "Generator", AGENT_TONE.model),
    roleName("evaluator", ROWS.evaluator, "Evaluator", AGENT_TONE.check),
    roleName("total", ROWS.total, "Round total", AGENT_TONE.infra),

    // Planner: once, before round 1.
    cell(
      "p-1",
      COLS[0],
      ROWS.planner,
      usd(HARNESS_RUN.planner.usd),
      mins(HARNESS_RUN.planner.min),
      AGENT_TONE.model,
      HARNESS_RUN.planner.usd
    ),
    cell("p-t", TOTAL_X, ROWS.planner, usd(HARNESS_RUN.planner.usd), undefined, AGENT_TONE.infra),

    // Generator and evaluator: once per round.
    ...HARNESS_RUN.generator.map((g, i) =>
      cell(`g-${i + 1}`, COLS[i], ROWS.generator, usd(g.usd), mins(g.min), AGENT_TONE.model, g.usd, { quiet: true })
    ),
    cell("g-t", TOTAL_X, ROWS.generator, usd(HARNESS_TOTALS.generator), undefined, AGENT_TONE.infra),
    ...HARNESS_RUN.evaluator.map((e, i) =>
      cell(`e-${i + 1}`, COLS[i], ROWS.evaluator, usd(e.usd), mins(e.min), AGENT_TONE.check, e.usd, { quiet: true })
    ),
    cell(
      "e-t",
      TOTAL_X,
      ROWS.evaluator,
      usd(HARNESS_TOTALS.evaluator),
      `${HARNESS_TOTALS.evaluatorShare} % of all`,
      AGENT_TONE.check,
      undefined,
      {
        highlight: true,
      }
    ),

    // Totals per round and for the whole run.
    ...HARNESS_TOTALS.rounds.map((t, i) =>
      cell(`t-${i + 1}`, COLS[i], ROWS.total, usd(t), undefined, AGENT_TONE.infra)
    ),
    cell("t-all", TOTAL_X, ROWS.total, usd(HARNESS_RUN.totalUsd), mins(TOTAL_MIN), AGENT_TONE.infra),

    {
      id: "formula",
      type: "text",
      x: 30,
      y: 360,
      w: 770,
      h: 36,
      label: "cost = planner + Σ over rounds (generator + evaluator)\none run of Anthropic's harness, 24 Mar 2026",
      tone: AGENT_TONE.infra,
    },
  ],
};

export default spec;
