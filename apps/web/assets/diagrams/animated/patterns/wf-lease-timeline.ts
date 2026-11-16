import type { SequenceSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A lease that runs out, a second worker, and a late first worker (workflows-and-job-scheduling, Technical
// mechanics: leases and heartbeats).
// Two steps: 1 worker A receives the expiry job for hold 4471 with a 30 s lease and extends it once with a
// heartbeat; then A stalls (a long garbage-collection pause or a hung call), misses the next heartbeat, and the lease
// runs out · 2 the job is visible again; worker B receives it, expires the hold with a conditional update (only if
// it is still held), gets one row back and deletes the job; A wakes and runs the same update, which changes 0 rows,
// so the kettle goes back on sale exactly once.
// Layout: four lanes (sequence lanes are equal columns).
// Colours (PATTERN_TONE): the queue neutral (plumbing), workers teal (compute), the holds DB violet (store); the
// missed heartbeat is the red timeout arrow, the only red.
// Fact check (2026-11-16, SQS developer guide): visibility timeout defaults to 30 s, at most 12 h from the first
// receive; ChangeMessageVisibility extends it, and the guide recommends a heartbeat that extends it periodically;
// SQS does not guarantee a message is never delivered twice.

const hold = `hold ${ORDER.orderId}`;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A lease runs out and a second worker takes the job",
  lanes: [
    { id: "q", label: "Ready queue", icon: "queue", tone: PATTERN_TONE.infra },
    { id: "a", label: "Worker A", icon: "server", tone: PATTERN_TONE.compute },
    { id: "b", label: "Worker B", icon: "server", tone: PATTERN_TONE.compute },
    { id: "db", label: "Holds DB", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "q", to: "a", label: `expire ${hold} (lease 30 s)`, step: 1 },
    { from: "a", to: "q", label: "heartbeat: extend 30 s", step: 1 },
    { from: "a", to: "q", label: "heartbeat (A stalled)", kind: "timeout", step: 1, duration: 1.6 },
    { from: "q", to: "q", label: "lease runs out", kind: "note", step: 1 },

    { from: "q", to: "b", label: `expire ${hold} (receive 2)`, step: 2 },
    { from: "b", to: "db", label: "expire if still held", step: 2 },
    { from: "db", to: "b", label: "1 row: kettle back", kind: "return", step: 2 },
    { from: "b", to: "q", label: "delete job", step: 2 },
    { from: "a", to: "db", label: "expire if still held", step: 2, delay: 0.3 },
    { from: "db", to: "a", label: "0 rows: nothing to do", kind: "return", step: 2 },
  ],
  steps: [{ title: "Claim, heartbeat, stall" }, { title: "A second worker, a late first one" }],
};

export default spec;
