import type { SequenceSpec } from "@/components/diagrams/types";

// Who starts the conversation. Billing charges a rider 3.40 for ride 981; the bank takes a few seconds to approve.
// Step 1 (polling): billing keeps asking the card processor "is it done yet?". Two of the three checks come back
// "pending" and are wasted work on both sides.
// Step 2 (webhook): billing asks once. When the bank approves, the processor itself POSTs the event to billing's
// webhook URL, and billing answers 200 at once (the real work happens later from a queue).
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Polling versus a webhook",
  width: 700,
  steps: [{ title: "Polling: billing keeps asking" }, { title: "Webhook: the processor tells billing" }],
  lanes: [
    { id: "billing", label: "Billing service", icon: "ledger", tone: "teal" },
    { id: "processor", label: "Card processor", icon: "card", tone: "neutral" },
    { id: "bank", label: "Rider's bank", icon: "lock", tone: "violet" },
  ],
  messages: [
    // Step 1: start the charge, then poll.
    { from: "billing", to: "processor", label: "POST /charges (ride 981)", step: 1 },
    { from: "processor", to: "billing", label: "202 pending", kind: "return", step: 1 },
    { from: "processor", to: "bank", label: "authorize 3.40", step: 1 },
    { from: "billing", to: "processor", label: "GET /charges/c_77", step: 1, delay: 0.4 },
    { from: "processor", to: "billing", label: "pending", kind: "return", step: 1 },
    { from: "billing", to: "processor", label: "GET /charges/c_77", step: 1, delay: 0.4 },
    { from: "processor", to: "billing", label: "pending", kind: "return", step: 1 },
    { from: "bank", to: "processor", label: "approved", kind: "return", step: 1 },
    { from: "billing", to: "processor", label: "GET /charges/c_77", step: 1, delay: 0.4 },
    { from: "processor", to: "billing", label: "succeeded", kind: "return", step: 1 },

    // Step 2: start the charge, then wait to be told.
    { from: "billing", to: "processor", label: "POST /charges (ride 981)", step: 2, delay: 0.6 },
    { from: "processor", to: "billing", label: "202 pending", kind: "return", step: 2 },
    { from: "processor", to: "bank", label: "authorize 3.40", step: 2 },
    { from: "bank", to: "processor", label: "approved", kind: "return", step: 2, delay: 0.6 },
    { from: "processor", to: "billing", label: "POST charge.succeeded", kind: "async", step: 2 },
    { from: "billing", to: "processor", label: "200 OK", kind: "return", step: 2 },
  ],
  notes: [
    { lane: "billing", text: "3 checks, 2 wasted", step: 1, at: 9.5 },
    { lane: "billing", text: "Told once, right away", step: 2 },
  ],
};

export default spec;
