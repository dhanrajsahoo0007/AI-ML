import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// The audit pipeline (compliance-audit-logging, Architecture): events leave the services, personal data is redacted and
// the record hashed, the record is appended to a store that nothing can edit, a retention job removes raw detail by age,
// and only an auditor role can read. The ages (raw detail 30 days, record 13 months) are ILLUSTRATIVE choices, not a rule.
// Steps: 1 the services that emit events · 2 redact and hash · 3 append-only store · 4 retention job · 5 who may read.
// Layout (centres, cards w 150): chat app 90,110 | tool gateway 90,230 | redact 290,170 | store 530,170 |
// retention 290,300 (edge routed under the redact card to the store) | auditor 775,90 | read API 775,180 | engineers 775,300.
// Zones: write path x 10..630, y 40..340; read path x 680..870, y 40..240. Width 880.
// Colours (PROD_TONE): services and the read API neutral, redaction lime (a check), the store violet, people orange,
// the refused write red. Four tones plus neutral.

const spec: DiagramSpec = {
  title: "Audit pipeline: redact, append, expire by age, read by role",
  width: 880,
  height: 372,
  steps: [
    { title: "Services emit an event per decision" },
    { title: "Redact personal data, hash the record" },
    { title: "Append to a store nothing can edit" },
    { title: "A retention job drops raw detail by age" },
    { title: "Only an auditor role can read" },
  ],
  zones: [
    { id: "write", title: "Write path", tone: "neutral", x: 10, y: 40, w: 620, h: 300 },
    { id: "read", title: "Read path", tone: "neutral", x: 680, y: 40, w: 190, h: 200 },
  ],
  nodes: [
    {
      id: "chat",
      label: "Chat app",
      sub: "who, what, when",
      icon: "pipeline",
      tone: PROD_TONE.infra,
      fill: "pastel",
      x: 90,
      y: 110,
      w: 150,
    },
    {
      id: "toolgw",
      label: "Tool gateway",
      sub: "decision, rule",
      icon: "gateway",
      tone: PROD_TONE.infra,
      fill: "pastel",
      x: 90,
      y: 230,
      w: 150,
    },
    {
      id: "redact",
      label: "Redact + hash",
      sub: "no card, no email",
      icon: "shield-check",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 290,
      y: 170,
      w: 150,
      step: 2,
    },
    {
      id: "store",
      label: "Append-only",
      sub: "write once, chained",
      icon: "log",
      tone: PROD_TONE.store,
      fill: "pastel",
      x: 530,
      y: 170,
      w: 150,
      step: 3,
    },
    {
      id: "retention",
      label: "Retention job",
      sub: "record kept 13 mo",
      icon: "history",
      tone: PROD_TONE.infra,
      fill: "pastel",
      x: 290,
      y: 300,
      w: 150,
      step: 4,
    },
    {
      id: "auditor",
      label: "Auditor",
      sub: "role: auditor",
      icon: "users",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 775,
      y: 90,
      w: 150,
      step: 5,
    },
    {
      id: "api",
      label: "Read API",
      sub: "read-only, logged",
      icon: "api",
      tone: PROD_TONE.infra,
      fill: "pastel",
      x: 775,
      y: 180,
      w: 150,
      step: 5,
    },
    {
      id: "eng",
      label: "Engineers",
      sub: "no write, no delete",
      icon: "users",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 775,
      y: 300,
      w: 150,
      step: 5,
    },
  ],
  edges: [
    { from: "chat", to: "redact", label: "event", packet: true, step: 2 },
    { from: "toolgw", to: "redact", label: "event", packet: true, step: 2 },
    { from: "redact", to: "store", label: "hashed", packet: true, step: 3 },
    {
      from: "retention",
      to: "store",
      label: "drop raw after 30 d",
      via: [[530, 300]],
      labelAt: 0.35,
      dashed: true,
      step: 4,
    },
    { from: "store", to: "api", step: 5 },
    { from: "auditor", to: "api", label: "query", step: 5 },
    { from: "eng", to: "store", label: "write refused", tone: PROD_TONE.failure, dashed: true, step: 5 },
  ],
};

export default spec;
