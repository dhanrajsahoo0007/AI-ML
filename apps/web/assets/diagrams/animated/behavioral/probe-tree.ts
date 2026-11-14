import type { SequenceSpec } from "@/components/diagrams/types";

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A story, then three follow-up questions",
  width: 860,
  steps: [
    { title: "1. Opening 2-min STAR+L story", covers: "Headline & scope" },
    { title: "2. Probe 1: Rejected alternatives", covers: "Tests judgment" },
    { title: "3. Probe 2: Personal fingerprints", covers: "Tests 'We' vs 'I'" },
    { title: "4. Probe 3: Counterfactual & scale", covers: "Tests seniority" },
  ],
  lanes: [
    { id: "interviewer", label: "Interviewer", icon: "user-check", tone: "orange" },
    { id: "candidate", label: "Candidate", icon: "user", tone: "blue" },
    { id: "design", label: "RFC / Code", icon: "code", tone: "teal" },
    { id: "metrics", label: "Telemetry", icon: "gauge", tone: "green" },
  ],
  messages: [
    {
      from: "interviewer",
      to: "candidate",
      label: "Tell me about a hard technical trade-off you led",
      kind: "call",
      step: 1,
    },
    {
      from: "candidate",
      to: "interviewer",
      label: "2-min STAR+L: context, my 3 actions, p99 delta",
      kind: "return",
      step: 1,
    },
    { from: "interviewer", to: "candidate", label: "Probe 1: Why reject async queue Option B?", kind: "call", step: 2 },
    { from: "candidate", to: "design", label: "Walks through ordering & idempotency matrix", kind: "call", step: 2 },
    { from: "design", to: "interviewer", label: "Proves Option B broke read-your-writes SLA", kind: "return", step: 2 },
    {
      from: "interviewer",
      to: "candidate",
      label: "Probe 2: What exact part did YOU write vs team?",
      kind: "call",
      step: 3,
    },
    {
      from: "candidate",
      to: "design",
      label: "Names the fencing-token PR & canary bug I fixed",
      kind: "call",
      step: 3,
    },
    {
      from: "interviewer",
      to: "candidate",
      label: "Probe 3: What breaks at 10x write volume today?",
      kind: "call",
      step: 4,
    },
    {
      from: "candidate",
      to: "metrics",
      label: "Points to lock contention at 25k TPS & sharding plan",
      kind: "call",
      step: 4,
    },
  ],
};

export default spec;
