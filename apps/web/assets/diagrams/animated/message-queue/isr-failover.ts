import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The in-sync set and a leader failover (distributed-message-queue, Step 4, Step 5 and Deep dive 2).
// One partition, replication factor 3 (B1 leads, B2 and B3 follow), min.insync.replicas = 2, producer acks=all.
// Three steps: 1 normal: the producer appends offset 1,000; both followers fetch it; the leader acks once every
// in-sync replica has it · 2 B3 pauses for 30 s, longer than the 10 s lag limit, so the leader asks the controller to
// shrink the in-sync set to B1, B2; offset 1,001 is acked with 2 copies, which still meets the minimum of 2 · 3 B1
// dies; the controller picks B2, the only other in-sync replica, as leader with a new epoch; the producer's next
// append is refused while only 1 copy is in sync (1 < 2); B3 catches up from B2, rejoins, and the retry is acked.
// Working: f + 1 = 3 replicas tolerate f = 2 failures without losing a committed message; with min.insync = 2 the
// partition keeps taking writes with 1 replica down, and refuses them (but keeps every acked message) with 2 down.
// Layout: five lanes. Colours (PATTERN_TONE): the producer orange (traffic), the brokers violet (they hold the log),
// the controller green (the part this figure is about); the missed fetch and heartbeat use the red timeout arrow.
// Fact check (2026-11-17, Confluent replication docs): "With this ISR model and f+1 replicas, a Kafka topic can
// tolerate f failures without losing committed messages"; acks=all waits for the full in-sync set; the minimum is
// set per topic with min.insync.replicas; replica.lag.time.max.ms decides which followers are lagging.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "The in-sync set shrinks, the leader dies, a new leader comes from the set",
  lanes: [
    { id: "p", label: "Producer", icon: "server", tone: PATTERN_TONE.traffic },
    { id: "b1", label: "Leader B1", icon: "log", tone: PATTERN_TONE.store },
    { id: "b2", label: "Follower B2", icon: "log", tone: PATTERN_TONE.store },
    { id: "b3", label: "Follower B3", icon: "log", tone: PATTERN_TONE.store },
    { id: "c", label: "Controller", icon: "coordinator", tone: PATTERN_TONE.pattern },
  ],
  messages: [
    { from: "p", to: "b1", label: "append, acks=all", step: 1 },
    { from: "b2", to: "b1", label: "fetch from 1,000", step: 1 },
    { from: "b3", to: "b1", label: "fetch from 1,000", step: 1 },
    { from: "b1", to: "p", label: "ack: offset 1,000", kind: "return", step: 1 },

    { from: "b3", to: "b1", label: "no fetch for 30 s", kind: "timeout", step: 2 },
    { from: "b1", to: "c", label: "shrink ISR to B1, B2", step: 2 },
    { from: "p", to: "b1", label: "append", step: 2 },
    { from: "b2", to: "b1", label: "fetch from 1,001", step: 2 },
    { from: "b1", to: "p", label: "ack: 1,001, 2 in sync", kind: "return", step: 2 },

    { from: "c", to: "b1", label: "heartbeat missed", kind: "timeout", step: 3 },
    { from: "c", to: "b2", label: "lead, epoch 8", step: 3 },
    { from: "p", to: "b2", label: "append", step: 3 },
    { from: "b2", to: "p", label: "refused: 1 in sync < 2", kind: "return", step: 3 },
    { from: "b3", to: "b2", label: "fetch, catch up", step: 3 },
    { from: "b2", to: "c", label: "grow ISR to B2, B3", step: 3 },
    { from: "p", to: "b2", label: "retry append", step: 3 },
    { from: "b2", to: "p", label: "ack: offset 1,002", kind: "return", step: 3 },
  ],
  steps: [
    { title: "Ack once the in-sync set has it" },
    { title: "A slow follower leaves the set" },
    { title: "The leader dies: B2 takes over" },
  ],
};

export default spec;
