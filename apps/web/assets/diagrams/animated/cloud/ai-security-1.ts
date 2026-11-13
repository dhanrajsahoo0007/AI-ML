import type { SequenceSpec } from "@/components/diagrams/types";

// How Brightpost's chatbot refund runs after the fix (cloud/resilience/ai-security).
// The chat service never pays anyone. It asks the refund workflow to start a refund, and the workflow checks the
// order's owner and the amount itself. A £12 refund is paid at once. A £42 refund waits for the support agent, who
// approves it at 10:20. A request for order 5122, which belongs to another customer, is refused by the workflow
// even if the chat service asked for it ("start: 5122, 1847" is order 5122 for customer 1847).
// Lane labels are cloud-neutral and short, so they fit five lanes in 800 units.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "A chatbot refund: request, check, approve, pay",
  width: 800,
  steps: [
    { title: "A small refund goes straight through" },
    { title: "A big refund waits for a person" },
    { title: "The person decides" },
    { title: "Someone else's order never starts" },
  ],
  lanes: [
    { id: "customer", label: "Customer", icon: "users", tone: "neutral" },
    { id: "chat", label: "Chat service", icon: "chat", tone: "teal" },
    { id: "workflow", label: "Workflow", icon: "pipeline", tone: "orange" },
    { id: "agent", label: "Support agent", icon: "users", tone: "neutral" },
    { id: "payments", label: "Payments", icon: "card", tone: "neutral" },
  ],
  messages: [
    // Step 1: under the limit, the workflow pays without a person.
    { from: "customer", to: "chat", label: "refund order 4410", step: 1 },
    { from: "chat", to: "workflow", label: "start: 4410, £12", step: 1 },
    { from: "workflow", to: "payments", label: "refund £12", step: 1 },
    { from: "workflow", to: "chat", label: "paid", kind: "return", step: 1 },

    // Step 2: over the limit, the workflow pauses and asks a person.
    { from: "customer", to: "chat", label: "refund order 4471", step: 2, delay: 0.6 },
    { from: "chat", to: "workflow", label: "start: 4471, £42", step: 2 },
    { from: "workflow", to: "agent", label: "approve £42?", step: 2 },
    { from: "chat", to: "customer", label: "a person will check", kind: "return", step: 2 },

    // Step 3: the person's answer resumes the workflow.
    { from: "agent", to: "workflow", label: "10:20 approved", kind: "return", step: 3, delay: 0.6 },
    { from: "workflow", to: "payments", label: "refund £42", step: 3 },
    { from: "workflow", to: "chat", label: "paid, approved by staff", kind: "return", step: 3 },

    // Step 4: the workflow checks the owner itself, so a tricked chat service cannot start it.
    { from: "chat", to: "workflow", label: "start: 5122, 1847", step: 4, delay: 0.6 },
    { from: "workflow", to: "chat", label: "refused: not theirs", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "workflow", text: "Owner? Under £30?", step: 1, at: 1.5 },
    { lane: "workflow", text: "Paused, state saved", step: 2, at: 6.5 },
    { lane: "agent", text: "Reads the chat first", step: 3, at: 7.5 },
    { lane: "workflow", text: "Nothing reaches payments", step: 4 },
  ],
};

export default spec;
