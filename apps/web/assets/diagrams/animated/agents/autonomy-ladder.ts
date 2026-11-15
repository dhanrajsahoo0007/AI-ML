import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, AUTONOMY_LADDER, LATENCY_S } from "@/components/diagrams/presets/agents";

// "Choosing a pattern" on agent-architectures: five rungs from a single call to a multi-agent system, each with the
// model calls one Brightpost refund request takes on it and the model time that costs (calls × 1.5 s; illustrative,
// from AUTONOMY_LADDER and LATENCY_S; tool time is left out, so the agent rung reads 7.5 s, not the 8.7 s of the
// whole happy path). Under each rung: who decides the next step and the risk.
//
// Layout: a staircase. Rung i is 150 wide at x 20 + 158i, its top 46 units higher than the rung before. A text block
// under each rung's column sits on the shared baseline (y 300). An arrow along the bottom names what rises.
//
// Colour (agents legend): rungs where your code decides are neutral; rungs where a model decides are green; the rung
// the Brightpost agent sits on is ringed.

const W = 150;
const STEP_X = 158;
const BASE = 290;
const RISE = 46;
const H = 52;

const rungs: LayoutShape[] = AUTONOMY_LADDER.flatMap((r, i) => {
  const x = 20 + i * STEP_X;
  const y = BASE - H - i * RISE;
  const model = r.decides !== "Your code";
  const seconds = Math.round(r.calls * LATENCY_S.modelCall * 10) / 10;
  return [
    {
      id: `r${i}`,
      type: "box" as const,
      x,
      y,
      w: W,
      h: H,
      label: r.rung,
      sub: `${r.calls} ${r.calls === 1 ? "call" : "calls"} · ≈ ${seconds} s`,
      tone: model ? AGENT_TONE.model : AGENT_TONE.infra,
      fill: model ? ("pastel" as const) : ("soft" as const),
      highlight: r.rung === "Agent with tools" ? true : undefined,
    },
    {
      id: `t${i}`,
      type: "text" as const,
      x,
      y: BASE + 8,
      w: W,
      h: 36,
      label: `${r.decides} ${r.decides.startsWith("Several") ? "decide" : "decides"}\nRisk: ${r.risk.toLowerCase()}`,
      tone: AGENT_TONE.infra,
    },
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The autonomy ladder: more model decisions, more calls, more risk",
  width: 820,
  height: 390,
  shapes: [
    ...rungs,
    {
      id: "rise",
      type: "arrow",
      x: 20,
      y: 366,
      w: 780,
      h: 0,
      label: "more calls, time and risk (illustrative)",
    },
  ],
};

export default spec;
