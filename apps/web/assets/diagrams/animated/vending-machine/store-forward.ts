import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Offline-first telemetry: a local queue, sequence numbers and dedup (vending-machine, Step 4 and Deep dive 3).
// Two steps: 1 online: the controller appends event 5120 (a sale of B4) to its local log with fsync, publishes it to
// the MQTT broker at QoS 1 and gets a PUBACK; the broker's rule puts it on the event log; the stream job inserts
// (m42, 5120) only if it is new and takes 1 off slot B4 in the same transaction · 2 two hours offline: events 5121 to
// 5148 pile up in the local log; the publish gets no answer (red); after the link returns and a random wait, the
// controller replays 5121 to 5148; the PUBACK for 5148 is lost, so it sends 5148 again; the stream job inserts 5148
// once and skips the copy.
// Working: one machine makes about 330 events a day (40 sales + 288 heartbeats); two hours is about 28 events, one
// batch. 30 days offline is 330 × 30 × 200 bytes ≈ 2 MB on the controller.
// Layout: five lanes. Colours (PATTERN_TONE): the controller teal (compute), the local log and the fleet DB violet
// (stores), the broker grey (plumbing), the stream job green (the part this figure is about); the unanswered publish
// is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Store and forward with sequence numbers",
  lanes: [
    { id: "ctrl", label: "Controller", icon: "controller", tone: PATTERN_TONE.compute },
    { id: "log", label: "Local log", icon: "log", tone: PATTERN_TONE.store },
    { id: "broker", label: "MQTT broker", icon: "shield", tone: PATTERN_TONE.infra },
    { id: "stream", label: "Stream job", icon: "pipeline", tone: PATTERN_TONE.pattern },
    { id: "db", label: "Fleet DB", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "ctrl", to: "log", label: "append 5120, fsync", step: 1 },
    { from: "ctrl", to: "broker", label: "publish 5120, QoS 1", step: 1 },
    { from: "broker", to: "ctrl", label: "PUBACK 5120", kind: "return", step: 1 },
    { from: "broker", to: "stream", label: "5120 via the event log", kind: "async", step: 1 },
    { from: "stream", to: "db", label: "insert if new, B4 −1", step: 1 },

    { from: "ctrl", to: "log", label: "append 5121 to 5148", step: 2 },
    { from: "ctrl", to: "broker", label: "publish 5121: no link", kind: "timeout", step: 2 },
    { from: "ctrl", to: "broker", label: "2 h later, random wait: 5121 to 5148", step: 2 },
    { from: "broker", to: "ctrl", label: "PUBACK up to 5147, 5148 lost", kind: "return", step: 2 },
    { from: "ctrl", to: "broker", label: "resend 5148", step: 2 },
    { from: "broker", to: "stream", label: "5148 twice", kind: "async", step: 2 },
    { from: "stream", to: "db", label: "insert 5148 once, skip copy", step: 2 },
  ],
  steps: [{ title: "Online: log, publish, apply once" }, { title: "Two hours offline: replay safely" }],
};

export default spec;
