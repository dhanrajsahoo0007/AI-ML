import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// Learning paths (cloud/start-here/learning-paths): the same seven hubs read in different orders. The hubs are
// fixed columns along the top. Each row is one reading path; a cell under a hub says when the path enters that hub
// (its order number) and how many of that hub's pages it reads. An empty cell means the path skips the hub.
// One idea: same pages, different order.
//
// Rows: "From zero" (teal), "Interview prep" (orange), then the certification-minded path split into its three
// levels (violet), inside one dotted group. Step 1 draws the hubs and the first path, step 2 the interview path,
// step 3 the three levels.
//
// Geometry: row labels are text in x 12-130. Columns start at x 140 and are 88 wide with a gap of 4, so the seventh
// ends at 780 (canvas 790). Headers are boxes at y 20-64. Rows are 56 apart from y 82 (cells 46 tall); the group
// for the three levels starts at y 184 and leaves 22 units above its first row for the group's tab.
// Cell labels fit 88 - 8 = 80 px at 6.2 px per character: "Fundamentals" (12 characters) is the longest header.
// The cell numbers and page counts below match the ordered lists on the page.

const HUBS = [
  { id: "start", label: "Start here" },
  { id: "fund", label: "Fundamentals" },
  { id: "net", label: "Networking" },
  { id: "comp", label: "Compute" },
  { id: "data", label: "Data" },
  { id: "res", label: "Resilience" },
  { id: "ops", label: "Operations" },
] as const;

type HubId = (typeof HUBS)[number]["id"];

const COL_X = (i: number) => 140 + i * 92;
const COL = Object.fromEntries(HUBS.map((h, i) => [h.id, COL_X(i)])) as Record<HubId, number>;

// One row per path. `cells` maps a hub to [order label, pages read in that hub].
const ROWS: {
  id: string;
  label: string;
  y: number;
  tone: "teal" | "orange" | "violet";
  step: number;
  cells: Partial<Record<HubId, [string, number]>>;
}[] = [
  {
    id: "zero",
    label: "From zero",
    y: 82,
    tone: "teal",
    step: 1,
    cells: {
      start: ["1st, 8th", 2],
      fund: ["2nd", 5],
      net: ["3rd", 3],
      comp: ["4th", 2],
      data: ["5th", 2],
      res: ["6th", 1],
      ops: ["7th", 1],
    },
  },
  {
    id: "prep",
    label: "Interview prep",
    y: 138,
    tone: "orange",
    step: 2,
    cells: { start: ["1st, 6th", 6], res: ["2nd", 4], data: ["3rd", 1], net: ["4th", 1], fund: ["5th", 1] },
  },
  {
    id: "found",
    label: "Foundation",
    y: 218,
    tone: "violet",
    step: 3,
    cells: { start: ["1st, 3rd", 2], fund: ["2nd", 6] },
  },
  {
    id: "assoc",
    label: "Associate",
    y: 274,
    tone: "violet",
    step: 3,
    cells: { net: ["1st", 4], comp: ["2nd", 3], data: ["3rd", 4], res: ["4th", 3], ops: ["5th", 1] },
  },
  {
    id: "pro",
    label: "Professional",
    y: 330,
    tone: "violet",
    step: 3,
    cells: { fund: ["1st", 2], net: ["2nd", 2], res: ["3rd", 2], data: ["4th", 1], ops: ["5th", 3] },
  },
];

const shapes: LayoutShape[] = [
  ...HUBS.map((h, i): LayoutShape => ({
    id: `hub-${h.id}`,
    type: "box",
    x: COL_X(i),
    y: 20,
    w: 88,
    h: 44,
    label: h.label,
    tone: "blue",
  })),
  ...ROWS.flatMap((r): LayoutShape[] => [
    { id: `row-${r.id}`, type: "text", x: 12, y: r.y, w: 118, h: 46, label: r.label, tone: r.tone, step: r.step },
    ...(Object.entries(r.cells) as [HubId, [string, number]][]).map(([hub, [order, pages]]): LayoutShape => ({
      id: `${r.id}-${hub}`,
      type: "cell",
      x: COL[hub],
      y: r.y,
      w: 88,
      h: 46,
      label: order,
      sub: pages === 1 ? "1 page" : `${pages} pages`,
      tone: r.tone,
      step: r.step,
    })),
  ]),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three learning paths over the same hubs",
  width: 790,
  height: 392,
  groups: [{ id: "cert", title: "Certification-minded", tone: "violet", x: 6, y: 184, w: 780, h: 202 }],
  steps: [
    { title: "From zero: every hub, in the order Brightpost grew" },
    { title: "Interview prep: decisions and failures first" },
    { title: "Certification-minded: three levels, each a wider slice" },
  ],
  shapes,
};

export default spec;
