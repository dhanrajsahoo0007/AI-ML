import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Hold, pay, confirm as a durable workflow with compensation (hotel-booking, Step 5, Step 7 and Deep dive 2).
// Three steps: 1 the happy path: the three nights are already held (Step 4); the guest pays with idempotency key k7;
// the workflow authorises $360, then turns held into sold and writes booking 8812 in one transaction, captures the
// payment and pushes the booking to the hotel's channel manager · 2 the card is declined: the workflow runs its
// compensation, releasing the three held nights (held − 1 on each row, only while the hold is still "held") ·
// 3 the guest cancels later: the workflow moves the three nights from sold back to free, refunds by the cancellation
// policy with its own key and tells the hotel.
// Working: 3 nights × $120 = $360 (illustrative); the hold lasts 15 minutes, a timer in the same workflow.
// Every step can run twice after a crash (at-least-once), so each one is idempotent: the payment calls carry a key,
// the database steps are guarded by the hold's or booking's status.
// Layout: five lanes. Colours (PATTERN_TONE): guest orange (traffic), workflow green (the pattern), inventory DB violet
// (store), payment teal (compute), channel manager neutral (external); the decline is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Hold, pay, confirm as a workflow, with compensation",
  lanes: [
    { id: "guest", label: "Guest", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "wf", label: "Workflow", icon: "workflow", tone: PATTERN_TONE.pattern },
    { id: "db", label: "Inventory DB", icon: "database", tone: PATTERN_TONE.store },
    { id: "pay", label: "Payment", icon: "card", tone: PATTERN_TONE.compute },
    { id: "cm", label: "Channel mgr", icon: "building", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "guest", to: "wf", label: "pay, key k7", step: 1 },
    { from: "wf", to: "pay", label: "authorise $360, k7", step: 1 },
    { from: "pay", to: "wf", label: "authorised", kind: "return", step: 1 },
    { from: "wf", to: "db", label: "held → sold + booking", step: 1 },
    { from: "db", to: "wf", label: "3 rows, booking 8812", kind: "return", step: 1 },
    { from: "wf", to: "pay", label: "capture k7", kind: "async", step: 1 },
    { from: "wf", to: "guest", label: "confirmed 8812", kind: "return", step: 1 },
    { from: "wf", to: "cm", label: "push booking 8812", kind: "async", step: 1 },

    { from: "guest", to: "wf", label: "pay, key k8", step: 2 },
    { from: "wf", to: "pay", label: "authorise $360, k8", step: 2 },
    { from: "pay", to: "wf", label: "declined", kind: "timeout", step: 2 },
    { from: "wf", to: "db", label: "release 3 held nights", step: 2 },
    { from: "db", to: "wf", label: "held − 1 on 3 rows", kind: "return", step: 2 },
    { from: "wf", to: "guest", label: "declined, rooms freed", kind: "return", step: 2 },

    { from: "guest", to: "wf", label: "cancel 8812", step: 3 },
    { from: "wf", to: "db", label: "sold − 1 on 3 nights", step: 3 },
    { from: "wf", to: "pay", label: "refund by policy", step: 3 },
    { from: "wf", to: "cm", label: "push cancel 8812", kind: "async", step: 3 },
    { from: "wf", to: "guest", label: "cancelled, refunded", kind: "return", step: 3 },
  ],
  steps: [
    { title: "Authorise, confirm, capture" },
    { title: "Card declined: release the nights" },
    { title: "Cancel later: release and refund" },
  ],
};

export default spec;
