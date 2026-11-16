import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { ERROR_REWRITE } from "@/components/diagrams/presets/agents-env";

// From a raw error to an action (ai-first-environment-and-tool-scaffolding, Deep dive "Turning raw errors into
// actionable tool feedback"): the same failure twice. Left, the raw test output for running example B after the first
// edit: 46 lines, of which three carry what the model needs (the failing test, the error and the frame in
// src/parser.ts); the rest is runner frames. Right, the harness's rewrite: what failed, where, what to try. Anthropic's
// "Writing effective tools for agents" (11 Sep 2025) asks for error responses that "communicate specific and actionable
// improvements" instead of opaque codes or tracebacks. Token counts are illustrative (ERROR_REWRITE).
//
// Two steps: 1 the raw output, as a tool that pipes stdout would return it · 2 the rewrite, with arrows from the three
// lines it keeps.
//
// Layout: raw lines as cells 380 × 30 at x 20, y 56 + 34i, under a heading; the rewrite as three boxes 340 × 60 at
// x 460, y 50, 120, 236 (the first two level with the lines they come from), under its own heading. Arrows cross the
// 60-unit gutter.
//
// Colour (agents legend, three tones plus neutral): runner noise neutral; the three useful lines and "where" blue
// (what came back); "what failed" red (the one thing that broke); "what to try" teal (the next action), ringed: it is
// the part a raw trace never contains.

const RAW_X = 20;
const RAW_W = 380;
const LINE_H = 30;
const LINE_Y = (i: number) => 56 + i * 34;
const FIX_X = 460;
const FIX_W = 340;
const FIX_H = 60;
const FIX_Y = [50, 120, 236] as const;

const raw: LayoutShape[] = ERROR_REWRITE.raw.map((line, i) => ({
  id: `r${i}`,
  type: "cell",
  x: RAW_X,
  y: LINE_Y(i),
  w: RAW_W,
  h: LINE_H,
  label: line.text,
  tone: line.keep ? AGENT_TONE.result : AGENT_TONE.infra,
  quiet: i > 0 ? true : undefined,
}));

const FIELDS = [
  { label: ERROR_REWRITE.failed, sub: ERROR_REWRITE.failedSub, tone: AGENT_TONE.failure },
  { label: ERROR_REWRITE.where, sub: ERROR_REWRITE.whereSub, tone: AGENT_TONE.result },
  { label: ERROR_REWRITE.tryNext, sub: ERROR_REWRITE.tryNextSub, tone: AGENT_TONE.action },
] as const;

const fixed: LayoutShape[] = FIELDS.map((f, i) => ({
  id: `f${i}`,
  type: "box",
  x: FIX_X,
  y: FIX_Y[i],
  w: FIX_W,
  h: FIX_H,
  label: f.label,
  sub: f.sub,
  tone: f.tone,
  fill: "pastel",
  highlight: i === 2 ? true : undefined,
  step: 2,
}));

const spec: LayoutSpec = {
  kind: "layout",
  title: "From a raw error to what to do next",
  width: 820,
  height: 340,
  steps: [{ title: "The raw output: 46 lines" }, { title: "Rewritten: what failed, where, what to try" }],
  shapes: [
    {
      id: "h-raw",
      type: "text",
      x: RAW_X,
      y: 18,
      w: RAW_W,
      h: 28,
      label: `Raw: ${ERROR_REWRITE.rawLines} lines, ~${ERROR_REWRITE.rawTokens.toLocaleString("en-GB")} tokens`,
    },
    ...raw,
    {
      id: "h-fix",
      type: "text",
      x: FIX_X,
      y: 18,
      w: FIX_W,
      h: 28,
      label: `Rewritten: 3 lines, ~${ERROR_REWRITE.rewrittenTokens} tokens`,
      step: 2,
    },
    ...fixed,
    { id: "k0", type: "arrow", x: 0, y: 0, from: "r0", to: "f0", step: 2 },
    { id: "k1", type: "arrow", x: 0, y: 0, from: "r1", to: "f0", step: 2 },
    { id: "k2", type: "arrow", x: 0, y: 0, from: "r2", to: "f1", step: 2 },
  ],
};

export default spec;
