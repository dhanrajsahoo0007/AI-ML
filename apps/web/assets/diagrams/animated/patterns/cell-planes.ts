import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// The control plane fails and the data plane keeps serving (bulkheads-and-cell-architecture, static stability).
// Two steps: 1 the control plane (provision cells, move shoppers, write the cell map) changes the system and pushes
// the map to the router; the data plane (router and cells) serves shoppers from the router's own copy of the map ·
// 2 the control plane is down: no new cells and no moves, but the router keeps routing from its last copy, so
// shoppers see nothing.
// Working: the data plane's load is the shop's peak, 2,300 reads/s (SHOP.peakReadsPerSecond) and 300 orders/s
// (SHOP.peakOrdersPerSecond); none of it calls the control plane, so all of it carries on.
// Layout (820 × 350): two bands, control plane above, data plane below; the map arrow crosses between them.
// Colours (PATTERN_TONE): control plane neutral (plumbing), shoppers orange, router green (the pattern), cells teal,
// the outage red. Fact check (2026-11-16, AWS Builders' Library, "Static stability using Availability Zones"): a
// control plane makes changes (EC2: launching an instance), a data plane does the ongoing work (routing packets,
// EBS reads and writes); existing EC2 instances keep running when the control plane is impaired.

const shapes: LayoutShape[] = [
  // Control plane band.
  {
    id: "cp-prov",
    type: "box",
    x: 40,
    y: 66,
    w: 170,
    h: 50,
    label: "Provision cells",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  },
  {
    id: "cp-move",
    type: "box",
    x: 230,
    y: 66,
    w: 170,
    h: 50,
    label: "Move shoppers",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  },
  {
    id: "cp-map",
    type: "box",
    x: 420,
    y: 66,
    w: 170,
    h: 50,
    label: "Write cell map",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  },
  // Data plane band.
  {
    id: "dp-shoppers",
    type: "box",
    x: 40,
    y: 226,
    w: 160,
    h: 56,
    label: "Shoppers",
    sub: `${n(SHOP.peakReadsPerSecond)} reads/s`,
    tone: PATTERN_TONE.traffic,
    fill: "pastel",
  },
  {
    id: "dp-router",
    type: "box",
    x: 300,
    y: 226,
    w: 230,
    h: 56,
    label: "Cell router",
    sub: "its own copy of the map",
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
  },
  {
    id: "dp-cells",
    type: "box",
    x: 620,
    y: 226,
    w: 170,
    h: 56,
    label: "Cells 1 to 10",
    sub: "own data, own capacity",
    tone: PATTERN_TONE.compute,
    fill: "pastel",
  },
  { id: "a-req", type: "arrow", x: 0, y: 0, from: "dp-shoppers", to: "dp-router", packet: true },
  { id: "a-route", type: "arrow", x: 0, y: 0, from: "dp-router", to: "dp-cells", packet: true },
  { id: "a-map", type: "arrow", x: 0, y: 0, from: "cp-map", to: "dp-router", dashed: true },
  {
    id: "map-note",
    type: "text",
    x: 490,
    y: 150,
    w: 180,
    h: 18,
    label: "pushes map changes",
    tone: PATTERN_TONE.infra,
  },
  // Step 2: the control plane is down.
  {
    id: "cp-down",
    type: "box",
    x: 610,
    y: 66,
    w: 180,
    h: 50,
    label: "Control plane down",
    sub: "no new cells, no moves",
    tone: PATTERN_TONE.fail,
    fill: "soft",
    step: 2,
    highlight: true,
  },
  {
    id: "dp-note",
    type: "text",
    x: 40,
    y: 296,
    w: 750,
    h: 18,
    label: `The router routes from its last map: ${n(SHOP.peakReadsPerSecond)} reads/s and ${SHOP.peakOrdersPerSecond} orders/s carry on`,
    tone: PATTERN_TONE.pattern,
    step: 2,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The control plane is down; the data plane keeps serving",
  width: 820,
  height: 340,
  groups: [
    {
      id: "g-cp",
      title: "Control plane: changes the system",
      tone: PATTERN_TONE.infra,
      x: 20,
      y: 34,
      w: 790,
      h: 100,
    },
    {
      id: "g-dp",
      title: "Data plane: serves shoppers",
      tone: PATTERN_TONE.infra,
      x: 20,
      y: 194,
      w: 790,
      h: 132,
    },
  ],
  shapes,
  steps: [{ title: "Two planes" }, { title: "The control plane is down" }],
};

export default spec;
