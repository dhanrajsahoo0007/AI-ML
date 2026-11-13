import type { SequenceSpec } from "@/components/diagrams/types";

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Production outage lifecycle: mitigate fast, diagnose deeply, prevent classes of bugs",
  width: 860,
  steps: [
    { title: "1. Alert & blast-radius triage", covers: "First 5 minutes" },
    { title: "2. Mitigate before debugging", covers: "Rollback / kill switch" },
    { title: "3. Blameless 5-Whys forensics", covers: "Why guardrails missed it" },
    { title: "4. Automated systemic guardrail", covers: "Eliminate bug class" },
  ],
  lanes: [
    { id: "alert", label: "SLO Alert", icon: "flame", tone: "red" },
    { id: "lead", label: "You (On-Call)", icon: "user-check", tone: "blue" },
    { id: "prod", label: "Production", icon: "server", tone: "orange" },
    { id: "guard", label: "CI & Canary", icon: "shield", tone: "green" },
  ],
  messages: [
    { from: "alert", to: "lead", label: "Checkout p99 > 2.5s & 5xx burn rate 14x", kind: "call", step: 1 },
    { from: "lead", to: "prod", label: "Quantifies blast radius: 18% of EU writes failing", kind: "call", step: 1 },
    { from: "lead", to: "prod", label: "Flips feature flag & rolls back release v42.8", kind: "call", step: 2 },
    { from: "prod", to: "lead", label: "5xx drops to 0.01% within 90 seconds", kind: "return", step: 2 },
    {
      from: "lead",
      to: "prod",
      label: "Traces lock contention to unindexed foreign-key cascade",
      kind: "call",
      step: 3,
    },
    { from: "lead", to: "guard", label: "Writes blameless COE: why staging missed table lock", kind: "call", step: 3 },
    {
      from: "lead",
      to: "guard",
      label: "Adds migration lock-timeout linter & shadow traffic gate",
      kind: "call",
      step: 4,
    },
  ],
};

export default spec;
