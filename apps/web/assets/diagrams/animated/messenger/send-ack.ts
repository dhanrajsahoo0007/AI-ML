import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Save first, then ack; a retry carries the same client id (facebook-messenger, Deep dive 2).
// Two steps: 1 the app sends client id c7 for conversation 88; the chat server claims c7 in the dedup cache
// (SET NX, 24 h TTL) and gets m42, publishes m42 to the message bus keyed by conversation 88, waits for the
// replicated commit, and only then sends the ack; the store writer persists m42 from the bus later · 2 the ack is
// lost on a flaky network; after a 2 s timeout the app resends c7; the dedup cache already holds c7 = m42, so the
// server returns the same m42 and publishes nothing.
// Working: ids are illustrative; the 2 s client timeout and the 24 h dedup TTL are design choices of this page.
// Layout: five lanes. Colours (PATTERN_TONE): the app orange (traffic), the chat server teal (compute), the dedup
// cache green (the pattern's own part), the bus neutral (plumbing), the store violet; the lost ack is the red timeout.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Save, then ack; a retry reuses the client id",
  lanes: [
    { id: "app", label: "Sender app", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "chat", label: "Chat server", icon: "chat", tone: PATTERN_TONE.compute },
    { id: "dedup", label: "Dedup cache", icon: "cache", tone: PATTERN_TONE.pattern },
    { id: "bus", label: "Message bus", icon: "log", tone: PATTERN_TONE.infra },
    { id: "store", label: "Message store", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "app", to: "chat", label: "send c7, conv 88", step: 1 },
    { from: "chat", to: "dedup", label: "SET NX c7 = m42", step: 1 },
    { from: "dedup", to: "chat", label: "OK (new)", kind: "return", step: 1 },
    { from: "chat", to: "bus", label: "publish m42, key 88", step: 1 },
    { from: "bus", to: "chat", label: "committed on 2 of 3", kind: "return", step: 1 },
    { from: "chat", to: "app", label: "ack c7 = m42 (sent tick)", kind: "return", step: 1 },
    { from: "bus", to: "store", label: "store writer: upsert m42", kind: "async", step: 1 },

    { from: "chat", to: "app", label: "ack lost on the network", kind: "timeout", step: 2 },
    { from: "app", to: "chat", label: "after 2 s: resend c7", step: 2 },
    { from: "chat", to: "dedup", label: "SET NX c7", step: 2 },
    { from: "dedup", to: "chat", label: "exists: m42", kind: "return", step: 2 },
    { from: "chat", to: "app", label: "ack c7 = m42, no publish", kind: "return", step: 2 },
  ],
  steps: [{ title: "Save, then ack" }, { title: "The ack is lost: same id, same message" }],
};

export default spec;
