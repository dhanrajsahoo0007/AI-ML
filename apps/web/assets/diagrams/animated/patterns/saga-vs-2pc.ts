import type { SequenceSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Two-phase commit against a saga for order 4471 (saga, first figure). Payment and stock live in two databases.
// Three steps: 1 two-phase commit: the coordinator asks both to prepare; both vote yes and keep their locks · 2 the
// coordinator dies before sending the decision: both participants are in doubt, still holding locks · 3 a saga
// instead: each step commits locally at once; when stock fails, the payment is undone by a compensating refund.
// Layout: three lanes. Colours (PATTERN_TONE): coordinator neutral (infra), both databases violet (stores); the lost
// decision and the failed stock step use the red timeout arrow.
// Fact check (2026-11-16): PostgreSQL docs on PREPARE TRANSACTION: a prepared transaction "continues to hold whatever
// locks it held" until COMMIT PREPARED or ROLLBACK PREPARED, and leaving one open interferes with VACUUM.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two-phase commit blocks; a saga compensates",
  lanes: [
    { id: "coord", label: "Coordinator", icon: "coordinator", tone: PATTERN_TONE.infra },
    { id: "pay", label: "Payments DB", icon: "database", tone: PATTERN_TONE.store },
    { id: "stock", label: "Stock DB", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "coord", to: "pay", label: "PREPARE charge", step: 1 },
    { from: "pay", to: "coord", label: "yes (locks held)", kind: "return", step: 1 },
    { from: "coord", to: "stock", label: "PREPARE reserve", step: 1 },
    { from: "stock", to: "coord", label: "yes (locks held)", kind: "return", step: 1 },

    { from: "coord", to: "pay", label: "COMMIT (never sent)", kind: "timeout", step: 2, duration: 1.4 },

    { from: "coord", to: "pay", label: `charge £${ORDER.price}: commit`, step: 3 },
    { from: "pay", to: "coord", label: "done", kind: "return", step: 3 },
    { from: "coord", to: "stock", label: "reserve kettle: commit", step: 3 },
    { from: "stock", to: "coord", label: "out of stock", kind: "timeout", step: 3, duration: 1.4 },
    { from: "coord", to: "pay", label: `refund £${ORDER.price} (compensate)`, step: 3 },
  ],
  notes: [{ lane: "pay", text: "both in doubt, rows locked", step: 2, at: 4.6 }],
  steps: [
    { title: "2PC: both prepare and hold locks" },
    { title: "The coordinator dies: both stay blocked" },
    { title: "A saga: commit each step, compensate on failure" },
  ],
};

export default spec;
