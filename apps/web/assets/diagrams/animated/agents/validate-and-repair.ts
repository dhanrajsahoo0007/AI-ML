import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, TOOLS } from "@/components/diagrams/presets/agents";
import { EXTRACTION, REPAIR } from "@/components/diagrams/presets/agents-structured";

// Validate and repair (structured-output-generation, Technical mechanics): the kettle extraction on a model or
// provider without strict mode, so the schema check is the only thing between the model and the refunds workflow.
// The extraction service sends the message and the schema; attempt 1 copies the customer's words into `wants`; the
// schema check names the field and the allowed values; the service sends the draft and the error back; attempt 2 is
// valid; a rule check calls get_order to confirm order 4471 exists and belongs to customer 1847; the record goes on.
// A cap of 2 retries (3 attempts) ends in a hand-off to the support queue.
//
// Seven steps: 1 message + schema to the model · 2 attempt 1 returns (stop_reason end_turn, so not truncated) ·
// 3 the schema check fails and names the field · 4 draft + error go back, attempt 2 returns · 5 the schema check
// passes, the rule check calls get_order · 6 the record goes to the refunds workflow · 7 the cap: after 2 failed
// retries the support queue takes over (the dashed path is the fallback, not taken in this run). Nodes never move;
// replaced edges (the first request, attempt 1, the error) end with `until`.
//
// Layout: the service in the middle (x 440, row 260) with the model above it (row 80), the schema check to its left
// (x 120) and the rule check to its right (x 760) on the same row; the support queue (x 120) and the refunds workflow
// (x 760) on the bottom row (420). The service ⇄ model pair bends through x 360 (up) and x 520 (down) so both labels
// show; the service ⇄ schema-check pair bends through y 244 and y 276 for the same reason.
//
// Colour (agents legend, four tones plus neutral): the model green (the accent), both checks lime, the support queue
// orange (a person), the error edge red (the only failure); the service and the workflow neutral.

const COL = { left: 120, mid: 440, right: 760 } as const;
const ROW = { model: 80, svc: 260, bottom: 420 } as const;

const spec: DiagramSpec = {
  title: "Validate and repair: error back, retry, cap",
  width: 880,
  height: 490,
  steps: [
    { title: "The message and the schema go to the model" },
    { title: "Attempt 1 returns; stop_reason says it is complete" },
    { title: "The schema check fails and names the field" },
    { title: "The error goes back; attempt 2 returns" },
    { title: "The schema passes; the rule check asks get_order" },
    { title: "The record goes on to the refunds workflow" },
    { title: "The cap: after 2 failed retries, a person" },
  ],
  zones: [],
  nodes: [
    {
      id: "model",
      label: "Model",
      sub: "no strict mode here",
      icon: "model",
      tone: AGENT_TONE.model,
      accent: true,
      x: COL.mid,
      y: ROW.model,
      w: 180,
    },
    {
      id: "svc",
      label: "Extraction service",
      sub: "your code",
      icon: "server",
      tone: AGENT_TONE.infra,
      x: COL.mid,
      y: ROW.svc,
      w: 196,
    },
    {
      id: "schema",
      label: "Schema check",
      sub: "JSON Schema validator",
      icon: "shield-check",
      tone: AGENT_TONE.check,
      fill: "pastel",
      x: COL.left,
      y: ROW.svc,
      w: 196,
      step: 3,
    },
    {
      id: "rule",
      label: "Rule check",
      sub: "order is real and theirs",
      icon: "database",
      tone: AGENT_TONE.check,
      fill: "pastel",
      x: COL.right,
      y: ROW.svc,
      w: 196,
      step: 5,
    },
    {
      id: "workflow",
      label: "Refunds workflow",
      sub: "reads the record",
      icon: "pipeline",
      tone: AGENT_TONE.infra,
      x: COL.right,
      y: ROW.bottom,
      w: 196,
      step: 6,
    },
    {
      id: "queue",
      label: "Support queue",
      sub: "a person takes over",
      icon: "approval",
      tone: AGENT_TONE.task,
      fill: "pastel",
      x: COL.left,
      y: ROW.bottom,
      w: 196,
      step: 7,
    },
  ],
  edges: [
    // Step 1: the customer's message and the schema (in the prompt; no strict mode on this provider).
    { from: "svc", to: "model", label: "message + schema", packet: true, via: [[360, 170]], until: 3 },

    // Step 2: attempt 1. stop_reason is end_turn, so the output is complete and worth validating.
    { from: "model", to: "svc", label: "attempt 1", packet: true, via: [[520, 170]], step: 2, until: 3 },

    // Step 3: the validator names the field, the bad value and the allowed values.
    { from: "svc", to: "schema", label: "validate", packet: true, via: [[280, 276]], step: 3 },
    {
      from: "schema",
      to: "svc",
      label: `"${REPAIR.badValue}"`,
      tone: AGENT_TONE.failure,
      packet: true,
      via: [[280, 244]],
      step: 3,
      until: 4,
    },

    // Step 4: the draft and the error go back; attempt 2 returns.
    { from: "svc", to: "model", label: "draft + error", packet: true, via: [[360, 170]], step: 4 },
    {
      from: "model",
      to: "svc",
      label: "attempt 2",
      packet: true,
      via: [[520, 170]],
      step: 4,
      delay: 0.8,
    },

    // Step 5: the schema passes; a rule only the order system knows: does the order exist, and is it this customer's?
    { from: "schema", to: "svc", label: "passes", packet: true, via: [[280, 244]], step: 5 },
    {
      from: "svc",
      to: "rule",
      label: TOOLS.getOrder.call,
      packet: true,
      bidirectional: true,
      step: 5,
      delay: 0.8,
    },

    // Step 6: the valid record goes on.
    { from: "svc", to: "workflow", label: `order ${EXTRACTION.order_id}, refund`, packet: true, step: 6 },

    // Step 7: the fallback path, taken only when attempt 3 still fails (not in this run).
    {
      from: "svc",
      to: "queue",
      label: `after ${REPAIR.maxRetries} retries`,
      dashed: true,
      step: 7,
    },
  ],
};

export default spec;
