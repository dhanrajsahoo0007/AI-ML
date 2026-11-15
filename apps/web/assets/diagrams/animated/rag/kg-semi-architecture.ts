import type { DiagramSpec } from "@/components/diagrams/types";

// Semiconductor yield case study: a knowledge graph plus an LLM assistant that helps fab engineers find the root
// cause of a yield excursion. Built up in six steps, one gap at a time:
// 1 lot history becomes a graph · 2 equipment, metrology and test data join it · 3 code compares failing lots with
// passing lots (the accent: statistics run in code, not in the LLM) · 4 engineers ask in plain language · 5 past
// reports add known causes · 6 suspects come back with evidence. Nodes never move between steps.
//
// Zones follow CASE-STUDY-FORMAT.md ("Architecture diagram groups"): fab systems and the engineer are neutral, the
// ingest workers are the orange async pipeline, the graph and the report index are violet storage, the investigation
// path is green.
//
// Layout: five columns at x 90 | 265 | 440 | 615 | 790, cards 150 wide, zones 160 wide with 15 px corridors at
// x 177 | 352 | 527 | 702. Sources on rows 110 | 200 | 290 | 380 | 470. The four structured sources join on a bus
// in the x 177 corridor; past reports fork at x 352 into the graph and the report index. The assistant's two
// downward edges leave its bottom edge at x 590 and 640 (exact border points, so both lines start vertical).

const X = [90, 265, 440, 615, 790] as const;
const ROW = [110, 200, 290, 380, 470] as const;
const W = 150;
const MID = 245; // the row of the ingest card, the graph, the assistant and the engineer
const BUS = 177; // corridor between the fab systems and the async pipeline
const FORK = 352; // corridor between the async pipeline and storage
// The assistant card is 58 tall at y 245: its bottom border plus the 4 px edge gap is y 278.
const ASSISTANT_BOTTOM = MID + 29 + 4;

const spec: DiagramSpec = {
  title: "Semiconductor yield: a manufacturing graph, statistics in code and an LLM assistant",
  width: 880,
  height: 570,
  steps: [
    { title: "Lot history becomes a graph" },
    { title: "Equipment, metrology and test data join it" },
    { title: "Code compares failing lots with passing lots" },
    { title: "Engineers ask in plain language" },
    { title: "Past reports add known causes" },
    { title: "Suspects come back with evidence" },
  ],
  zones: [
    { id: "fab", title: "Fab systems", tone: "neutral", x: 10, y: 50, w: 160, h: 500 },
    { id: "async", title: "Async pipeline", tone: "orange", x: 185, y: 50, w: 160, h: 500 },
    { id: "storage", title: "Storage", tone: "violet", x: 360, y: 50, w: 160, h: 500 },
    { id: "core", title: "Investigation", tone: "green", x: 535, y: 50, w: 160, h: 500 },
    { id: "clients", title: "Clients", tone: "neutral", x: 710, y: 50, w: 160, h: 500 },
  ],
  nodes: [
    // Fab systems
    { id: "mes", label: "Lot history", sub: "MES routes", icon: "log", x: X[0], y: ROW[0], w: W },
    { id: "equip", label: "Equipment", sub: "sensor logs", icon: "meter", step: 2, x: X[0], y: ROW[1], w: W },
    { id: "metro", label: "Metrology", sub: "inspection", icon: "search", step: 2, x: X[0], y: ROW[2], w: W },
    { id: "test", label: "Test + yield", sub: "per wafer", icon: "chart", step: 2, x: X[0], y: ROW[3], w: W },
    { id: "reports", label: "Past reports", sub: "FMEA, notes", icon: "file", step: 5, x: X[0], y: ROW[4], w: W },

    // Async pipeline
    {
      id: "ingest",
      label: "Ingest",
      sub: "resolve names",
      icon: "pipeline",
      tone: "orange",
      fill: "pastel",
      x: X[1],
      y: MID,
      w: W,
    },
    {
      id: "extract",
      label: "Extract",
      sub: "LLM + embed",
      icon: "model",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: X[1],
      y: ROW[4],
      w: W,
    },

    // Storage
    {
      id: "kg",
      label: "Knowledge graph",
      sub: "lot paths",
      icon: "graph",
      tone: "violet",
      variant: "glyph",
      x: X[2],
      y: MID,
    },
    {
      id: "reportIndex",
      label: "Report index",
      sub: "past excursions",
      icon: "vector-index",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: X[2],
      y: ROW[4],
    },

    // Investigation path
    {
      id: "common",
      label: "Commonality",
      sub: "bad vs good",
      icon: "chart",
      tone: "green",
      accent: true,
      step: 3,
      x: X[3],
      y: ROW[0],
      w: W,
    },
    {
      id: "assistant",
      label: "LLM assistant",
      sub: "Cypher, search",
      icon: "model",
      tone: "green",
      fill: "pastel",
      step: 4,
      x: X[3],
      y: MID,
      w: W,
    },

    // Clients
    { id: "engineer", label: "Engineer", sub: "yield team", icon: "users", step: 4, x: X[4], y: MID, w: W },
    {
      id: "suspects",
      label: "Suspects",
      sub: "with evidence",
      icon: "link",
      fill: "soft",
      step: 6,
      x: X[4],
      y: ROW[3],
      w: W,
    },
  ],
  edges: [
    // Steps 1-2: every structured source joins one bus into the ingest workers, which write the graph.
    {
      from: "mes",
      to: "ingest",
      packet: true,
      via: [
        [BUS, ROW[0]],
        [BUS, MID],
      ],
    },
    {
      from: "equip",
      to: "ingest",
      packet: true,
      via: [
        [BUS, ROW[1]],
        [BUS, MID],
      ],
    },
    {
      from: "metro",
      to: "ingest",
      packet: true,
      via: [
        [BUS, ROW[2]],
        [BUS, MID],
      ],
    },
    {
      from: "test",
      to: "ingest",
      packet: true,
      via: [
        [BUS, ROW[3]],
        [BUS, MID],
      ],
    },
    { from: "ingest", to: "kg", packet: true, delay: 0.6 },

    // Step 3: the analysis reads lot paths out of the graph.
    {
      from: "kg",
      to: "common",
      label: "lot paths",
      labelAt: 0.75,
      packet: true,
      delay: 1.2,
      via: [[X[2], ROW[0]]],
    },

    // Step 4: the engineer asks; the assistant queries the graph and runs the analysis.
    { from: "engineer", to: "assistant", packet: true },
    { from: "assistant", to: "kg", packet: true, delay: 0.6 },
    { from: "assistant", to: "common", label: "run test", packet: true, delay: 0.6 },

    // Step 5: past reports become cause-effect relations in the graph and chunks in the report index.
    { from: "reports", to: "extract", packet: true },
    { from: "extract", to: "reportIndex", packet: true, delay: 0.6 },
    {
      from: "extract",
      to: "kg",
      packet: true,
      delay: 0.6,
      via: [
        [FORK, ROW[4]],
        [FORK, MID],
      ],
    },

    // Step 6: similar past incidents, then the ranked suspects for the engineer to confirm.
    {
      from: "assistant",
      to: "reportIndex",
      label: "similar reports",
      labelAt: 0.8,
      packet: true,
      delay: 1.2,
      step: 6,
      via: [
        [590, ASSISTANT_BOTTOM],
        [590, ROW[4]],
      ],
    },
    {
      from: "assistant",
      to: "suspects",
      packet: true,
      delay: 1.8,
      via: [
        [640, ASSISTANT_BOTTOM],
        [640, ROW[3]],
      ],
    },
    { from: "suspects", to: "engineer", label: "engineer decides", dashed: true },
  ],
};

export default spec;
