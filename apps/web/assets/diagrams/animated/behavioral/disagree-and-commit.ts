import type { SequenceSpec } from "@/components/diagrams/types";

// A disagreement that goes against you, told as a dialogue: speak up with evidence, lose the decision, make it work.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Disagree, lose the decision, commit, and earn trust",
  width: 720,
  lanes: [
    { id: "owner", label: "Decision owner", icon: "user", tone: "violet" },
    { id: "you", label: "You", icon: "user", tone: "blue" },
    { id: "team", label: "Your team", icon: "users", tone: "teal" },
  ],
  messages: [
    { from: "you", to: "owner", label: "Node loss drops 8% of carts", step: 1 },
    { from: "you", to: "owner", label: "Option: a 4-day bridge", step: 1 },
    { from: "owner", to: "you", label: "Keep the old cache, ship early", kind: "return", step: 2 },
    { from: "you", to: "team", label: "We ship on the old cache", step: 3 },
    { from: "you", to: "team", label: "I add a cookie fallback", step: 3 },
    { from: "team", to: "team", label: "Week 2: a cache node fails", kind: "note", step: 4 },
    { from: "you", to: "owner", label: "99.7% of checkouts kept", step: 4 },
    { from: "owner", to: "you", label: "Lead the migration next", kind: "return", step: 5 },
  ],
  notes: [{ lane: "owner", text: "Partner date outweighs the risk", step: 2, at: 2.5 }],
  steps: [
    { title: "Have Backbone", covers: "Say it to the decision owner, with evidence" },
    { title: "The decision goes against you", covers: "For a reason you can state fairly" },
    { title: "Commit", covers: "Explain it as ours and make the plan work" },
    { title: "The risk arrives", covers: "Your guard holds their decision up" },
    { title: "Earn Trust", covers: "What the commitment bought" },
  ],
};

export default spec;
