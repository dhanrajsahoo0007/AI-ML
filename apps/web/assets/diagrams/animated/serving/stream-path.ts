import type { SequenceSpec } from "@/components/diagrams/types";
import { LATENCY, TOKENS, n } from "@/components/diagrams/presets/production";

// One Brightpost answer streamed hop by hop (streaming-and-time-to-first-token, Architecture). Event names follow the
// Anthropic Messages API stream (content_block_delta, message_stop; checked November 2026); the heartbeat is the
// WHATWG SSE comment line, recommended "every 15 seconds or so"; X-Accel-Buffering is nginx's per-response switch.
//
// Steps:
//   1 The browser posts the question with stream on; the gateway forwards 2,200 tokens; the engine queues and
//     prefills (400 ms, LATENCY.firstTokenMs).
//   2 Tokens come back one event at a time through every hop: the first at 400 ms, then one every 4.4 ms (told in the
//     step card, not drawn), until message_stop at 1,500 ms.
//   3 A proxy with response buffering on (nginx's default) holds the events and delivers all 250 tokens at 1,500 ms:
//     the stream still works on paper, but the customer sees nothing until the end.
//   4 The fix: the gateway sends X-Accel-Buffering: no (or the proxy turns buffering off for the route), and writes a
//     comment line on quiet streams so idle timeouts do not fire.
//
// Lanes (four, width 760, 180 per lane): browser orange (the customer), edge proxy and gateway neutral (infra), engine
// teal (compute). Calls solid, events async (dashed), the buffered dump a return.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Streaming an answer through the gateway and a proxy",
  width: 760,
  steps: [
    { title: "The request goes in" },
    { title: "Tokens come back as events" },
    { title: "A buffering proxy holds them" },
    { title: "Turn buffering off, keep the line warm" },
  ],
  lanes: [
    { id: "browser", label: "Browser", icon: "browser", tone: "orange" },
    { id: "proxy", label: "Edge proxy", icon: "proxy", tone: "neutral" },
    { id: "gateway", label: "LLM gateway", icon: "gateway", tone: "neutral" },
    { id: "engine", label: "Engine", icon: "gpu", tone: "teal" },
  ],
  messages: [
    // Step 1: the request goes in.
    { from: "browser", to: "proxy", label: "POST /chat, stream on", step: 1, at: 0 },
    { from: "proxy", to: "gateway", label: "forward", step: 1, at: 1 },
    { from: "gateway", to: "engine", label: `${n(TOKENS.inputPerRequest)} tokens, stream`, step: 1, at: 2 },

    // Step 2: one event per token, hop by hop.
    {
      from: "engine",
      to: "gateway",
      label: `token 1 at ${LATENCY.firstTokenMs} ms`,
      kind: "async",
      step: 2,
      at: 4,
      delay: 0.4,
    },
    { from: "gateway", to: "proxy", label: "content_block_delta", kind: "async", step: 2, at: 5 },
    { from: "proxy", to: "browser", label: "content_block_delta", kind: "async", step: 2, at: 6 },
    {
      from: "proxy",
      to: "browser",
      label: `… message_stop, ${n(LATENCY.fullAnswerMs)} ms`,
      kind: "async",
      step: 2,
      at: 8,
    },

    // Step 3: a buffering proxy holds every event until the response ends.
    { from: "gateway", to: "proxy", label: "events, as they come", kind: "async", step: 3, at: 10 },
    {
      from: "proxy",
      to: "browser",
      label: `all ${TOKENS.outputPerRequest} at ${n(LATENCY.fullAnswerMs)} ms`,
      kind: "return",
      step: 3,
      at: 12,
      delay: 1,
    },

    // Step 4: switch buffering off for this response; heartbeat on quiet streams.
    { from: "gateway", to: "proxy", label: "X-Accel-Buffering: no", step: 4, at: 13 },
    { from: "proxy", to: "browser", label: "each event as it comes", kind: "async", step: 4, at: 14 },
    { from: "gateway", to: "proxy", label: ": comment on quiet streams", kind: "async", step: 4, at: 15 },
  ],
  notes: [
    { lane: "engine", text: `queue + prefill ${LATENCY.firstTokenMs} ms`, step: 1, at: 3 },
    { lane: "proxy", text: "buffering on: holds them", step: 3, at: 11 },
  ],
};

export default spec;
