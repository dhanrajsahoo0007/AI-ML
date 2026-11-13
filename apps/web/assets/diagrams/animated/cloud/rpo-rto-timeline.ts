import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// RPO and RTO on one timeline (cloud/resilience/dr-strategies), with the numbers Brightpost promises after its
// game day: the last copy reaches the second region at 13:45, the region is lost at 14:00, and the shop takes
// orders again at 16:00.
// Step 1: the three moments on a time axis. Step 2: the gap before the disaster, the RPO, points back from it.
// Step 3: the gap after the disaster, the RTO, points forward. Step 4: what shrinks each gap.
//
// Geometry: a time axis at y 150 from x 20 to 760. The three moments are boxes at y 40-94 whose centres (155, 390,
// 655) drop dashed ticks onto the axis. The RPO arrow runs from the disaster back to the last copy at y 185 and the
// RTO arrow from the disaster forward to service back, each with a line of text under it (y 198-234). Step 4 adds
// two boxes at y 250-302, one under each gap. Box labels fit their width at 6.2 px per character.

const MOMENTS = [
  { id: "last", x: 70, w: 170, label: "Last good copy", sub: "13:45, copy reaches B", tone: "violet" },
  { id: "disaster", x: 305, w: 170, label: "Disaster", sub: "14:00, region lost", tone: "red" },
  { id: "back", x: 560, w: 190, label: "Service back", sub: "16:00, orders again", tone: "green" },
] as const;

const shapes: LayoutShape[] = [
  { id: "axis", type: "arrow", x: 20, y: 150, w: 740, h: 0, tone: "neutral" },
  { id: "time", type: "text", x: 690, y: 158, w: 70, h: 20, label: "time", tone: "neutral" },
  ...MOMENTS.flatMap((m): LayoutShape[] => {
    const cx = m.x + m.w / 2;
    return [
      { id: m.id, type: "box", x: m.x, y: 40, w: m.w, h: 54, label: m.label, sub: m.sub, tone: m.tone },
      { id: `${m.id}-tick`, type: "arrow", x: cx, y: 96, w: 0, h: 50, dashed: true, tone: m.tone },
    ];
  }),

  // Step 2: the RPO looks back from the disaster to the last copy that survives.
  { id: "rpo", type: "arrow", x: 390, y: 185, w: -235, h: 0, label: "RPO: 15 min", tone: "red", step: 2 },
  {
    id: "rpo-text",
    type: "text",
    x: 135,
    y: 198,
    w: 275,
    h: 36,
    label: "Orders placed in this gap are lost",
    tone: "red",
    step: 2,
  },

  // Step 3: the RTO looks forward from the disaster to the moment shoppers can order again.
  { id: "rto", type: "arrow", x: 390, y: 185, w: 265, h: 0, label: "RTO: 2 hours", tone: "orange", step: 3 },
  {
    id: "rto-text",
    type: "text",
    x: 420,
    y: 198,
    w: 270,
    h: 36,
    label: "The shop is down for this long",
    tone: "orange",
    step: 3,
  },

  // Step 4: what makes each gap smaller.
  {
    id: "shrink-rpo",
    type: "box",
    x: 40,
    y: 250,
    w: 330,
    h: 52,
    label: "Shrink it: copy more often",
    sub: "nightly backup, log every few minutes, live replica",
    tone: "violet",
    step: 4,
    highlight: true,
  },
  {
    id: "shrink-rto",
    type: "box",
    x: 410,
    y: 250,
    w: 340,
    h: 52,
    label: "Shrink it: keep more running",
    sub: "nothing, the data, a small copy, everything",
    tone: "teal",
    step: 4,
    highlight: true,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "RPO and RTO on one timeline",
  width: 780,
  height: 316,
  steps: [
    { title: "Three moments: last copy, disaster, service back" },
    { title: "RPO: the data you lose, looking back" },
    { title: "RTO: the time you are down, looking forward" },
    { title: "What shrinks each gap" },
  ],
  shapes,
};

export default spec;
