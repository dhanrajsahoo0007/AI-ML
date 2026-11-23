import type { DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { GENAI_TONE, HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { CONTEXT, NETWORK } from "@/components/diagrams/presets/gcase-kghealth";
import { fmt } from "@/components/diagrams/presets/rag";

// The clinical knowledge-graph assistant (genai-system-design/case-studies/kg-healthcare-case-study), the hero. Built one
// requirement at a time, exactly as design sheet §8 lists it (SYSTEM-DESIGN/plans/genai-design/design/
// kg-healthcare-case-study.md, v3):
//   1 Ask a model with the chart, for the right patient (F1, N6): clinician (side panel, patient banner) → gateway
//     (SMART token, patient from context, care team, AuditEvent) → orchestrator → FHIR reads on the EHR → answer model.
//   2 Rules over a knowledge snapshot decide the alerts (F1, F5, N1): knowledge build → versioned snapshot, loaded in
//     memory by the rules engine (seven templates, two phases); the orchestrator hands it the facts and gets the alerts.
//   3 Notes become coded facts with context and lifecycle (F4, N3): signed notes from the EHR → note NLP (NER, linking,
//     assertion) → patient fact store.
//   4 Resolve the drug, expand, then retrieve passages (F1, F2): drug resolver and planner, passage index, cross-encoder.
//   5 Abstain by rule; check every sentence (F6, N2, N4): abstention and checks; answers, provenance and audit.
//   6 Order cards in the EHR (F3, N5): the EHR's CDS Hooks client → CDS Hooks service → the same rules engine.
//   7 Keep knowledge current and versioned (F5, N7): release gate and regression between the build and the snapshot
//     (the step-2 build → snapshot line has `until: 6` and is replaced by build → gate → snapshot).
//   8 Evaluate, review, close the loop, inside the boundary (F7): evaluation and review reads answers, flags and
//     overrides and feeds the release gate. The PHI boundary is drawn in kg-health/phi-boundary, not here (sheet §8).
// Numbers: NETWORK.questionsPerDay 7,200, NETWORK.notesPerDay 80,400, CONTEXT.total 4,470 tokens, all from presets/gcase-kghealth.ts (estimates for the illustrative network).
//
// Layout (1200 × 740, genaiZones() from presets/genai-case.ts). The "Models, rules and linking" tab is 25 characters ×
// 8.2 + 28 = 233 px wide, x 421–654 at y 316–344, so the one line that crosses the core/services boundary inside the
// zones does so at x 700 (orchestrator → cross-encoder); the model is reached down the left gutter.
//   Two horizontal lines run from the left: the order line at y 118 (EHR → CDS Hooks service → rules engine) and the
//   question line at y 200 (clinician → gateway → orchestrator).
//   Clients x 105: EHR 118, clinician 200 (124 wide, so the notes line down the far left at x 26 clears it by 17 px).
//   Edge x 297: CDS Hooks service 118, gateway 200.
//   Clinical orchestration, cards 40 tall, columns x 490 | 660:
//            x 490              x 660
//     118    Rules engine       Drug resolver, planner
//     200    Orchestrator (accent, 320 × 48, spans both columns)
//     262    Abstention, checks  ·
//   Models, rules and linking, columns x 490 | 660, rows 385 | 600: answer model, note NLP (left) | cross-encoder (right).
//   Offline x 879 (190 wide, 44 tall): evaluation 250, release gate 330, knowledge build 410 (a stack under every line
//   that crosses the zone, so the stack's own verticals cross nothing).
//   Data and state x 1098: passage index 125, answers and audit 250, knowledge snapshot 410, patient fact store 600.
// Routing (every long edge checked against the boxes and tabs it passes):
//   - FHIR reads leave the orchestrator's left side at y 186, climb the left gutter x 394 and run along y 157, between
//     the order line's cards (bottom 138) and the question line's cards (top 176), into the EHR's foot.
//   - The model call leaves the orchestrator's left side at y 214 and runs down the left gutter into the model.
//   - Signed notes leave the EHR's left side and run down x 26 (17 px left of the clinician) to y 600, then right into
//     note NLP; note NLP → fact store is level at y 600, under every zone above it.
//   - Snapshot → rules engine is a bracket right of the stores (x 1168), then the top lane y 84 (under the zone tabs,
//     which end at y 74; 14 px above the passage index and 16 px above the rules engine) and down into the rules engine.
//   - Orchestrator → passage index leaves at y 186 through a stub at x 752 up to y 125; orchestrator → answers runs level
//     at y 200 into the store's head (the passage index label ends at y 187), so neither line crosses the other.
//   - Orchestrator → cross-encoder drops at x 700 from the orchestrator's foot, through the empty core slot (660, 262).
//   - Build → snapshot is level at y 410; gate → snapshot bends at x 1030 (left of every store label) into the same
//     entry, which the build line leaves free from step 7.
// Colours (GENAI_TONE roles): the clinician orange; the EHR teal (an API the system calls); gateway and CDS Hooks
// service neutral; rules engine, checks, release gate and evaluation lime (checks); the resolver and cross-encoder lime
// (ranking); answer model and note NLP green (models); the knowledge build blue (data); stores violet glyphs; the
// orchestrator the one accent.

const C = { clients: 105, edge: 297, left: 490, right: 660, mid: 575, async: 879, store: 1098 } as const;
const ROW = { order: 118, main: 200, c3: 262, s1: 385, s3: 600 } as const;
const STORE_Y = { passages: 125, answers: 250, snapshot: 410, facts: 600 } as const;
const ASYNC_Y = { eval: 250, gate: 330, build: 410 } as const;
const GUTTER = {
  left: 394,
  farLeft: 26,
  top: 84,
  fhir: 157,
  stub: 752,
  drop: 700,
  bend: 1030,
  storeRight: 1168,
} as const;
const W = 150;
const CH = 40;
const OH = 48;
const OW = 320;
const AW = 190;
const AH = 44;
const SH = 50;

const card = (
  id: string,
  label: string,
  sub: string,
  icon: string | undefined,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => ({ id, label, sub, ...(icon ? { icon } : {}), x, y, w: W, step, fill: "pastel", ...extra });

const store = (id: string, label: string, sub: string, icon: string, y: number, step: number): DiagramNode => ({
  id,
  label,
  sub,
  icon,
  tone: GENAI_TONE.store,
  variant: "glyph",
  x: C.store,
  y,
  step,
});

const offline = (
  id: string,
  label: string,
  sub: string,
  icon: string,
  y: number,
  step: number,
  tone: DiagramNode["tone"]
) => card(id, label, sub, icon, C.async, y, step, { w: AW, h: AH, tone });

const O_LEFT = C.mid - OW / 2 - 4; // 411: a point on the orchestrator's left border, plus the edge gap
const O_RIGHT = C.mid + OW / 2 + 4; // 739
const O_TOP = ROW.main - OH / 2 - 4; // 172
const O_FOOT = ROW.main + OH / 2 + 4; // 228

const spec: DiagramSpec = {
  title:
    "Clinical knowledge-graph assistant: rules over a versioned snapshot decide the alerts, the model only explains",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "Ask a model with the chart, for the right patient", covers: "F1, N6" },
    { title: "Rules over a knowledge snapshot decide the alerts", covers: "F1, F5, N1" },
    { title: "Notes become coded facts with context and lifecycle", covers: "F4, N3" },
    { title: "Resolve the drug, expand, then retrieve passages", covers: "F1, F2" },
    { title: "Abstain by rule; check every sentence", covers: "F6, N2, N4" },
    { title: "Order cards in the EHR", covers: "F3, N5" },
    { title: "Keep knowledge current and versioned", covers: "F5, N7" },
    { title: "Evaluate, review, close the loop, inside the boundary", covers: "F7" },
  ],
  zones: genaiZones({
    clients: "Clinicians and EHR",
    core: "Clinical orchestration",
    services: "Models, rules and linking",
  }),
  nodes: [
    // Clinicians and EHR
    card("ehr", "EHR", "FHIR, hooks", "building", C.clients, ROW.order, 1, {
      w: W,
      h: CH,
      tone: GENAI_TONE.tool,
    }),
    card("clinician", "Clinician", "side panel", "users", C.clients, ROW.main, 1, {
      w: 124,
      h: OH,
      tone: GENAI_TONE.user,
    }),

    // Edge and gateway
    card("hooks", "CDS Hooks service", "order-select, -sign", undefined, C.edge, ROW.order, 6, { h: CH }),
    card("gateway", "Gateway", "token, care team", "gateway", C.edge, ROW.main, 1, { h: OH }),

    // Clinical orchestration
    card("rules", "Rules engine", "7 templates", "policy", C.left, ROW.order, 2, {
      h: CH,
      tone: GENAI_TONE.check,
    }),
    card("resolver", "Drug resolver", "exact first; planner", "link", C.right, ROW.order, 4, {
      w: 160,
      h: CH,
      tone: GENAI_TONE.rank,
    }),
    {
      id: "orch",
      label: "Orchestrator",
      sub: "every event stamped with its patient",
      icon: "coordinator",
      accent: true,
      x: C.mid,
      y: ROW.main,
      w: OW,
      h: OH,
      step: 1,
    },
    card("checks", "Abstention, checks", "coverage; per sentence", undefined, C.left, ROW.c3, 5, {
      h: CH,
      tone: GENAI_TONE.check,
    }),

    // Models, rules and linking
    card("model", "Answer model", "mid-size, BAA", "model", C.left, ROW.s1, 1, {
      h: SH,
      tone: GENAI_TONE.model,
    }),
    card("cross", "Cross-encoder", "≈ 40 passages", "layers", C.right, ROW.s1, 4, {
      w: 156,
      h: SH,
      tone: GENAI_TONE.rank,
    }),
    card("nlp", "Note NLP", "NER, linking", "embedder", C.left, ROW.s3, 3, {
      h: SH,
      tone: GENAI_TONE.model,
    }),

    // Offline pipelines
    offline("eval", "Evaluation, review", "inside the PHI zone", "chart", ASYNC_Y.eval, 8, GENAI_TONE.check),
    offline("gate", "Release gate", "regression, then swap", "approval", ASYNC_Y.gate, 7, GENAI_TONE.check),
    offline("build", "Knowledge build", "vocabularies, KB", "pipeline", ASYNC_Y.build, 2, GENAI_TONE.data),

    // Data and state
    store("passages", "Passage index", "labels, guidelines", "vector-index", STORE_Y.passages, 4),
    store("answers", "Answers, audit", "stored inputs, PROV", "ledger", STORE_Y.answers, 5),
    store("snapshot", "Knowledge snapshot", "versioned, read-only", "snapshot", STORE_Y.snapshot, 2),
    store("facts", "Patient fact store", "facts, note chunks", "database", STORE_Y.facts, 3),
  ],
  edges: [
    // Step 1: identity and patient before data; the chart's recent facts in a prompt.
    { from: "clinician", to: "gateway", flow: true, packet: true, bidirectional: true },
    { from: "gateway", to: "orch", flow: true, packet: true, bidirectional: true, delay: 0.6 },
    {
      from: "orch",
      to: "ehr",
      label: "FHIR reads",
      labelAt: 0.62,
      via: [
        [O_LEFT, 186],
        [GUTTER.left, 186],
        [GUTTER.left, GUTTER.fhir],
        [C.clients, GUTTER.fhir],
      ],
    },
    {
      from: "orch",
      to: "model",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 1.4,
      via: [
        [O_LEFT, 214],
        [GUTTER.left, 214],
        [GUTTER.left, ROW.s1],
      ],
    },

    // Step 2: rules over the snapshot decide the alerts.
    { from: "orch", to: "rules", bidirectional: true, via: [[C.left, O_TOP]] },
    {
      from: "snapshot",
      to: "rules",
      label: "snapshot in memory",
      labelAt: 0.62,
      via: [
        [GUTTER.storeRight, STORE_Y.snapshot],
        [GUTTER.storeRight, GUTTER.top],
        [C.left, GUTTER.top],
      ],
    },
    { from: "build", to: "snapshot", until: 6 },

    // Step 3: notes become coded facts.
    {
      from: "ehr",
      to: "nlp",
      label: `signed notes, ${fmt(NETWORK.notesPerDay)} a day`,
      labelAt: 0.82,
      via: [
        [GUTTER.farLeft, ROW.order],
        [GUTTER.farLeft, ROW.s3],
      ],
    },
    { from: "nlp", to: "facts", label: "coded facts with provenance", labelAt: 0.55 },

    // Step 4: resolve the drug, expand, retrieve and rerank passages.
    { from: "orch", to: "resolver", bidirectional: true, via: [[C.right, O_TOP]] },
    {
      from: "orch",
      to: "passages",
      label: "passages by concept id",
      labelAt: 0.62,
      via: [
        [O_RIGHT, 186],
        [GUTTER.stub, 186],
        [GUTTER.stub, STORE_Y.passages],
      ],
    },
    {
      from: "orch",
      to: "cross",
      bidirectional: true,
      via: [
        [GUTTER.drop, O_FOOT],
        [GUTTER.drop, ROW.s1 - SH / 2 - 4],
      ],
    },

    // Step 5: abstain by rule, check every sentence, store the answer with its inputs.
    { from: "orch", to: "checks", bidirectional: true, via: [[C.left, O_FOOT]] },
    {
      from: "orch",
      to: "answers",
      label: `${fmt(CONTEXT.total)}-token context; answer + inputs`,
      labelAt: 0.38,
      via: [
        [O_RIGHT, ROW.main],
        [C.store, ROW.main],
      ],
    },

    // Step 6: order cards through CDS Hooks, on the same rules.
    { from: "ehr", to: "hooks", flow: true, packet: true, bidirectional: true },
    { from: "hooks", to: "rules", bidirectional: true },

    // Step 7: a release gate between the build and the snapshot; an urgent local edge goes live within 24 h.
    { from: "build", to: "gate" },
    {
      from: "gate",
      to: "snapshot",
      via: [
        [GUTTER.bend, ASYNC_Y.gate],
        [GUTTER.bend, STORE_Y.snapshot],
      ],
    },

    // Step 8: evaluate and review inside the boundary; close the loop into the gate.
    { from: "answers", to: "eval" },
    { from: "eval", to: "gate" },
  ],
};

export default spec;
