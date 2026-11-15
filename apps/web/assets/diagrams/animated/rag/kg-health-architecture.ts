import type { DiagramSpec } from "@/components/diagrams/types";

// Healthcare case study: a clinician-facing assistant over two graphs, a patient timeline and a medical knowledge
// graph, with safety checks in deterministic rules and the LLM only explaining. Built up in seven steps:
// 1 the chart becomes a timeline graph · 2 notes add facts, with negation and time · 3 medical knowledge shares the
// same codes · 4 safety rules run as code · 5 a clinician asks through an access check (the assistant, accent) ·
// 6 guideline passages are retrieved · 7 the LLM explains, with citations. Nodes never move between steps.
//
// Zones follow CASE-STUDY-FORMAT.md ("Architecture diagram groups"): source systems and the clinician neutral, the
// access check blue (edge), ingest orange (async pipeline), the graphs, the passage index and the audit log violet
// (storage), and the request path green. The safety rules sit inside the green zone as a teal card (application
// services): they run on every request, and a separate zone below the assistant would put its title tab on the
// assistant-to-rules arrow.
//
// Layout: columns at x 90 | 265 | 440 | 618 | 790, cards 150 wide. Corridors at x 177 | 352 (build side) and 525
// (between storage and the request path). The build side feeds the stores from the left and the request side reads
// them from the right, so no edge enters a store glyph from below, where its label hangs. Zone title tabs sit on the
// top-left of each zone (16 + 8.2 px per character + 28 px), so the vertical arrows at x 618 and 790 cross the "Core"
// tab-free part of its top border. The assistant's edge to the passage index starts at an exact point on its left
// border (centre x minus 75 minus the 4 px gap), 20 below its centre line, so it leaves straight.

const X = [90, 265, 440, 618, 790] as const;
const W = 150;
const Y = { top: 90, mid: 220, rules: 355, guide: 400, base: 490, ehr: 175, notes: 265 } as const;
const C = { build: 352, read: 525 } as const; // corridors
const ASSIST_LEFT: [number, number] = [X[3] - 79, Y.mid + 20];

const spec: DiagramSpec = {
  title: "Healthcare: a patient graph and a medical graph, rules for safety, an LLM to explain",
  width: 880,
  height: 580,
  steps: [
    { title: "The chart becomes a timeline graph" },
    { title: "Notes add facts, with negation and time" },
    { title: "Medical knowledge shares the same codes" },
    { title: "Safety rules run as code" },
    { title: "A clinician asks, through an access check" },
    { title: "Guideline passages are retrieved" },
    { title: "The LLM explains, with citations" },
  ],
  zones: [
    { id: "sources", title: "Source systems", tone: "neutral", x: 10, y: 120, w: 160, h: 440 },
    { id: "async", title: "Async pipeline", tone: "orange", x: 185, y: 120, w: 160, h: 440 },
    { id: "storage", title: "Storage", tone: "violet", x: 360, y: 40, w: 160, h: 520 },
    { id: "edge", title: "Edge", tone: "blue", x: 530, y: 40, w: 170, h: 100 },
    { id: "clients", title: "Clients", tone: "neutral", x: 712, y: 40, w: 158, h: 100 },
    { id: "core", title: "Core", tone: "green", x: 530, y: 165, w: 340, h: 245 },
  ],
  nodes: [
    // Source systems
    { id: "ehr", label: "EHR (FHIR)", sub: "meds, labs", icon: "api", x: X[0], y: Y.ehr, w: W },
    { id: "notes", label: "Clinical notes", sub: "free text", icon: "file", step: 2, x: X[0], y: Y.notes, w: W },
    { id: "guide", label: "Guidelines", sub: "literature", icon: "ledger", step: 3, x: X[0], y: Y.guide, w: W },
    {
      id: "vocab",
      label: "Vocabularies",
      sub: "UMLS, SNOMED",
      icon: "tree",
      step: 3,
      x: X[0],
      y: Y.base,
      w: W,
    },

    // Async pipeline
    {
      id: "normalize",
      label: "Normalize",
      sub: "map to codes",
      icon: "pipeline",
      tone: "orange",
      fill: "pastel",
      x: X[1],
      y: Y.ehr,
      w: W,
    },
    {
      id: "nlp",
      label: "Clinical NLP",
      sub: "negation, time",
      icon: "model",
      tone: "orange",
      fill: "pastel",
      step: 2,
      x: X[1],
      y: Y.notes,
      w: W,
    },

    // Storage
    {
      id: "patient",
      label: "Patient graph",
      sub: "timeline",
      icon: "graph",
      tone: "violet",
      variant: "glyph",
      x: X[2],
      y: Y.mid,
    },
    {
      id: "passages",
      label: "Passage index",
      sub: "guidelines",
      icon: "vector-index",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: X[2],
      y: Y.rules,
    },
    {
      id: "medical",
      label: "Medical graph",
      sub: "drugs, diseases",
      icon: "graph",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: X[2],
      y: Y.base,
    },

    // Request side
    { id: "clinician", label: "Clinician", sub: "signed in", icon: "users", step: 5, x: X[4], y: Y.top, w: W },
    {
      id: "access",
      label: "Access check",
      sub: "role + purpose",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      step: 5,
      x: X[3],
      y: Y.top,
      w: W,
    },
    {
      id: "assistant",
      label: "Assistant",
      sub: "orchestrator",
      icon: "coordinator",
      tone: "green",
      accent: true,
      step: 5,
      x: X[3],
      y: Y.mid,
      w: W,
    },
    {
      id: "llm",
      label: "LLM",
      sub: "cites sources",
      icon: "model",
      tone: "green",
      fill: "pastel",
      step: 7,
      x: X[4],
      y: Y.mid,
      w: W,
    },
    {
      id: "rules",
      label: "Safety rules",
      sub: "interactions",
      icon: "policy",
      tone: "teal",
      fill: "pastel",
      step: 4,
      x: X[3],
      y: Y.rules,
      w: W,
    },
    {
      id: "auditLog",
      label: "Audit log",
      sub: "every access",
      icon: "log",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: X[2],
      y: Y.top,
    },
  ],
  edges: [
    // Steps 1-2: structured records and notes are coded and merge into one timeline per patient.
    { from: "ehr", to: "normalize", packet: true },
    {
      from: "normalize",
      to: "patient",
      packet: true,
      delay: 0.6,
      via: [
        [C.build, Y.ehr],
        [C.build, Y.mid],
      ],
    },
    { from: "notes", to: "nlp", packet: true },
    {
      from: "nlp",
      to: "patient",
      packet: true,
      delay: 0.6,
      via: [
        [C.build, Y.notes],
        [C.build, Y.mid],
      ],
    },

    // Step 3: vocabularies and guidelines build the medical graph.
    { from: "vocab", to: "medical", packet: true },
    {
      from: "guide",
      to: "medical",
      packet: true,
      via: [
        [C.build, Y.guide],
        [C.build, Y.base],
      ],
    },

    // Step 4: the rules look up interactions and contraindications in the medical graph.
    {
      from: "rules",
      to: "medical",
      label: "interactions",
      labelAt: 0.75,
      packet: true,
      delay: 1.2,
      via: [[X[3], Y.base]],
    },

    // Step 5: the request path. The access check logs every access; the assistant reads the patient and asks the
    // rules about the new drug.
    { from: "clinician", to: "access", packet: true },
    { from: "access", to: "auditLog", dashed: true },
    { from: "access", to: "assistant", packet: true, delay: 0.6 },
    { from: "assistant", to: "patient", packet: true, delay: 1.2 },
    { from: "assistant", to: "rules", label: "drug X + meds", bidirectional: true, packet: true, delay: 1.2 },

    // Step 6: guideline passages, for the LLM to cite.
    {
      from: "guide",
      to: "passages",
      packet: true,
      via: [
        [C.build, Y.guide],
        [C.build, Y.rules],
      ],
    },
    {
      from: "assistant",
      to: "passages",
      packet: true,
      delay: 1.8,
      via: [ASSIST_LEFT, [C.read, ASSIST_LEFT[1]], [C.read, Y.rules]],
    },

    // Step 7: the LLM writes the answer from the facts, alerts and passages; alerts come first.
    { from: "assistant", to: "llm", packet: true, delay: 2.4 },
    { from: "llm", to: "clinician", label: "cited answer", packet: true, delay: 3 },
  ],
};

export default spec;
