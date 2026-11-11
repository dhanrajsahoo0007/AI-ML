import type { SequenceSpec } from "@/components/diagrams/types";

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Resolving an architectural deadlock without ego or escalation",
  width: 860,
  steps: [
    { title: "1. Deadlock on design choice", covers: "Competing proposals" },
    { title: "2. Steelman & isolate variables", covers: "Facts vs priorities" },
    { title: "3. Time-boxed benchmark spike", covers: "Empirical evidence" },
    { title: "4. Hybrid RFC & commitment", covers: "Shared ownership" },
  ],
  lanes: [
    { id: "you", label: "You (Lead)", icon: "user", tone: "blue" },
    { id: "peer", label: "Peer / PM", icon: "users", tone: "orange" },
    { id: "spike", label: "Benchmark", icon: "gauge", tone: "teal" },
    { id: "rfc", label: "Shared RFC", icon: "file-text", tone: "green" },
  ],
  messages: [
    { from: "you", to: "peer", label: "Proposes Option A (Postgres transactional outbox)", kind: "call", step: 1 },
    { from: "peer", to: "you", label: "Pushes Option B (direct dual-write for speed)", kind: "return", step: 1 },
    { from: "you", to: "rfc", label: "Writes steelman of Option B + explicit trade-off table", kind: "call", step: 2 },
    { from: "you", to: "peer", label: "Agrees on constraint: <15ms p99 & zero lost events", kind: "call", step: 2 },
    { from: "you", to: "spike", label: "Runs 4-hour fault-injection & latency benchmark", kind: "call", step: 3 },
    { from: "spike", to: "peer", label: "Shows dual-write drops 0.3% of events on pod restart", kind: "return", step: 3 },
    { from: "peer", to: "rfc", label: "Suggests simplifying outbox poller with LISTEN/NOTIFY", kind: "call", step: 4 },
    { from: "you", to: "rfc", label: "Co-authors final hybrid design & credits peer", kind: "call", step: 4 },
  ],
};

export default spec;
