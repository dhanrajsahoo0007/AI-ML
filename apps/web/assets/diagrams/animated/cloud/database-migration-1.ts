import type { SequenceSpec } from "@/components/diagrams/types";

// The cutover window of Brightpost's wholesale move, minute by minute (cloud/data/database-migration).
// At 06:00 on a Sunday, the quietest hour, the app stops taking writes. The replication task applies the last changes
// until lag is zero, and the counts match. Asha sets every sequence past the highest id, starts the reverse copy and
// points the app at PostgreSQL. The sequence reset is a note, not a self-message: a self-loop on the last lane puts its
// label past the right edge. A test order gets a new id, so writes open at 06:09. From then on each change is
// copied back to MySQL, so a rollback for the next 7 days loses nothing.
// The labels are cloud-neutral on purpose: every provider's tool has these four parts. Lanes are ordered so that the
// most frequent hops (app <-> source, task <-> target) are between neighbours.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "The cutover window: freeze, drain, switch, test, reopen",
  width: 800,
  steps: [
    { title: "Freeze writes" },
    { title: "Drain the change stream to zero" },
    { title: "Reset sequences, switch, smoke test" },
    { title: "Reopen writes; the reverse copy runs" },
  ],
  lanes: [
    { id: "app", label: "Wholesale app", icon: "server", tone: "teal" },
    { id: "source", label: "MySQL source", icon: "database", tone: "violet" },
    { id: "task", label: "Replication", icon: "workers", tone: "orange" },
    { id: "target", label: "PostgreSQL", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: no new orders reach MySQL; shops see a short "back in 10 minutes" page.
    { from: "app", to: "source", label: "06:00 stop writes", step: 1 },
    { from: "source", to: "app", label: "last order 110,214", kind: "return", step: 1 },

    // Step 2: the task applies the changes still in flight until nothing is left.
    { from: "source", to: "task", label: "last changes", kind: "async", step: 2 },
    { from: "task", to: "target", label: "06:02 applied, lag 0", step: 2 },
    { from: "target", to: "task", label: "counts, checksums match", kind: "return", step: 2 },

    // Step 3: sequences first, then the reverse copy, then the new address and one real test.
    { from: "task", to: "target", label: "06:04 start reverse copy", step: 3 },
    { from: "app", to: "target", label: "06:05 new address", step: 3 },
    { from: "app", to: "target", label: "test order", step: 3 },
    { from: "target", to: "app", label: "order 110,215 saved", kind: "return", step: 3 },

    // Step 4: writes open on PostgreSQL; every change also lands back in MySQL.
    { from: "app", to: "target", label: "06:09 writes open", step: 4, delay: 0.6 },
    { from: "target", to: "task", label: "each change", kind: "async", step: 4 },
    { from: "task", to: "source", label: "copied back", kind: "async", step: 4 },
  ],
  notes: [
    { lane: "app", text: "Shops see 'back in 10 min'", step: 1, at: 1.5 },
    { lane: "target", text: "Sequences set to 110,215", step: 3, at: 4.5 },
    { lane: "source", text: "Rollback ready for 7 days", step: 4 },
  ],
};

export default spec;
