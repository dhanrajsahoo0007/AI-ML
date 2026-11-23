import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { FRESHNESS, STATS, TRACES } from "@/components/diagrams/presets/gcase-kgsemi";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// One chamber, one node (kg-semiconductor-case-study, deep dive 1; design sheet §15.1, §7, §10.3; review item 34). The
// names are INVENTED and illustrative:
//   One process chamber appears as five names: MES "ETCH04-B", FDC "E04_PM2", CMMS asset "AST-118832", RMS
//   "ETCH04 CH-B", E90 module "PM2". The identity map (PostgreSQL, owned by equipment engineering, bitemporal, with
//   valid dates) resolves each to one master id; an unresolved name waits FRESHNESS.quarantineHoldMin = 10 minutes (it
//   may be early, such as an E90 location before the MES split), then goes to quarantine, never into the graph.
//   The red case (review item 34): without the FDC and CMMS mappings, the counts stay on ETCH04-B (80% vs 4.0% on
//   held-out lots: the effect size survives) but work order WO-55120 and the traces (DC bias +6.1%) attach to E04_PM2.
//   The hypothesis keeps its effect size and loses its timing (change-point alignment) and sensor evidence; its
//   confidence drops from high to medium.
//   Coverage targets (sheet N4): 100% of process chambers mapped in MES, FDC and CMMS; true unmapped ≤ 0.1% of events a
//   day; FDC trace context match ≥ TRACES.contextMatchTarget = 99.5% per tool type.
// Steps: 1 five names for one chamber · 2 the identity map: resolve, hold, quarantine, one node · 3 the split case.
// Layout (880 wide): sources in a column at x 20 (210 × 44, 56 apart), each arrow leaving level and bending at x 275
// into the map at x 320 (230 × 84, centred on the middle source) with the hold box under it; the chamber node at x 640; the red case in a band from y 372: two red boxes and the result under them.
// Colours (GENAI_TONE): fab systems teal (tool), the identity map blue (data), hold and quarantine neutral, the chamber
// violet (the graph), the split case red (failure).

const SRC_X = 20;
const SRC_W = 210;
const SRC_H = 44;
const srcY = (i: number) => 50 + i * 56;
const MAP = { x: 320, y: 142, w: 230, h: 84 };
const HOLD = { x: 320, y: 268, w: 230, h: 52 };
const NODE = { x: 640, y: 158, w: 220, h: 52 };
const BAND = 372;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, ...extra });

const arrow = (id: string, from: string, to: string, step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  ...extra,
});

const text = (id: string, y: number, label: string, step: number, x = 12, w = 856): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const SOURCES = [
  { id: "mes", system: "MES", name: "ETCH04-B" },
  { id: "fdc", system: "FDC", name: "E04_PM2" },
  { id: "cmms", system: "CMMS asset", name: "AST-118832" },
  { id: "rms", system: "RMS", name: "ETCH04 CH-B" },
  { id: "e90", system: "E90 module", name: "PM2" },
];

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const RED_W = 410;

const spec: LayoutSpec = {
  kind: "layout",
  title: "One chamber, five names, one node: an owned identity map, and what a missing mapping costs",
  width: 880,
  height: BAND + 196,
  steps: [
    { title: "One chamber, five names across the fab's systems" },
    { title: `The identity map: resolve, hold ${FRESHNESS.quarantineHoldMin} minutes, then quarantine; one node` },
    { title: "Without the mapping: the effect size stays, the timing and sensor evidence go" },
  ],
  shapes: [
    // Step 1: five names (illustrative).
    text("h1", 14, "Five systems, five names (illustrative)", 1, SRC_X, SRC_W),
    ...SOURCES.map((s, i) => box(`src-${s.id}`, SRC_X, srcY(i), SRC_W, SRC_H, s.name, s.system, GENAI_TONE.tool, 1)),

    // Step 2: the identity map, the hold-and-quarantine path, one chamber node.
    box("map", MAP.x, MAP.y, MAP.w, MAP.h, "Identity map", "owned by equipment eng.", GENAI_TONE.data, 2, {
      highlight: true,
    }),
    ...SOURCES.map((s, i) =>
      arrow(`a-${s.id}`, `src-${s.id}`, "map", 2, { quiet: true, via: [[275, srcY(i) + SRC_H / 2]] })
    ),
    box(
      "hold",
      HOLD.x,
      HOLD.y,
      HOLD.w,
      HOLD.h,
      `Hold ${FRESHNESS.quarantineHoldMin} min, then quarantine`,
      "early or unmapped: never in the graph",
      "neutral",
      2
    ),
    arrow("a-hold", "map", "hold", 2, { label: "unresolved", dashed: true }),
    box("chamber", NODE.x, NODE.y, NODE.w, NODE.h, "Chamber ETCH04-B", "one node, one master id", GENAI_TONE.store, 2),
    arrow("a-node", "map", "chamber", 2, { label: "resolved" }),
    {
      id: "note-2",
      type: "text",
      x: NODE.x,
      y: NODE.y + NODE.h + 14,
      w: NODE.w,
      h: 36,
      label: `Coverage daily: 100% mapped;\nFDC context match ≥ ${pct(TRACES.contextMatchTarget, 1)}`,
      tone: PROD_TONE.infra,
      step: 2,
    },

    // Step 3: the split case.
    text("h3", BAND - 4, "Without the FDC and CMMS mappings, the chamber is two nodes", 3),
    box(
      "split-mes",
      20,
      BAND + 24,
      RED_W,
      56,
      "ETCH04-B keeps the counts",
      `${pct(STATS.heldOutB.p)} vs ${pct(STATS.heldOutSister.p, 1)}: the effect size stays`,
      GENAI_TONE.failure,
      3
    ),
    box(
      "split-fdc",
      450,
      BAND + 24,
      RED_W,
      56,
      "E04_PM2 gets WO-55120 and the traces",
      `no change-point, no DC bias +${STATS.traceShiftPct}% on ETCH04-B`,
      GENAI_TONE.failure,
      3
    ),
    box(
      "split-result",
      235,
      BAND + 124,
      410,
      52,
      "Confidence drops: high → medium",
      "timing and sensor features vanish from the hypothesis",
      GENAI_TONE.failure,
      3,
      { highlight: true }
    ),
    arrow("a-split-1", "split-mes", "split-result", 3),
    arrow("a-split-2", "split-fdc", "split-result", 3),
  ],
};

export default spec;
