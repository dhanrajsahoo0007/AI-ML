import type { SequenceSpec } from "@/components/diagrams/types";

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A feedback conversation in five moves",
  width: 700,
  steps: [
    { title: "Observation", covers: "What happened, with no opinion added" },
    { title: "Effect", covers: "What it cost someone else" },
    { title: "Question", covers: "Ask what is behind it, then listen" },
    { title: "Agreement", covers: "One change each, said out loud" },
    { title: "Check back", covers: "Thirty days later" },
  ],
  lanes: [
    { id: "you", label: "You", icon: "user", tone: "blue" },
    { id: "mate", label: "Teammate", icon: "users", tone: "orange" },
  ],
  messages: [
    { from: "you", to: "mate", label: "Two hotfixes merged with no test", kind: "call", step: 1 },
    { from: "you", to: "mate", label: "Sunday page took three hours to fix", kind: "call", step: 2 },
    { from: "you", to: "mate", label: "What makes the tests hard to add?", kind: "call", step: 3 },
    { from: "mate", to: "you", label: "The harness takes 18 minutes to start", kind: "return", step: 3 },
    { from: "you", to: "mate", label: "I will help make the harness fast", kind: "call", step: 4 },
    { from: "mate", to: "you", label: "No hotfix from me without a test", kind: "return", step: 4 },
    { from: "you", to: "mate", label: "How has it gone since we spoke?", kind: "call", step: 5 },
    { from: "mate", to: "you", label: "One slip in a deadline week", kind: "return", step: 5 },
  ],
};

export default spec;
