import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// The three ways a cloud says no (cloud/resilience/quotas-and-retries), drawn as three nested rings.
// Outer ring, step 1: account quotas, how many of a thing an account may run in a region (Brightpost's 32 processor
// cores, the test account's 4 servers). Middle ring, step 2: API rate limits, how fast you may ask the cloud's
// control plane to do things (start a server, list servers). Inner ring, step 3: resource throughput, how much one
// thing can serve (a database's connections, one table partition, a queue or a function's copies). Step 4 adds the
// right-hand column: who can lift each limit, and how.
//
// Geometry: groups nest (outer 10-775, middle 40-750, inner 70-725 wide). Each ring has one row of four boxes in the
// band above the next ring: rows at y 66, 176 and 286, boxes 150 x 52 at x 85, 245, 405 and 565 (ending at 715).
// The fourth column is the step-4 "raise it" box, tone green. Labels fit width - 8 at 6.2 px a character: at most
// 22 characters ("Addresses, databases" is 20).
const ROWS = [
  {
    id: "quota",
    y: 66,
    tone: "orange" as const,
    step: 1,
    boxes: [
      { label: "Cores per region", sub: "shop: 32, so 8 servers", highlight: true },
      { label: "Servers, test account", sub: "4 at most" },
      { label: "Addresses, databases", sub: "a count per account" },
    ],
    raise: { label: "Raise: ask ahead", sub: "a request, then a wait" },
  },
  {
    id: "rate",
    y: 176,
    tone: "blue" as const,
    step: 2,
    boxes: [
      { label: "Start a server", sub: "calls per second" },
      { label: "List servers", sub: "a script in a loop" },
      { label: "Shared budget", sub: "per account or caller" },
    ],
    raise: { label: "Raise: rarely", sub: "call less, back off" },
  },
  {
    id: "resource",
    y: 286,
    tone: "violet" as const,
    step: 3,
    boxes: [
      { label: "One database", sub: "connections, disk reads" },
      { label: "One table partition", sub: "reads, writes a second" },
      { label: "One queue or function", sub: "copies at once" },
    ],
    raise: { label: "Raise: bigger or more", sub: "or spread the load" },
  },
];

const X = [85, 245, 405];

const shapes: LayoutShape[] = ROWS.flatMap((row): LayoutShape[] => [
  ...row.boxes.map((b, i): LayoutShape => ({
    id: `${row.id}-${i + 1}`,
    type: "box",
    x: X[i],
    y: row.y,
    w: 150,
    h: 52,
    label: b.label,
    sub: b.sub,
    tone: row.tone,
    step: row.step,
    ...("highlight" in b && b.highlight ? { highlight: true as const } : {}),
  })),
  {
    id: `${row.id}-raise`,
    type: "box",
    x: 565,
    y: row.y,
    w: 150,
    h: 52,
    label: row.raise.label,
    sub: row.raise.sub,
    tone: "green",
    step: 4,
  },
]);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three ways a cloud says no",
  width: 785,
  height: 410,
  steps: [
    { title: "Quotas: how many you may run" },
    { title: "API rate limits: how fast you may ask" },
    { title: "Resource throughput: how much one thing serves" },
    { title: "Who can lift each one" },
  ],
  groups: [
    { id: "g-quota", title: "Account quota: how many", tone: "orange", x: 10, y: 30, w: 765, h: 370 },
    { id: "g-rate", title: "API rate limit: how fast you ask", tone: "blue", x: 40, y: 140, w: 710, h: 245 },
    {
      id: "g-resource",
      title: "Resource throughput: how much one thing serves",
      tone: "violet",
      x: 70,
      y: 250,
      w: 655,
      h: 120,
    },
  ],
  shapes,
};

export default spec;
