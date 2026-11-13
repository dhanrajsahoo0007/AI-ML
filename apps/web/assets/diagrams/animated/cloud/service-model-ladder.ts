import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// The service-model ladder (cloud/fundamentals/service-models): five ways to run the same app, drawn as five columns
// over the same seven layers. Each cell says who runs that layer: "You" (orange), "You set, it runs" (teal: you
// choose the setting and the provider carries it out) or "Provider" (neutral). The colours match <ResponsibilityGrid>.
//
// Steps 1 to 5 add one column each, from on-premises to SaaS, so every step hands more layers to the provider. The
// cells that move to the provider in a step carry `highlight`, so the full view shows the line climbing as a
// staircase. Step 6 is the limit step: a red row under the columns says what each rung takes away.
//
// Geometry: row labels are text in x 12-192. Columns start at x 200, 318, 436, 554, 672 and are 112 wide with a gap
// of 6, so the last one ends at 784 (canvas 790). Headers are boxes at y 28-74. Layer rows start at y 84 and are
// 44 apart (cells 40 tall), so the seven rows end at 388. The give-up row is y 402-458; the arrow sits at y 486.
// Cell labels fit 112 - 8 = 104 px at 6.2 px per character: "You set, it runs" (16 characters) is the longest.

const COLS = [
  { id: "onprem", x: 200, label: "On-premises", sub: "your own building" },
  { id: "iaas", x: 318, label: "IaaS", sub: "rent machines" },
  { id: "paas", x: 436, label: "PaaS", sub: "hand over code" },
  { id: "fn", x: 554, label: "Functions", sub: "hand over one task" },
  { id: "saas", x: 672, label: "SaaS", sub: "rent the product" },
] as const;

const LAYERS = [
  { id: "data", label: "Your data and users" },
  { id: "code", label: "Application code" },
  { id: "scaling", label: "Scaling" },
  { id: "runtime", label: "Runtime and engine" },
  { id: "os", label: "Operating system" },
  { id: "vm", label: "Virtual machines" },
  { id: "hw", label: "Building and hardware" },
] as const;

type Owner = "you" | "shared" | "provider";
const Y: Owner = "you";
const S: Owner = "shared";
const P: Owner = "provider";

const CELL = {
  you: { label: "You", tone: "orange" },
  shared: { label: "You set, it runs", tone: "teal" },
  provider: { label: "Provider", tone: "neutral" },
} as const;

// Owners per column, top layer first, and the layers that move to the provider at that column's step.
const OWNERS: Record<(typeof COLS)[number]["id"], { owners: Owner[]; moved: string[] }> = {
  onprem: { owners: [Y, Y, Y, Y, Y, Y, Y], moved: [] },
  iaas: { owners: [Y, Y, Y, Y, Y, P, P], moved: ["vm", "hw"] },
  paas: { owners: [Y, Y, S, S, P, P, P], moved: ["os"] },
  fn: { owners: [Y, Y, P, S, P, P, P], moved: ["scaling"] },
  saas: { owners: [Y, P, P, P, P, P, P], moved: ["code"] },
};

const GIVE_UP: Record<(typeof COLS)[number]["id"], { label: string; sub: string }> = {
  onprem: { label: "You fix it all", sub: "power to patches" },
  iaas: { label: "Fixed sizes", sub: "no hardware say" },
  paas: { label: "No OS access", sub: "settings it offers" },
  fn: { label: "Cold starts", sub: "and time limits" },
  saas: { label: "Fixed features", sub: "no code changes" },
};

const ROW_Y = (i: number) => 84 + i * 44;

const shapes: LayoutShape[] = [
  { id: "layer-head", type: "text", x: 12, y: 40, w: 180, h: 22, label: "Layer", tone: "neutral" },
  ...LAYERS.map((l, i): LayoutShape => ({
    id: `row-${l.id}`,
    type: "text",
    x: 12,
    y: ROW_Y(i),
    w: 180,
    h: 40,
    label: l.label,
    tone: "neutral",
  })),
  ...COLS.flatMap((c, ci): LayoutShape[] => {
    const step = ci + 1;
    const { owners, moved } = OWNERS[c.id];
    return [
      { id: `head-${c.id}`, type: "box", x: c.x, y: 28, w: 112, h: 46, label: c.label, sub: c.sub, tone: "blue", step },
      ...LAYERS.map((l, li): LayoutShape => {
        const cell = CELL[owners[li]];
        return {
          id: `${c.id}-${l.id}`,
          type: "cell",
          x: c.x,
          y: ROW_Y(li),
          w: 112,
          h: 40,
          label: cell.label,
          tone: cell.tone,
          step,
          ...(moved.includes(l.id) ? { highlight: true as const } : {}),
        };
      }),
    ];
  }),

  // Step 2: the direction of the ladder, once there are two rungs to compare.
  {
    id: "climb",
    type: "arrow",
    x: 200,
    y: 486,
    w: 584,
    h: 0,
    label: "More managed: less to run, less control",
    tone: "teal",
    step: 2,
  },

  // Step 6: what each rung takes away.
  { id: "row-giveup", type: "text", x: 12, y: 402, w: 180, h: 56, label: "What you give up", tone: "red", step: 6 },
  ...COLS.map((c): LayoutShape => ({
    id: `giveup-${c.id}`,
    type: "box",
    x: c.x,
    y: 402,
    w: 112,
    h: 56,
    label: GIVE_UP[c.id].label,
    sub: GIVE_UP[c.id].sub,
    tone: "red",
    step: 6,
  })),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The service-model ladder: who runs each layer",
  width: 790,
  height: 510,
  steps: [
    { title: "On-premises: you run every layer" },
    { title: "IaaS: the provider takes the building and the machines" },
    { title: "PaaS: the operating system goes too" },
    { title: "Functions: scaling goes too" },
    { title: "SaaS: only your data and users stay yours" },
    { title: "What each rung takes away" },
  ],
  shapes,
};

export default spec;
