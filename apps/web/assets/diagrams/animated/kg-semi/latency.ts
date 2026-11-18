import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { LATENCY as L, REASONING, REASONING_BREAKPOINTS, TARGETS } from "@/components/diagrams/presets/gcase-kgsemi";
import { PROD_TONE, n, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";

// Latency per request type, p50, ms (kg-semiconductor-case-study, design sheet §12). Every stage is LATENCY.stages in
// presets/gcase-kgsemi.ts; all stage numbers are ESTIMATES. Model-server stages are marked "M"; every model call
// includes REASONING.low = 80 hidden reasoning tokens (800 ms at 100 tokens a second), budgeted until measured:
//   Template lookup, slots filled by the encoder, graph: edge 50 + route ‖ template match ≈ 30 + slot extraction 25 +
//   link literals 20 + parse, allow-list, schema check 15 + EXPLAIN 30 + execute on an assistant replica 150 + render
//   10 = L.tEncGraph.p50 ≈ 330 ms. No model call before the table.
//   Generated lookup: edge 50 + route 30 + schema linking 30 + M first token 400 + M reasoning 800 + M 150-token query
//   1,500 + link 20 + parse and EXPLAIN 45 + execute 150 + render 10 = L.generated.p50 ≈ 3,035 ms.
//   Investigation, typed (the slower route): edge 50 + M planner (first token 300 + reasoning 800 + plan JSON 600, one row, so no
//   duration text sits under the plan mark) +
//   link and resolve 100 → `plan` 1,850; cohort ‖ sort data ≈ 500; within-lot max-T ‖ test side 1,000; FDC indicators
//   and clustering 650; evidence, the slowest of 6 parallel draws ≈ 2,745; held-out confirmation and rank 330 →
//   `hypotheses` ≈ 7,075; M writer first token 600 + M reasoning 800 + M 540 tokens 5,400 + checks 20 → complete
//   ≈ 13,895 ms.
//   p95 (gated, model stages correlated) and breakpoints come from TARGETS and REASONING_BREAKPOINTS.
// Steps: 1 template lookup (own scale) · 2 generated lookup (own scale) · 3 typed investigation (own scale; plan and
// hypotheses marked) · 4 p95 per request type and where the reasoning budget breaks.
// Layout (880 wide): waterfall() from presets/production.ts, each on its own scale, said in its heading; label column
// 210 px, rows 22 px. Colours (GENAI_TONE): edge and render neutral; model stages green; linking and templates lime
// (check); store reads violet; statistics and ranking lime (rank); trace summaries teal (a tool).

const X = 12;
const LABEL_W = 210;
const WIDTH = 856;
const R = REASONING.low;

const span = (id: string, label: string, ms: number, tone: LayoutTone): Omit<WaterfallSpan, "startMs"> => ({
  id,
  label,
  durationMs: Math.round(ms),
  tone,
});
function chain(prefix: string, rows: Omit<WaterfallSpan, "startMs">[], step: number): WaterfallSpan[] {
  let t = 0;
  return rows.map((r) => {
    const s: WaterfallSpan = { ...r, id: `${prefix}-${r.id}`, startMs: Math.round(t), step };
    t += r.durationMs;
    return s;
  });
}
const p50 = (stages: readonly { id: string; p50: number }[], prefix: string) =>
  stages.filter((s) => s.id.startsWith(prefix)).reduce((a, s) => a + s.p50, 0);

const T = L.stages.templateStages;
const G = L.stages.generatedStages;
const P = L.stages.planText;
const M = L.stages.middle;
const Wr = L.stages.writerStages;

const template = chain(
  "t",
  [
    span("edge", "Edge: SSO, scope role, audit", p50(T, "edge"), PROD_TONE.infra),
    span("route", "Route ‖ template match", p50(T, "route"), GENAI_TONE.rank),
    span("slots", "Slots by encoder", p50(T, "slot"), GENAI_TONE.model),
    span("link", "Link literals to master ids", p50(T, "entity-link"), GENAI_TONE.check),
    span("check", "Parse, allow-list, EXPLAIN", p50(T, "parse") + p50(T, "EXPLAIN"), GENAI_TONE.check),
    span("exec", "Execute on a replica", p50(T, "execute"), GENAI_TONE.store),
    span("render", "Render table", p50(T, "render"), PROD_TONE.infra),
  ],
  1
);
const generated = chain(
  "g",
  [
    span("edge", "Edge: SSO, scope role, audit", p50(G, "edge"), PROD_TONE.infra),
    span("route", "Route; schema linking", p50(G, "route") + p50(G, "schema"), GENAI_TONE.rank),
    span("ft", "M first token", p50(G, "generate first"), GENAI_TONE.model),
    span("think", `M reasoning, ${R} tokens`, p50(G, "generate reasoning"), GENAI_TONE.model),
    span("query", "M query, 150 tokens", p50(G, "generate query"), GENAI_TONE.model),
    span(
      "check",
      "Link, parse, EXPLAIN",
      p50(G, "entity-link") + p50(G, "parse") + p50(G, "EXPLAIN"),
      GENAI_TONE.check
    ),
    span("exec", "Execute; render", p50(G, "execute") + p50(G, "render"), GENAI_TONE.store),
  ],
  2
);
const investigation = chain(
  "i",
  [
    span("edge", "Edge: SSO, scope role, audit", p50(P, "edge"), PROD_TONE.infra),
    span("plan", `M planner, ${R} reasoning`, p50(P, "planner") + p50(P, "plan JSON"), GENAI_TONE.model),
    span("resolve", "Link; resolve lots, wafers", p50(P, "entity-link") + p50(P, "resolve"), GENAI_TONE.check),
    span("cohort", "Cohort ‖ sort data", p50(M, "cohort"), GENAI_TONE.store),
    span("maxt", "Within-lot max-T ‖ test side", p50(M, "within-lot"), GENAI_TONE.rank),
    span("fdc", "FDC indicators; cluster", p50(M, "FDC") + p50(M, "cluster"), GENAI_TONE.rank),
    span("evidence", "Evidence: slowest of 6", p50(M, "graph context"), GENAI_TONE.tool),
    span("heldout", "Held-out top 3; rank", p50(M, "held-out") + p50(M, "rank"), GENAI_TONE.rank),
    span("wft", "M writer first token", p50(Wr, "writer first"), GENAI_TONE.model),
    span("wthink", `M reasoning, ${R} tokens`, p50(Wr, "writer reasoning"), GENAI_TONE.model),
    span("write", "M 540 tokens", p50(Wr, "writer ("), GENAI_TONE.model),
    span("checks", "Checks", p50(Wr, "final"), GENAI_TONE.check),
  ],
  3
);

const modelMs = p50(G, "generate");
const end = (spans: WaterfallSpan[]) => spans[spans.length - 1].startMs + spans[spans.length - 1].durationMs;
const target = (id: string) => TARGETS.find((t) => t.id === id)!;
const bp = (id: string) => Math.round(REASONING_BREAKPOINTS.find((b) => b.id === id)!.tokens);
const r0 = (v: number) => n(Math.round(v));
const planAt = investigation.find((s) => s.id === "i-resolve")!;
const hypAt = investigation.find((s) => s.id === "i-heldout")!;

const opts = { width: WIDTH, labelW: LABEL_W, rowH: 22, barH: 15 };
const text = (id: string, y: number, label: string, step: number, quiet = false): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: WIDTH,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  ...(quiet ? { quiet: true } : {}),
});

const H1 = 4;
const W1 = H1 + 24;
const s1 = waterfallSize(template, { ...opts, tickMs: 50, total: { ms: end(template) } });
const H2 = W1 + s1.height + 12;
const W2 = H2 + 24;
const s2 = waterfallSize(generated, { ...opts, tickMs: 500, total: { ms: end(generated) } });
const H3 = W2 + s2.height + 12;
const W3 = H3 + 24;
const s3 = waterfallSize(investigation, { ...opts, tickMs: 2_000, total: { ms: end(investigation) } });
const FOOT = W3 + s3.height + 10;

const tr = (id: string) => `${r0(target(id).p50)} / ${r0(target(id).p95)}`;

const shapes: LayoutShape[] = [
  text(
    "h1",
    H1,
    `Template lookup, encoder slots (own scale): table at ${r0(end(template))} ms; no model call before it`,
    1
  ),
  ...waterfall("tmpl", X, W1, template, {
    ...opts,
    tickMs: 50,
    step: 1,
    total: { ms: end(template), label: `table ${r0(end(template))} ms` },
  }),
  text(
    "h2",
    H2,
    `Generated lookup (own scale): table at ${r0(end(generated))} ms; ${(modelMs / 1_000).toFixed(1)} s of it is the model`,
    2
  ),
  ...waterfall("gen", X, W2, generated, {
    ...opts,
    tickMs: 500,
    step: 2,
    total: false, // the heading says 3,035 ms; a total line would cross the "65 ms" text
  }),
  text(
    "h3",
    H3,
    `Investigation, typed (own scale): plan ${r0(planAt.startMs + planAt.durationMs)}, hypotheses ${r0(hypAt.startMs + hypAt.durationMs)}, complete ${r0(end(investigation))} ms`,
    3
  ),
  ...waterfall("inv", X, W3, investigation, {
    ...opts,
    tickMs: 2_000,
    step: 3,
    total: { ms: end(investigation), label: `complete ${r0(end(investigation))} ms` },
    marks: [
      { ms: planAt.startMs + planAt.durationMs, label: "plan" },
      { ms: hypAt.startMs + hypAt.durationMs, label: "hypotheses" },
    ],
  }),
  text(
    "foot-1",
    FOOT,
    `p50 / gated p95, ms: lookups, all routes ${tr("lookup")} (≤ 1,500 / 5,000); template routes ${tr("lookupTemplate")}; generated ${tr("lookupGenerated")}.`,
    4
  ),
  text(
    "foot-2",
    FOOT + 20,
    `Document ${tr("document")}; plan, typed ${tr("planText")}; hypotheses ${tr("hypothesesText")}; complete ${tr("explanationText")} (≤ 15,000 / 25,000).`,
    4,
    true
  ),
  text(
    "foot-3",
    FOOT + 40,
    `${R} reasoning tokens a call is a budget. Typed plan fails at ≈ ${bp("planText")}, typed explanation at ≈ ${bp("explanationText")}, generated lookup at ≈ ${bp("lookupGenerated")}.`,
    4,
    true
  ),
  text(
    "foot-4",
    FOOT + 60,
    "All stage times are estimates for the illustrative fab; the gate uses measured p50 and p95.",
    4,
    true
  ),
];

/** One announcement per step: headings and the first footer carry the ring. */
const quieted = shapes.map((sh) => (/^(h\d|foot-\d)$/.test(sh.id) ? sh : { ...sh, quiet: true }));

const spec: LayoutSpec = {
  kind: "layout",
  title: "Latency per request type, p50: a template table in 330 ms, a generated one in 3.0 s, hypotheses in 7.1 s",
  width: 880,
  height: FOOT + 86,
  steps: [
    { title: `Template lookup: the table at ${r0(end(template))} ms, no model call before it` },
    { title: `Generated lookup: the table at ${r0(end(generated))} ms, reasoning tokens included` },
    {
      title: `Typed investigation: hypotheses at ${r0(hypAt.startMs + hypAt.durationMs)} ms, complete at ${r0(end(investigation))} ms`,
    },
    { title: "p95 per request type, and where the reasoning budget breaks" },
  ],
  shapes: quieted,
};

export default spec;
