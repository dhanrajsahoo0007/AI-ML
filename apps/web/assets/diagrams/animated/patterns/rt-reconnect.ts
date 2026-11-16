import type { SequenceSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Reconnecting with a last-seen cursor (realtime-gateways-and-presence, Technical mechanics).
// Three steps: 1 gateway 2 pushes event 3 (packed) for order 4471, then dies; events 4 and 5 are written to the order
// event log while the app has no socket · 2 the app waits a random 0 to 5 s, reconnects through the balancer to
// gateway 7 with "after = 3"; gateway 7 reads the log after 3 and sends 4 and 5, then live events follow · 3 an app
// that was away for two days sends a cursor older than the log keeps; gateway 7 asks the order service for the
// current state and sends a snapshot with its sequence number instead.
// Working: event numbers are per order (1 placed, 2 paid, 3 packed, 4 shipped, 5 out for delivery, 6 delivered);
// the 0 to 5 s jitter is the one fundamentals/websockets uses; the log's retention is illustrative.
// Layout: five lanes. Colours (PATTERN_TONE): the app orange (traffic), gateways and the order service teal (compute),
// the event log violet (store); the dropped socket is the red timeout arrow.
// Fact check (2026-11-16, Discord Gateway docs): every dispatch carries a sequence number `s`; to resume, the client
// sends its session id and the last `seq` it saw, and the gateway replays the missed events.

const id = ORDER.orderId;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Reconnect with a last-seen cursor",
  lanes: [
    { id: "app", label: "Shopper app", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "gw2", label: "Gateway 2", icon: "gateway", tone: PATTERN_TONE.compute },
    { id: "gw7", label: "Gateway 7", icon: "gateway", tone: PATTERN_TONE.compute },
    { id: "log", label: "Order event log", icon: "log", tone: PATTERN_TONE.store },
    { id: "orders", label: "Order service", icon: "server", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "gw2", to: "app", label: `${id} #3 packed`, step: 1 },
    { from: "gw2", to: "app", label: "socket drops", kind: "timeout", step: 1 },
    { from: "orders", to: "log", label: "#4 shipped, #5 out", kind: "async", step: 1 },

    { from: "app", to: "gw7", label: `connect, after = 3`, step: 2 },
    { from: "gw7", to: "log", label: `read ${id} after 3`, step: 2 },
    { from: "log", to: "gw7", label: "#4, #5", kind: "return", step: 2 },
    { from: "gw7", to: "app", label: "#4 shipped, #5 out", step: 2 },
    { from: "gw7", to: "app", label: "#6 delivered (live)", step: 2 },

    { from: "app", to: "gw7", label: "connect, after = 3", step: 3 },
    { from: "gw7", to: "log", label: `read ${id} after 3`, step: 3 },
    { from: "log", to: "gw7", label: "3 is past retention", kind: "return", step: 3 },
    { from: "gw7", to: "orders", label: `state of ${id}?`, step: 3 },
    { from: "orders", to: "gw7", label: "delivered, at #6", kind: "return", step: 3 },
    { from: "gw7", to: "app", label: "snapshot, after = 6", step: 3 },
  ],
  notes: [
    { lane: "gw2", text: "gateway 2 dies", step: 1, at: 1.5 },
    { lane: "app", text: "wait 0 to 5 s at random", step: 2, at: 2.5 },
    { lane: "app", text: "away for 2 days", step: 3, at: 7.5 },
  ],
  steps: [
    { title: "A gateway dies mid-stream" },
    { title: "Reconnect with a cursor" },
    { title: "Cursor too old: a snapshot" },
  ],
};

export default spec;
