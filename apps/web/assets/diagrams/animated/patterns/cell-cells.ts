import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Brightpost split into ten cells behind a thin router (bulkheads-and-cell-architecture, the Architecture figure).
// Three steps: 1 a thin router maps each shopper id to one of ten cells, each a full copy of the stack (app servers
// and database) · 2 a bad deploy goes to cell 1 only (the first wave): one cell in ten, 10 % of shoppers, notices ·
// 3 the cells are at their maximum size, so the control plane adds cell 11 and updates the router's map; new
// shoppers land there and no existing shopper moves.
// Working: 2,000,000 shoppers a day (SHOP.shoppersPerDay) ÷ 10 cells = 200,000 per cell; one bad cell = 1 ÷ 10 =
// 10 % of shoppers, against 100 % with one stack. Ten cells are illustrative.
// Layout (880 × 500): shoppers at x 90, router at x 300, the cells in a column at x 670 inside one zone; the deploy
// pipeline above the router, the control plane below it.
// Colours (PATTERN_TONE): shoppers orange (traffic), router green (the pattern, the one accent), cells teal
// (compute: each a full stack), the bad deploy red, the control plane neutral (plumbing).
// Fact check (2026-11-16, AWS Well-Architected "Reducing the Scope of Impact with Cell-Based Architecture"): the
// router is "the thinnest possible layer", a cell is a complete workload that shares no state with other cells, the
// control plane provisions cells and migrates customers, and deploys go out in waves, cell by cell.

const CELLS = 10;
const perCell = SHOP.shoppersPerDay / CELLS; // 200,000

const cell = (id: string, label: string, sub: string, y: number, step = 1) => ({
  id,
  label,
  sub,
  icon: "server",
  tone: PATTERN_TONE.compute,
  fill: "pastel" as const,
  x: 670,
  y,
  w: 230,
  step,
});

const spec: DiagramSpec = {
  title: "Ten cells behind a thin router",
  width: 880,
  height: 500,
  steps: [
    { title: "Ten cells behind a thin router" },
    { title: "A bad deploy reaches one cell" },
    { title: "A new cell for new shoppers" },
  ],
  zones: [
    {
      id: "cells",
      title: "Cells: full copies of the stack",
      tone: PATTERN_TONE.compute,
      x: 520,
      y: 20,
      w: 300,
      h: 470,
    },
  ],
  nodes: [
    {
      id: "shoppers",
      label: "Shoppers",
      sub: `${n(SHOP.shoppersPerDay)} a day`,
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 90,
      y: 250,
      w: 160,
    },
    {
      id: "router",
      label: "Cell router",
      sub: "shopper id → cell",
      icon: "router",
      tone: PATTERN_TONE.pattern,
      accent: true,
      x: 310,
      y: 250,
      w: 190,
    },
    cell("c1", "Cell 1", `app + DB, ${n(perCell)} shoppers`, 80),
    cell("c2", "Cell 2", `app + DB, ${n(perCell)} shoppers`, 165),
    cell("c39", "Cells 3 to 9", "the same stack, 7 times", 250),
    cell("c10", "Cell 10", `app + DB, ${n(perCell)} shoppers`, 335),
    cell("c11", "Cell 11 (new)", "takes new shoppers only", 435, 3),
    {
      id: "deploy",
      label: "Deploy v2",
      sub: "wave 1: one cell",
      icon: "pipeline",
      tone: PATTERN_TONE.fail,
      fill: "soft",
      x: 310,
      y: 80,
      w: 190,
      step: 2,
    },
    {
      id: "control",
      label: "Control plane",
      sub: "adds cells, moves shoppers",
      icon: "coordinator",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      x: 310,
      y: 435,
      w: 230,
      step: 3,
    },
  ],
  edges: [
    { from: "shoppers", to: "router", packet: true },
    { from: "router", to: "c1", label: "10 % each", packet: true },
    { from: "router", to: "c2", packet: true, delay: 0.2 },
    { from: "router", to: "c39", packet: true, delay: 0.4 },
    { from: "router", to: "c10", packet: true, delay: 0.6 },
    { from: "deploy", to: "c1", label: "bad build", tone: PATTERN_TONE.fail, step: 2 },
    { from: "control", to: "c11", label: "provision", dashed: true, step: 3 },
    { from: "control", to: "router", label: "map update", dashed: true, step: 3 },
    { from: "router", to: "c11", packet: true, delay: 0.8, step: 3 },
  ],
};

export default spec;
