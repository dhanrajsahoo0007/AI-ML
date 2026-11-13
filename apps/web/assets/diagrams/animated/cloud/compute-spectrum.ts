import type { LayoutShape, LayoutSpec, Tone } from "@/components/diagrams/types";

// The compute spectrum (cloud/compute/compute-spectrum): five places to run the same code, as five columns, and
// what each one gives and takes away, as rows. Columns from most control to least work: VMs, containers on your own
// VMs, managed Kubernetes, serverless containers, functions.
//
// Step 1 adds the column heads and the two rows that set the axis: what you hand over, and what you still run.
// Step 2 adds the time rows (how fast a new copy is ready, how long one run may last). Step 3 adds scaling and
// local state. Step 4 adds the cost shape: paid while idle, and cost when busy all day.
//
// Cell tones say how the cell reads for the team: green is something this place gives you, orange is something it
// takes away or costs, neutral is in between or depends on settings. The serverless-container start-up cell is
// highlighted, because Brightpost's 8-second morning wait lives there (the page's story); so is its idle-cost cell,
// the reason the team chose it.
//
// Geometry: row labels are text in x 12-152. Columns start at x 160, 286, 412, 538, 664 and are 120 wide with a gap
// of 6, so the last one ends at 784 (canvas 790). Heads are boxes at y 26-72. Rows start at y 84 and are 48 apart
// (boxes 44 tall), so the eight rows end at 464. The direction arrow sits at y 486.
// Box labels fit 120 - 8 = 112 px at 6.2 px per character: "Under 1 s to a few" (18 characters) is the longest.

const COLS = [
  { id: "vm", x: 160, label: "VMs", sub: "whole machines" },
  { id: "cvm", x: 286, label: "Containers", sub: "on your own VMs" },
  { id: "k8s", x: 412, label: "Kubernetes", sub: "a managed cluster" },
  { id: "sc", x: 538, label: "Serverless", sub: "containers, no hosts" },
  { id: "fn", x: 664, label: "Functions", sub: "code per event" },
] as const;

type ColId = (typeof COLS)[number]["id"];
type Cell = { label: string; sub?: string; tone: Tone; highlight?: true };

const G: Tone = "green";
const O: Tone = "orange";
const N: Tone = "neutral";

const ROWS: { id: string; label: string; step: number; cells: Record<ColId, Cell> }[] = [
  {
    id: "handover",
    label: "You hand over",
    step: 1,
    cells: {
      vm: { label: "Machine image", sub: "a full disk copy", tone: N },
      cvm: { label: "Container image", sub: "and the VMs", tone: N },
      k8s: { label: "Container images", sub: "and manifests", tone: N },
      sc: { label: "Container image", sub: "and a few settings", tone: N },
      fn: { label: "Code", sub: "and a trigger", tone: N },
    },
  },
  {
    id: "run",
    label: "You still run",
    step: 1,
    cells: {
      vm: { label: "OS and fleet", sub: "patches, sizes", tone: O },
      cvm: { label: "OS and placement", sub: "which VM runs what", tone: O },
      k8s: { label: "Nodes, add-ons", sub: "or the cloud, by mode", tone: O },
      sc: { label: "Your image", sub: "OS patched for you", tone: G },
      fn: { label: "Your code", sub: "runtime patched too", tone: G },
    },
  },
  {
    id: "start",
    label: "New copy ready in",
    step: 2,
    cells: {
      vm: { label: "1 to 3 minutes", sub: "boot, then set up", tone: O },
      cvm: { label: "Seconds", sub: "if a VM has room", tone: G },
      k8s: { label: "Seconds", sub: "minutes if a new node", tone: N },
      sc: { label: "1 to 10 seconds", sub: "pull image, start app", tone: N, highlight: true },
      fn: { label: "Under 1 s to a few", sub: "the cold start", tone: G },
    },
  },
  {
    id: "maxrun",
    label: "Longest single run",
    step: 2,
    cells: {
      vm: { label: "No limit", tone: G },
      cvm: { label: "No limit", tone: G },
      k8s: { label: "No limit", tone: G },
      sc: { label: "Request timeout", sub: "jobs: hours", tone: N },
      fn: { label: "Minutes", sub: "a hard time limit", tone: O },
    },
  },
  {
    id: "scale",
    label: "Scales by adding",
    step: 3,
    cells: {
      vm: { label: "Whole VMs", sub: "minutes each", tone: O },
      cvm: { label: "Containers", sub: "and VMs under them", tone: N },
      k8s: { label: "Pods, then nodes", sub: "two loops", tone: N },
      sc: { label: "Copies", sub: "as requests arrive", tone: G },
      fn: { label: "Copies", sub: "as events arrive", tone: G },
    },
  },
  {
    id: "state",
    label: "Local files",
    step: 3,
    cells: {
      vm: { label: "Kept on reboot", sub: "lost on scale-in", tone: N },
      cvm: { label: "Lost on restart", sub: "unless a volume", tone: O },
      k8s: { label: "Lost on restart", sub: "unless a volume", tone: O },
      sc: { label: "Lost on scale-in", sub: "keep state outside", tone: O },
      fn: { label: "Scratch only", sub: "gone after the run", tone: O },
    },
  },
  {
    id: "idle",
    label: "Paid while idle",
    step: 4,
    cells: {
      vm: { label: "Every hour", sub: "busy or not", tone: O },
      cvm: { label: "Every VM hour", sub: "busy or not", tone: O },
      k8s: { label: "Every node hour", sub: "or per pod, by mode", tone: O },
      sc: { label: "Nothing at min 0", sub: "min 1: one copy", tone: G, highlight: true },
      fn: { label: "Nothing", sub: "unless kept warm", tone: G },
    },
  },
  {
    id: "steady",
    label: "Busy all day",
    step: 4,
    cells: {
      vm: { label: "Cheapest", sub: "with a commitment", tone: G },
      cvm: { label: "Cheap", sub: "packs VMs full", tone: G },
      k8s: { label: "Cheap at scale", sub: "if someone runs it", tone: N },
      sc: { label: "In between", sub: "billed per copy", tone: N },
      fn: { label: "Most expensive", sub: "billed per run", tone: O },
    },
  },
];

const ROW_Y = (i: number) => 84 + i * 48;

const shapes: LayoutShape[] = [
  ...COLS.map((c): LayoutShape => ({
    id: `head-${c.id}`,
    type: "box",
    x: c.x,
    y: 26,
    w: 120,
    h: 46,
    label: c.label,
    sub: c.sub,
    tone: "blue",
  })),
  ...ROWS.flatMap((r, ri): LayoutShape[] => [
    {
      id: `row-${r.id}`,
      type: "text",
      x: 12,
      y: ROW_Y(ri),
      w: 140,
      h: 44,
      label: r.label,
      tone: "neutral",
      step: r.step,
    },
    ...COLS.map((c): LayoutShape => {
      const cell = r.cells[c.id];
      return {
        id: `${c.id}-${r.id}`,
        type: "box",
        x: c.x,
        y: ROW_Y(ri),
        w: 120,
        h: 44,
        label: cell.label,
        ...(cell.sub ? { sub: cell.sub } : {}),
        tone: cell.tone,
        step: r.step,
        ...(cell.highlight ? { highlight: true as const } : {}),
      };
    }),
  ]),

  // The direction of the spectrum, under the columns.
  {
    id: "direction",
    type: "arrow",
    x: 160,
    y: 486,
    w: 624,
    h: 0,
    label: "Rightward: less to run, less control",
    tone: "teal",
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The compute spectrum: what each place gives and takes",
  width: 790,
  height: 506,
  steps: [
    { title: "Five places: what you hand over, what you still run" },
    { title: "Time: how fast a copy starts, how long it may run" },
    { title: "Scaling and local files" },
    { title: "Cost shape: idle and busy all day" },
  ],
  shapes,
};

export default spec;
