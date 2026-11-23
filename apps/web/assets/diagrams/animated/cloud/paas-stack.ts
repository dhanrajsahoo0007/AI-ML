import type { LayoutShape, LayoutSpec, Tone } from "@/components/diagrams/types";

// Who runs each layer when you hand over a container image or your code (cloud/compute/serverless-containers-and-paas).
// Three columns: a VM fleet for comparison, serverless containers, and a code platform (platform as a service).
// Rows are the layers from your code down to HTTPS and releases.
//
// Step 1 draws the VM fleet and the serverless container columns, with the row labels and a legend. Step 2 adds the
// code platform column: the line between you and the provider sits two rows higher, because the provider also owns
// the language runtime and the build (those two cells are highlighted). Step 3 adds two rows that decide the choice
// in practice: what you pay while idle, and where background work can run.
//
// Cell tones: orange is work or cost for your team, green is done for you (or free), neutral is neither.
//
// Geometry: row labels are text in x 12-162. Columns start at x 170, 376, 582 and are 200 wide with a gap of 6, so
// the last one ends at 782 (canvas 790). Heads are boxes at y 26-72. Rows start at y 84 and are 58 apart (boxes 44
// tall), so the ten rows end at 650; the legend sits at y 664. The 14-unit gap keeps each step's NEW badges clear of
// the sub line in the row above. Box labels fit 200 - 8 = 192 px at 6.2 px per
// character: "Only with CPU always on" (23 characters) is the longest.

const COLS = [
  { id: "vm", x: 170, label: "VM fleet", sub: "for comparison", step: 1 },
  { id: "sc", x: 376, label: "Serverless containers", sub: "you hand over an image", step: 1 },
  { id: "paas", x: 582, label: "Code platform (PaaS)", sub: "you hand over code", step: 2 },
] as const;

type ColId = (typeof COLS)[number]["id"];
type Cell = { label: string; sub?: string; tone: Tone; highlight?: true };

const YOU: Tone = "orange";
const PROVIDER: Tone = "green";
const N: Tone = "neutral";

const ROWS: { id: string; label: string; step: number; cells: Record<ColId, Cell> }[] = [
  {
    id: "handover",
    label: "You hand over",
    step: 1,
    cells: {
      vm: { label: "A machine image", sub: "and fleet rules", tone: N },
      sc: { label: "A container image", sub: "and a few settings", tone: N },
      paas: { label: "Source code", sub: "and a config file", tone: N },
    },
  },
  {
    id: "code",
    label: "Your code",
    step: 1,
    cells: {
      vm: { label: "You", sub: "your app", tone: YOU },
      sc: { label: "You", sub: "your app", tone: YOU },
      paas: { label: "You", sub: "your app", tone: YOU },
    },
  },
  {
    id: "libs",
    label: "Libraries",
    step: 1,
    cells: {
      vm: { label: "You", sub: "installed on each VM", tone: YOU },
      sc: { label: "You", sub: "inside the image", tone: YOU },
      paas: { label: "You", sub: "listed; the build installs them", tone: YOU },
    },
  },
  {
    id: "runtime",
    label: "Language runtime",
    step: 1,
    cells: {
      vm: { label: "You", sub: "you install and update it", tone: YOU },
      sc: { label: "You", sub: "inside the image", tone: YOU },
      paas: { label: "Provider", sub: "you pick a supported version", tone: PROVIDER, highlight: true },
    },
  },
  {
    id: "build",
    label: "Build",
    step: 1,
    cells: {
      vm: { label: "You", sub: "scripts or a baked image", tone: YOU },
      sc: { label: "You", sub: "a short build recipe", tone: YOU },
      paas: { label: "Provider", sub: "built from your code", tone: PROVIDER, highlight: true },
    },
  },
  {
    id: "os",
    label: "OS and patches",
    step: 1,
    cells: {
      vm: { label: "You", sub: "you patch every VM", tone: YOU },
      sc: { label: "Provider", sub: "hidden from you", tone: PROVIDER },
      paas: { label: "Provider", sub: "patched by the platform", tone: PROVIDER },
    },
  },
  {
    id: "scale",
    label: "Machines, scaling",
    step: 1,
    cells: {
      vm: { label: "You", sub: "fleet size and scaling rules", tone: YOU },
      sc: { label: "Provider", sub: "copies follow requests", tone: PROVIDER },
      paas: { label: "Provider", sub: "instances by plan or rule", tone: PROVIDER },
    },
  },
  {
    id: "front",
    label: "HTTPS, releases",
    step: 1,
    cells: {
      vm: { label: "You", sub: "load balancer, certificates", tone: YOU },
      sc: { label: "Provider", sub: "URL, TLS, revisions", tone: PROVIDER },
      paas: { label: "Provider", sub: "URL, TLS, slots or versions", tone: PROVIDER },
    },
  },
  {
    id: "idle",
    label: "Paid while idle",
    step: 3,
    cells: {
      vm: { label: "Every hour", sub: "busy or not", tone: YOU },
      sc: { label: "Nothing at minimum 0", sub: "minimum 1: one copy", tone: PROVIDER },
      paas: { label: "Usually every hour", sub: "the instances you keep", tone: YOU },
    },
  },
  {
    id: "bg",
    label: "Background work",
    step: 3,
    cells: {
      vm: { label: "Anything", sub: "it is your machine", tone: N },
      sc: { label: "Only with CPU always on", sub: "or run it as a job", tone: YOU },
      paas: { label: "A worker tier", sub: "on most platforms", tone: PROVIDER },
    },
  },
];

const ROW_Y = (i: number) => 84 + i * 58;

const shapes: LayoutShape[] = [
  ...COLS.map((c): LayoutShape => ({
    id: `head-${c.id}`,
    type: "box",
    x: c.x,
    y: 26,
    w: 200,
    h: 46,
    label: c.label,
    sub: c.sub,
    tone: "blue",
    step: c.step,
  })),
  ...ROWS.flatMap((r, ri): LayoutShape[] => [
    {
      id: `row-${r.id}`,
      type: "text",
      x: 12,
      y: ROW_Y(ri),
      w: 150,
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
        w: 200,
        h: 44,
        label: cell.label,
        ...(cell.sub ? { sub: cell.sub } : {}),
        tone: cell.tone,
        step: Math.max(r.step, c.step),
        ...(cell.highlight ? { highlight: true as const } : {}),
      };
    }),
  ]),
  {
    id: "legend",
    type: "text",
    x: 170,
    y: 664,
    w: 612,
    h: 20,
    label: "Orange: work or cost for your team. Green: done for you, or free.",
    tone: "neutral",
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Who runs each layer: VM fleet, serverless containers, code platform",
  width: 790,
  height: 694,
  steps: [
    { title: "Hand over an image: the provider runs everything below it" },
    { title: "Hand over code: the provider also owns the runtime and the build" },
    { title: "Idle cost and background work" },
  ],
  shapes,
};

export default spec;
