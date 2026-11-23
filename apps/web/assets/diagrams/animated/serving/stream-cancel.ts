import type { SequenceSpec } from "@/components/diagrams/types";
import { TOKENS, n } from "@/components/diagrams/presets/production";
import { CANCEL } from "@/components/diagrams/presets/production-stream";

// The customer closes the tab mid-answer, and the close has to travel all the way to the engine
// (streaming-and-time-to-first-token, worked example). Numbers from CANCEL in presets/production-stream.ts:
//   the tab closes at 620 ms; (620 − 400) ÷ 4.4 = 50 tokens were sent; 250 − 50 = 200 are still to come, which would
//   hold a batch slot for 200 × 4.4 = 880 ms if nobody stopped them.
//
// Steps:
//   1 The customer leaves: the browser closes the connection after 50 tokens. The engine does not know yet.
//   2 Each hop passes the close on: the proxy closes its upstream connection, the gateway notices the client is gone
//     and cancels its upstream call; for a self-hosted engine that is an abort of the request id (vLLM's server cancels
//     the handler on disconnect and aborts the request).
//   3 The engine frees the slot: the request leaves the batch, its KV-cache blocks go back to the free list 880 ms
//     before the answer would have ended, and a queued request can take the slot. The engine reports the request as
//     aborted after 50 tokens, which the gateway logs as partial usage.
//
// Lanes as in stream-path: browser orange, edge proxy and gateway neutral, engine teal. The close is drawn as a call
// (solid), not as a timeout: nothing timed out, the customer left.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Cancellation: the customer leaves, the engine stops",
  width: 760,
  steps: [
    { title: "The customer closes the tab" },
    { title: "Each hop passes the close on" },
    { title: "The engine frees the slot" },
  ],
  lanes: [
    { id: "browser", label: "Browser", icon: "browser", tone: "orange" },
    { id: "proxy", label: "Edge proxy", icon: "proxy", tone: "neutral" },
    { id: "gateway", label: "LLM gateway", icon: "gateway", tone: "neutral" },
    { id: "engine", label: "Engine", icon: "gpu", tone: "teal" },
  ],
  messages: [
    // Step 1: tokens are flowing; the customer leaves.
    { from: "proxy", to: "browser", label: `tokens 1–${CANCEL.sentTokens}`, kind: "async", step: 1, at: 0 },
    { from: "browser", to: "proxy", label: `close at ${CANCEL.closedAtMs} ms`, step: 1, at: 1, delay: 0.6 },

    // Step 2: the close travels inwards.
    { from: "proxy", to: "gateway", label: "close upstream", step: 2, at: 3 },
    { from: "gateway", to: "engine", label: "abort(request id)", step: 2, at: 4 },

    // Step 3: the engine frees what the request held.
    {
      from: "engine",
      to: "gateway",
      label: `aborted after ${CANCEL.sentTokens} tokens`,
      kind: "return",
      step: 3,
      at: 6,
    },
  ],
  notes: [
    {
      lane: "engine",
      text: `${CANCEL.leftTokens} of ${TOKENS.outputPerRequest} still to go`,
      step: 1,
      at: 2,
    },
    { lane: "engine", text: `KV blocks freed ${n(CANCEL.wastedMs)} ms early`, step: 3, at: 5 },
  ],
};

export default spec;
