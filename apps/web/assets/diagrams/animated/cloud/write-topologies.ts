import type { LayoutShape, LayoutSpec, Tone } from "@/components/diagrams/types";

// Where writes go when two regions serve users (cloud/resilience/multi-region): three panels side by side, one per
// build step. Each panel is a dotted group with a title tab. Inside, top to bottom: the London copy, the arrows that
// join the two copies, the Sydney copy, then the promise the design keeps (green) and what it costs (orange). Panel 2's
// cost carries `highlight`, in red: it is Brightpost's trial, where the last poster sold twice.
//
// Geometry: panels start at x 10, 270 and 530 and are 250 wide; the groups run y 24-374 (tab at y 10-38). Boxes are
// 226 wide at panel x + 12: copies at y 54-104 and 170-220, promise at 244-294, cost at 306-356. Arrows cross the
// 66-unit gap between the copies. Canvas 790 x 386.
// Label room: 6.2 px per character within width - 8 for the lint, about 7.2 px in the real font, so a label stays
// under 30 characters and a sub line under 34.

interface Panel {
  id: string;
  title: string;
  top: [string, string];
  bottom: [string, string];
  promise: [string, string];
  cost: [string, string];
  costTone: Tone;
  arrows: { label: string; up?: boolean; dx: number }[];
}

const PANELS: Panel[] = [
  {
    id: "single",
    title: "One writer",
    top: ["London: the writer", "every order and stock change"],
    bottom: ["Sydney: a read copy", "fast pages; orders go to London"],
    promise: ["One answer for every order", "Sydney may read ~1 s old data"],
    cost: ["Sydney orders: +250 ms", "losing London can lose ~1 s"],
    costTone: "orange",
    arrows: [{ label: "copy, ~1 s behind", dx: 125 }],
  },
  {
    id: "multi",
    title: "A writer per region",
    top: ["London: a writer", "takes UK orders"],
    bottom: ["Sydney: a writer", "takes Australian orders"],
    promise: ["Fast writes in both regions", "each region can work alone"],
    cost: ["Two copies can disagree", "the last poster sold twice"],
    costTone: "red",
    arrows: [
      { label: "~1 s", dx: 85 },
      { label: "~1 s", dx: 165, up: true },
    ],
  },
  {
    id: "global",
    title: "One global database",
    top: ["London: a voting copy", "takes reads and writes"],
    bottom: ["Sydney: a voting copy", "takes reads and writes"],
    promise: ["Every read is current", "no conflicts, no lost writes"],
    cost: ["Every write waits ~250 ms", "and a third site breaks ties"],
    costTone: "orange",
    arrows: [
      { label: "agree", dx: 85 },
      { label: "agree", dx: 165, up: true },
    ],
  },
];

const PANEL_X = (i: number) => 10 + i * 260;

const shapes: LayoutShape[] = PANELS.flatMap((p, i): LayoutShape[] => {
  const x0 = PANEL_X(i);
  const step = i + 1;
  const box = (id: string, y: number, [label, sub]: [string, string], tone: Tone, extra = {}): LayoutShape => ({
    id: `${p.id}-${id}`,
    type: "box",
    x: x0 + 12,
    y,
    w: 226,
    h: 50,
    label,
    sub,
    tone,
    step,
    ...extra,
  });
  const arrows = p.arrows.map((a, k): LayoutShape =>
    p.arrows.length === 1
      ? {
          id: `${p.id}-arrow-${k}`,
          type: "arrow",
          x: 0,
          y: 0,
          from: `${p.id}-top`,
          to: `${p.id}-bottom`,
          label: a.label,
          dashed: true,
          packet: true,
          tone: "violet",
          step,
        }
      : {
          id: `${p.id}-arrow-${k}`,
          type: "arrow",
          x: x0 + a.dx,
          y: a.up ? 170 : 104,
          w: 0,
          h: a.up ? -66 : 66,
          label: a.label,
          dashed: true,
          packet: true,
          tone: "violet",
          step,
        }
  );
  return [
    box("top", 54, p.top, "violet"),
    ...arrows,
    box("bottom", 170, p.bottom, "violet"),
    box("promise", 244, p.promise, "green"),
    box("cost", 306, p.cost, p.costTone, p.costTone === "red" ? { highlight: true as const } : {}),
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three places the writes can go",
  width: 790,
  height: 386,
  groups: PANELS.map((p, i) => ({
    id: `${p.id}-panel`,
    title: p.title,
    tone: "neutral" as const,
    x: PANEL_X(i),
    y: 24,
    w: 250,
    h: 350,
  })),
  shapes,
  steps: [
    { title: "One writer, read copies near users" },
    { title: "A writer in each region" },
    { title: "One database that spans both regions" },
  ],
};

export default spec;
