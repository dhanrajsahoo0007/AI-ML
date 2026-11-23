import type { DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { GENAI_TONE, HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { COLUMNAR, GRAPH } from "@/components/diagrams/presets/gcase-kgsemi";

// The yield root-cause assistant on a fab knowledge graph (genai-system-design/case-studies/kg-semiconductor-case-study),
// the hero. Built one requirement at a time, exactly as design sheet §8 lists it (SYSTEM-DESIGN/plans/genai-design/
// design/kg-semiconductor-case-study.md, v3). Every zone sits inside the fab's site boundary (drawn in
// kg-semi/site-boundary, not here):
//   1 A model on site, behind a scope check (F2, N6): engineer app → gateway (SSO, scope role, audit) → orchestrator →
//     on-site model (2 hosts); the model writes SQL from a schema dump.
//   2 One graph, one id per thing (F4, F5, N4, N7): fab systems → ingest log and identity resolution (hold 10 minutes,
//     then quarantine) → knowledge graph (bitemporal upserts). The orchestrator's free queries to the graph
//     (`until: 2`) are replaced in step 3 by the guard on the same lane.
//   3 Linked literals, templates first, one guard chain for both stores (F2, N2, N10): query guard (linker, 40
//     templates, read-only roles and caps), encoders, columnar store (fed by the same ingest log).
//   4 Statistics in code (F1, N1): statistics engine (cohort counts from the columnar store), trace read API, FDC
//     trace store (samples by reference, never copied).
//   5 Ranked hypotheses with evidence (F1, N3): evidence and ranker (reads the graph through the guard's templates),
//     checks.
//   6 Written knowledge becomes approved edges and citable passages (F3, F6): document extraction and review →
//     document index (chunks) and the graph (approved edges); evidence reads passages.
//   7 The 8D owner confirms; verdicts close the loop (F6, F7): verdicts and audit.
//   8 Evaluate on as-of replays and seeded faults (N1, N2, N3): replay and release gate reads the verdicts.
// Numbers: GRAPH.nodeCount ≈ 62.7M and COLUMNAR.waferStepRows ≈ 1.92B from presets/gcase-kgsemi.ts (estimates for
// the illustrative fab). Card subs are kept to about (w − 70) ÷ 6 characters, so the template count (40) and the
// question volume (1,080 a day) are left to the page and the sequence.
//
// Layout (1200 × 740, genaiZones() from presets/genai-case.ts). The clients tab is "Engineers and fab" (17 characters,
// 167 px): the sheet's "Engineers and fab systems" is 233 px wide and would overlap the Edge tab, which starts at
// x 228. The "Models and analytics" tab is 20 × 8.2 + 28 = 192 px wide, x 421–613 at y 316–344, so no line crosses the
// core/services boundary left of x 613: the services column is reached down the left gutter x 394 (one trunk with
// taps at 400, 505, 600, continuing to the bottom lane y 705).
//   Clients x 105: engineer app 187 (the question line), fab systems 300 (the event line, y 300, between the core zone,
//   which ends at 290, and the services tab, which starts at 316; it crosses the trunk once, at x 394).
//   Edge x 297: gateway 187.
//   Investigation orchestration, columns x 490 | 660, rows 120 | 187 (48 tall): query guard, evidence and ranker
//   (top); orchestrator (accent), checks (middle); the bottom row is left empty.
//   Models and analytics, columns x 490 | 660: model 400, statistics 505, encoders 600 (left, on the trunk) | trace read
//   API 600 (right, under the statistics engine's L at x 660).
//   Offline x 879 (190 × 44): document extraction 200, ingest and identity 300 (the event line's end), replay and gate
//   470. Data and state x 1098 (glyphs ≥ 115 apart): document index 125, knowledge graph 240, columnar store 355,
//   verdicts and audit 470, FDC trace store 600.
// Routing ("readers over the top, writers from the left"):
//   - The guard's two reads go up from its top to the lane y 84 (under the zone tabs, which end at y 74; above row 1,
//     which starts at y 96), along it to the store column's right gutter x 1168 and into the graph's and the columnar
//     store's right sides. So the ingest log's two writes (a fan from x 974) reach both stores' left sides without
//     crossing a read.
//   - Statistics → columnar is a straight line from the statistics engine (y ≈ 486 at x 569) to the columnar store's
//     left side (y ≈ 366), above replay (it passes x 784 at y ≈ 432; replay starts at 448) and below ingest.
//   - Statistics → trace API is an L through the empty slot (660, 505); trace → FDC store is level at y 600, under
//     Offline (which ends at y 500).
//   - Evidence → document index runs from the evidence card's right side at y 120 over extraction (which starts at
//     y 178); extraction's two writes leave its right side, up to the index and down to the graph.
//   - Verdicts go down the trunk, along the bottom lane y 705 under every zone, and up the gutter x 1168 into the
//     verdicts store's right side; replay reads it level at y 470.
// Colours (GENAI_TONE roles): the engineer orange; fab systems teal (systems the assistant reads); gateway neutral;
// query guard, checks and the release gate lime (check); evidence and ranker and statistics lime (ranking); model and
// encoders green; trace read API teal (a tool); ingest and extraction blue (data); stores violet glyphs; the
// orchestrator the one accent.

const C = { clients: 105, edge: 297, left: 490, right: 660, async: 879, store: 1098 } as const;
const ROW = { c1: 120, c2: 187, fab: 300, s1: 400, s2: 505, s3: 600 } as const;
const STORE_Y = { docs: 125, graph: 240, columnar: 355, verdicts: 470, fdc: 600 } as const;
const ASYNC_Y = { extraction: 200, ingest: 300, replay: 470 } as const;
const GUTTER = { left: 394, top: 84, bottom: 705, storeRight: 1168 } as const;
const W = 150;
const CH = 48;
const AW = 190;
const AH = 44;

const card = (
  id: string,
  label: string,
  sub: string,
  icon: string | undefined,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => ({ id, label, sub, ...(icon ? { icon } : {}), x, y, w: W, h: CH, step, fill: "pastel", ...extra });

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

/** The trunk: out of the orchestrator's left side, down the left gutter. */
const TRUNK: [number, number] = [GUTTER.left, 214];
/** The read lane: up from the guard's top, along y 84, down the store column's right gutter. */
const readLane = (y: number): [number, number][] => [
  [C.left, GUTTER.top],
  [GUTTER.storeRight, GUTTER.top],
  [GUTTER.storeRight, y],
];

const millions = (v: number) => `${(v / 1e6).toFixed(1)}M`;
const billions = (v: number) => `${(v / 1e9).toFixed(2)}B`;

const spec: DiagramSpec = {
  title: "Yield root-cause assistant: a fab knowledge graph, guarded queries, statistics in code, ranked hypotheses",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "A model on site, behind a scope check", covers: "F2, N6" },
    { title: "One graph, one id per thing", covers: "F4, F5, N4, N7" },
    { title: "Linked literals, templates first, one guard chain for both stores", covers: "F2, N2, N10" },
    { title: "Statistics in code: time-matched, within lot, max-T, held-out", covers: "F1, N1" },
    { title: "Ranked hypotheses with evidence", covers: "F1, N3" },
    { title: "Written knowledge becomes approved edges and citable passages", covers: "F3, F6" },
    { title: "The 8D owner confirms; verdicts close the loop", covers: "F6, F7" },
    { title: "Evaluate on as-of replays and seeded faults", covers: "N1, N2, N3" },
  ],
  zones: genaiZones({
    clients: "Engineers and fab",
    core: "Investigation orchestration",
    services: "Models and analytics",
  }),
  nodes: [
    // Engineers and fab systems
    card("engineer", "Engineer app", "web, YMS button", "users", C.clients, ROW.c2, 1, {
      tone: GENAI_TONE.user,
    }),
    card("fab", "Fab systems", "MES, FDC, YMS", "building", C.clients, ROW.fab, 2, { tone: GENAI_TONE.tool }),

    // Edge and gateway
    card("gateway", "Gateway", "SSO, scope, audit", "gateway", C.edge, ROW.c2, 1, { w: 154 }),

    // Investigation orchestration
    card("guard", "Query guard", "linker, caps", "shield", C.left, ROW.c1, 3, {
      tone: GENAI_TONE.check,
    }),
    card("evidence", "Evidence ranker", "change-points", "chart", C.right, ROW.c1, 5, {
      w: 164,
      tone: GENAI_TONE.rank,
    }),
    {
      id: "orch",
      label: "Orchestrator",
      sub: "fixed workflow",
      icon: "coordinator",
      accent: true,
      x: C.left,
      y: ROW.c2,
      w: W,
      h: CH,
      step: 1,
    },
    card("checks", "Checks", "numbers, words", "approval", C.right, ROW.c2, 5, { tone: GENAI_TONE.check }),

    // Models and analytics
    card("model", "On-site model", "2 hosts, low effort", "model", C.left, ROW.s1, 1, {
      w: 156,
      tone: GENAI_TONE.model,
    }),
    card("stats", "Statistics", "within lot, max-T", "graph", C.left, ROW.s2, 4, { tone: GENAI_TONE.rank }),
    card("encoders", "Encoders", "router, slots, maps", "embedder", C.left, ROW.s3, 3, {
      w: 158,
      tone: GENAI_TONE.model,
    }),
    card("trace", "Trace read API", "summaries", "signal", C.right, ROW.s3, 4, { w: 154, tone: GENAI_TONE.tool }),

    // Offline pipelines
    offline("extraction", "Doc extraction", "FMEA, 8D, approval", "file", ASYNC_Y.extraction, 6, GENAI_TONE.data),
    offline("ingest", "Ingest, identity", "one log, quarantine", "pipeline", ASYNC_Y.ingest, 2, GENAI_TONE.data),
    offline("replay", "Replay, release gate", "as-of, seeded faults", "approval", ASYNC_Y.replay, 8, GENAI_TONE.check),

    // Data and state
    store("docs", "Document index", "SOPs, FMEA, 8D", "vector-index", STORE_Y.docs, 6),
    store("graph", "Knowledge graph", `${millions(GRAPH.nodeCount)} nodes, as-of`, "graph", STORE_Y.graph, 2),
    store(
      "columnar",
      "Columnar store",
      `${billions(COLUMNAR.waferStepRows)} wafer-steps`,
      "database",
      STORE_Y.columnar,
      3
    ),
    store("verdicts", "Verdicts, audit", "ranking_seen, 5 years", "ledger", STORE_Y.verdicts, 7),
    store("fdc", "FDC trace store", "existing; not copied", "trace", STORE_Y.fdc, 4),
  ],
  edges: [
    // Step 1: scope before data; a model on site.
    { from: "engineer", to: "gateway", flow: true, packet: true, bidirectional: true },
    { from: "gateway", to: "orch", flow: true, packet: true, bidirectional: true, delay: 0.6 },
    {
      from: "orch",
      to: "model",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 1.2,
      via: [TRUNK, [GUTTER.left, ROW.s1]],
    },

    // Step 2: one ordered ingest log, identity resolved, bitemporal upserts; the model still writes free queries.
    { from: "fab", to: "ingest", label: "events, in order", labelAt: 0.18 },
    { from: "ingest", to: "graph" },
    { from: "orch", to: "graph", label: "free queries", labelAt: 0.6, dashed: true, until: 2, via: readLane(240) },

    // Step 3: link literals, templates first, one guard chain for both stores.
    { from: "orch", to: "guard", bidirectional: true },
    { from: "guard", to: "graph", label: "read-only", labelAt: 0.6, via: readLane(STORE_Y.graph) },
    { from: "guard", to: "columnar", via: readLane(STORE_Y.columnar) },
    { from: "ingest", to: "columnar" },
    { from: "orch", to: "encoders", bidirectional: true, via: [TRUNK, [GUTTER.left, ROW.s3]] },

    // Step 4: statistics in code; traces by reference.
    { from: "orch", to: "stats", bidirectional: true, via: [TRUNK, [GUTTER.left, ROW.s2]] },
    { from: "stats", to: "columnar", label: "cohort counts", labelAt: 0.3 },
    { from: "stats", to: "trace", via: [[C.right, ROW.s2]] },
    { from: "trace", to: "fdc", label: "samples by reference", labelAt: 0.5 },

    // Step 5: evidence through the templates; ranked; checked.
    { from: "orch", to: "evidence", bidirectional: true },
    { from: "evidence", to: "guard", bidirectional: true },
    { from: "orch", to: "checks", bidirectional: true },

    // Step 6: approved edges and citable passages.
    { from: "extraction", to: "docs" },
    { from: "extraction", to: "graph", label: "approved edges", labelAt: 0.62 },
    { from: "evidence", to: "docs", label: "passages", labelAt: 0.55 },

    // Step 7: verdicts and audit.
    {
      from: "orch",
      to: "verdicts",
      label: "verdicts, ranking_seen, audit",
      labelAt: 0.55,
      via: [
        TRUNK,
        [GUTTER.left, GUTTER.bottom],
        [GUTTER.storeRight, GUTTER.bottom],
        [GUTTER.storeRight, STORE_Y.verdicts],
      ],
    },

    // Step 8: replay on as-of state.
    { from: "verdicts", to: "replay" },
  ],
};

export default spec;
