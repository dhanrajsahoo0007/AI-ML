import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The life of one streamed answer (chatgpt, Step 2, Step 7 and Deep dive 1).
// Three steps: 1 stream: the app posts a prompt with request id r7; the chat service queues it at the router, which
// gives it a batch slot; the client gets response.created, then numbered output_text.delta events, then
// response.completed, while every event is also appended to the stream buffer · 2 resume: the connection drops after
// event 40; the app reconnects (to any chat server) with Last-Event-ID 40, and the server replays 41 onwards from the
// buffer before going live again · 3 stop: the user presses stop; the cancel travels chat service, router, model
// server, and the slot is free on the next decode iteration.
// Working: a 500-token answer at 50 tokens/s takes 10 s; stopped at 4.6 s it has produced 4.6 × 50 = 230 tokens, so
// the cancel saves 500 − 230 = 270 tokens of decode on the GPU.
// Lanes: five, 140 apart. Colours (PATTERN_TONE): the app orange (traffic), chat service and model server teal
// (compute), the router neutral (plumbing), the stream buffer violet (store); the lost event is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "One streamed answer: stream, resume after a drop, stop",
  lanes: [
    { id: "app", label: "User app", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "chat", label: "Chat service", icon: "chat", tone: PATTERN_TONE.compute },
    { id: "buf", label: "Stream buffer", icon: "queue", tone: PATTERN_TONE.store },
    { id: "router", label: "Router", icon: "router", tone: PATTERN_TONE.infra },
    { id: "model", label: "Model server", icon: "gpu", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "app", to: "chat", label: "POST prompt, request id r7", step: 1 },
    { from: "chat", to: "router", label: "enqueue r7", step: 1 },
    { from: "router", to: "model", label: "batch slot", step: 1 },
    { from: "chat", to: "app", label: "id 1: response.created", kind: "return", step: 1 },
    { from: "model", to: "router", label: "tokens", kind: "async", step: 1 },
    { from: "router", to: "chat", label: "tokens", kind: "async", step: 1 },
    { from: "chat", to: "buf", label: "append ids 2 to 40", kind: "async", step: 1 },
    { from: "chat", to: "app", label: "ids 2 to 40: output_text.delta", kind: "return", step: 1 },

    { from: "chat", to: "app", label: "id 41: connection dropped", kind: "timeout", step: 2 },
    { from: "app", to: "chat", label: "GET stream, Last-Event-ID 40", step: 2 },
    { from: "chat", to: "buf", label: "read from id 41", step: 2 },
    { from: "buf", to: "chat", label: "ids 41 to 57", kind: "return", step: 2 },
    { from: "chat", to: "app", label: "replay 41 to 57, then live", kind: "return", step: 2 },

    { from: "app", to: "chat", label: "POST cancel r7 (stop)", step: 3 },
    { from: "chat", to: "router", label: "cancel r7", step: 3 },
    { from: "router", to: "model", label: "abort: free the slot", step: 3 },
    { from: "model", to: "router", label: "freed after 230 tokens", kind: "return", step: 3 },
    { from: "chat", to: "app", label: "response.completed: stopped", kind: "return", step: 3 },
  ],
  notes: [{ lane: "buf", text: "any chat server can replay", step: 2, at: 11.5 }],
  steps: [
    { title: "Stream: created, deltas, completed" },
    { title: "The connection drops: resume from the buffer" },
    { title: "Stop: the cancel reaches the GPU" },
  ],
};

export default spec;
