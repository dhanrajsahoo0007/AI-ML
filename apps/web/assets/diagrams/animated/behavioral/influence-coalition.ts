import type { SequenceSpec } from "@/components/diagrams/types";

const spec: SequenceSpec = {
  kind: "sequence",
  title: "How to get 3 partner teams to adopt your RFC when they don't report to you",
  width: 860,
  steps: [
    { title: "1. Unsolicited RFC hits wall", covers: "Roadmap resistance" },
    { title: "2. Reframe around THEIR pain", covers: "Incentive alignment" },
    { title: "3. Pay the migration tax", covers: "Codemods & shims" },
    { title: "4. Shared win & org standard", covers: "Coalition momentum" },
  ],
  lanes: [
    { id: "you", label: "You (Author)", icon: "user", tone: "blue" },
    { id: "partner", label: "Partner Team", icon: "users", tone: "orange" },
    { id: "tooling", label: "Codemod / Shim", icon: "wrench", tone: "teal" },
    { id: "org", label: "Org Standard", icon: "award", tone: "green" },
  ],
  messages: [
    { from: "you", to: "partner", label: "Asks team to migrate 14 endpoints to new auth token", kind: "call", step: 1 },
    { from: "partner", to: "you", label: "Pushes back: Q3 roadmap is 100% booked", kind: "return", step: 1 },
    { from: "you", to: "partner", label: "Audits their on-call: 30% of pages come from legacy auth", kind: "call", step: 2 },
    { from: "you", to: "tooling", label: "Builds dual-auth proxy + AST codemod + draft PR", kind: "call", step: 3 },
    { from: "tooling", to: "partner", label: "Cuts their effort from 2 weeks to a 30-min PR review", kind: "return", step: 3 },
    { from: "partner", to: "org", label: "Adopts v1 in production; on-call pages drop to zero", kind: "call", step: 4 },
    { from: "you", to: "org", label: "Publishes case study crediting partner team; 4 more adopt", kind: "call", step: 4 },
  ],
};

export default spec;
