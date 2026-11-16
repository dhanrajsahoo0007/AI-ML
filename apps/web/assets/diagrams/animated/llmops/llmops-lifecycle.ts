import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { LIFECYCLE_SIZE, lifecycleMap } from "@/components/diagrams/presets/production";

// "The LLMOps loop" on the LLMOps and Observability page (hero): the full lifecycleMap from presets/production.ts, built
// in three steps. Every label, sub line and number comes from that builder (5,000 tickets, golden set 200, 12 req/s peak,
// 250 output tokens).
//   Step 1 the build path: data, fine-tune, evaluate, registry.
//   Step 2 the serving path: user, gateway, engine, guardrails, answer; the registry's deploy arrow joins the engine.
//   Step 3 the trace store, the dashed bus that carries traces and feedback to it, and its two feedback arrows into
//   evaluation and data.
// Layout (860 x 232): the map at (24, 20), 812 x 202. Nodes never move. No notes: shapes of earlier steps stay on
// screen, so the page's StepCards carry the words.
// Colours: the builder's own PROD_TONE roles (data blue, model green, checks lime, stores violet, gateway neutral,
// engine teal, user orange); no red.

const map = lifecycleMap("lc", 24, 20, {
  steps: {
    data: 1,
    finetune: 1,
    eval: 1,
    registry: 1,
    user: 2,
    gateway: 2,
    engine: 2,
    guardrails: 2,
    answer: 2,
    traces: 3,
  },
});

const shapes: LayoutShape[] = map;

const spec: LayoutSpec = {
  kind: "layout",
  title: "The LLMOps loop: build, serve, trace, learn",
  width: LIFECYCLE_SIZE.width + 48,
  height: 232,
  steps: [{ title: "Build: data to registry" }, { title: "Serve: user to answer" }, { title: "Trace and feed back" }],
  shapes,
};

export default spec;
