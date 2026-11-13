import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// The nines ladder (cloud/resilience/availability-math): five availability targets from 99% to 99.999%, each with
// the downtime it allows per 365-day year and per 30-day month, and the kind of layout that usually earns it.
// Step 1: the rungs and their downtime. Step 2: what usually earns each rung, from one server in one zone to
// active-active regions. Step 3: Brightpost's two numbers: the 99.99% its wholesale contract promised, and the
// about 99.7% its order path multiplies out to, which sits between the two lowest rungs.
//
// Geometry: columns are the rung (x 12, w 104), downtime per year (x 124, w 118), downtime per month (x 250, w 118),
// what earns it (x 376, w 290) and Brightpost's tags (x 674, w 110, ending at 784; canvas 790). The tag column has
// no header, because the figure's pause button sits over its top. Header text at y 14. Rows start at y 50 and are 62 apart (boxes 52 tall), so the five rows end at 350. The "its path" tag straddles
// the 99% and 99.9% rows (y 81-133), because 99.7% lies between them. The footnote sits at y 366.
// Labels fit width - 8 at 6.2 px per character: "Every part in parallel, a second region" (40) needs 256 of 282.

const RUNGS = [
  {
    id: "r99",
    label: "99%",
    sub: "two nines",
    year: "3.65 days",
    month: "7.2 hours",
    earns: "One server in one zone",
    how: "a person fixes each failure",
  },
  {
    id: "r999",
    label: "99.9%",
    sub: "three nines",
    year: "8.8 hours",
    month: "43 minutes",
    earns: "Copies in two or three zones",
    how: "load balancer, managed failover",
  },
  {
    id: "r9995",
    label: "99.95%",
    sub: "three and a half",
    year: "4.4 hours",
    month: "22 minutes",
    earns: "No single-zone part on the path",
    how: "failover tested, careful deploys",
  },
  {
    id: "r9999",
    label: "99.99%",
    sub: "four nines",
    year: "53 minutes",
    month: "4.3 minutes",
    earns: "Every part in parallel, a second region",
    how: "recovery with no person in the loop",
  },
  {
    id: "r99999",
    label: "99.999%",
    sub: "five nines",
    year: "5.3 minutes",
    month: "26 seconds",
    earns: "Active-active across regions",
    how: "years of practice and tooling",
  },
] as const;

const ROW_Y = (i: number) => 50 + i * 62;

const shapes: LayoutShape[] = [
  { id: "h-target", type: "text", x: 12, y: 14, w: 104, h: 24, label: "Target", tone: "neutral" },
  { id: "h-year", type: "text", x: 124, y: 14, w: 118, h: 24, label: "Down per year", tone: "neutral" },
  { id: "h-month", type: "text", x: 250, y: 14, w: 118, h: 24, label: "Down per month", tone: "neutral" },
  {
    id: "h-earns",
    type: "text",
    x: 376,
    y: 14,
    w: 290,
    h: 24,
    label: "What usually earns it",
    tone: "neutral",
    step: 2,
  },
  ...RUNGS.flatMap((r, i): LayoutShape[] => [
    { id: r.id, type: "box", x: 12, y: ROW_Y(i), w: 104, h: 52, label: r.label, sub: r.sub, tone: "blue" },
    { id: `${r.id}-year`, type: "cell", x: 124, y: ROW_Y(i), w: 118, h: 52, label: r.year, tone: "neutral" },
    { id: `${r.id}-month`, type: "cell", x: 250, y: ROW_Y(i), w: 118, h: 52, label: r.month, tone: "neutral" },
    {
      id: `${r.id}-earns`,
      type: "box",
      x: 376,
      y: ROW_Y(i),
      w: 290,
      h: 52,
      label: r.earns,
      sub: r.how,
      tone: "teal",
      step: 2,
    },
  ]),

  // Step 3: Brightpost's promise and what its path really multiplies out to.
  {
    id: "tag-path",
    type: "box",
    x: 674,
    y: 81,
    w: 110,
    h: 52,
    label: "Its path: 99.7%",
    sub: "about 2 h a month",
    tone: "orange",
    highlight: true,
    step: 3,
  },
  {
    id: "tag-promise",
    type: "box",
    x: 674,
    y: ROW_Y(3),
    w: 110,
    h: 52,
    label: "Promised",
    sub: "4.3 min a month",
    tone: "red",
    highlight: true,
    step: 3,
  },
  {
    id: "gap",
    type: "arrow",
    x: 0,
    y: 0,
    from: "tag-path",
    to: "tag-promise",
    label: "28x less",
    tone: "red",
    dashed: true,
    step: 3,
  },
  {
    id: "foot",
    type: "text",
    x: 12,
    y: 366,
    w: 772,
    h: 22,
    label: "Downtime = (100% - target) x period. A year is 365 days, a month 30 days.",
    tone: "neutral",
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The nines ladder: downtime allowed and what earns each rung",
  width: 790,
  height: 400,
  steps: [
    { title: "Each rung allows less downtime" },
    { title: "What usually earns each rung" },
    { title: "Brightpost's promise and its real path" },
  ],
  shapes,
};

export default spec;
