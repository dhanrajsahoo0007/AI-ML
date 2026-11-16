import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The URL frontier of one shard (web-crawler, Deep dive 1): priority in front, politeness behind.
// Two steps: 1 the structure: a prioritiser scores each new URL 1 to 3 and appends it to that front queue; a router
// picks front queues with a bias to high priority and appends each URL to the back queue that holds its host (one
// host per back queue); a heap holds one entry per back queue, keyed by the time that host may be contacted next ·
// 2 one fetch: the heap root is b.org (next allowed 10:00:01.2), so a fetcher leases b.org's head URL; the fetch
// takes 0.4 s, so b.org goes back into the heap at now + 10 × 0.4 s = 4 s later (10:00:05.2); a 429 or 5xx doubles
// the gap instead.
// Working: GAP = max(1 s, FACTOR × fetch time) with FACTOR = 10 (a design choice of this page); 10 × 0.4 s = 4 s;
// 10:00:01.2 + 4 s = 10:00:05.2. The heap times are illustrative; the root is computed as the earliest.
// Layout (860 wide): prioritiser centred at y 20; three front queues (190 × 50) at y 110; router at y 200; four back
// queues (170 × 50) at y 300; one heap cell under each back queue at y 380; the fetcher under b.org at y 470; notes
// to the right of the fetcher and under it.
// Colours (PATTERN_TONE): prioritiser, router and fetcher teal (compute), front queues blue (data waiting), back
// queues green (the pattern's own part: one queue per host), heap cells lime (a check: may we contact this host
// yet?), notes neutral.

const W = 860;
const FACTOR = 10;
const FETCH_S = 0.4;
const GAP_S = Math.max(1, FACTOR * FETCH_S);

const FQ_W = 190;
const FQ_Y = 110;
const fqX = [95, 335, 575];
const BQ_W = 170;
const BQ_Y = 300;
const HEAP_Y = 380;
const bqX = [40, 245, 450, 655];

const fronts = [
  { id: "f1", label: "Front 1: high", sub: "home pages, news" },
  { id: "f2", label: "Front 2: medium", sub: "linked pages" },
  { id: "f3", label: "Front 3: low", sub: "deep links" },
];

// Seconds after 10:00:00 at which each host may be contacted next.
const hosts = [
  { id: "a", host: "a.com", waiting: 4, next: 3.0 },
  { id: "b", host: "b.org", waiting: 2, next: 1.2 },
  { id: "c", host: "c.net", waiting: 7, next: 9.0 },
  { id: "d", host: "d.io", waiting: 1, next: 4.5 },
];
const root = hosts.reduce((m, h) => (h.next < m.next ? h : m));
const rootIndex = hosts.indexOf(root);
const clock = (s: number) => `10:00:${s.toFixed(1).padStart(4, "0")}`;

const shapes: LayoutShape[] = [
  {
    id: "prio",
    type: "box",
    x: W / 2 - 75,
    y: 20,
    w: 150,
    h: 50,
    label: "Prioritiser",
    sub: "score 1 to 3",
    tone: PATTERN_TONE.compute,
    fill: "pastel",
  },
  {
    id: "router",
    type: "box",
    x: W / 2 - 100,
    y: 200,
    w: 200,
    h: 50,
    label: "Router",
    sub: "biased pick, by host",
    tone: PATTERN_TONE.compute,
    fill: "pastel",
  },
];

fronts.forEach((f, i) => {
  shapes.push({
    id: f.id,
    type: "box",
    x: fqX[i],
    y: FQ_Y,
    w: FQ_W,
    h: 50,
    label: f.label,
    sub: f.sub,
    tone: PATTERN_TONE.data,
    fill: "pastel",
  });
  shapes.push({ id: `p-${f.id}`, type: "arrow", x: 0, y: 0, from: "prio", to: f.id });
  shapes.push({ id: `${f.id}-r`, type: "arrow", x: 0, y: 0, from: f.id, to: "router" });
});

hosts.forEach((h, i) => {
  shapes.push({
    id: `bq-${h.id}`,
    type: "box",
    x: bqX[i],
    y: BQ_Y,
    w: BQ_W,
    h: 50,
    label: h.host,
    sub: `${h.waiting} URL${h.waiting === 1 ? "" : "s"} waiting`,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
  });
  shapes.push({ id: `r-${h.id}`, type: "arrow", x: 0, y: 0, from: "router", to: `bq-${h.id}` });
  shapes.push({
    id: `heap-${h.id}`,
    type: "cell",
    x: bqX[i],
    y: HEAP_Y,
    w: BQ_W,
    h: 40,
    label: h === root ? `next ${clock(h.next)} (root)` : `next ${clock(h.next)}`,
    tone: PATTERN_TONE.check,
    highlight: h === root,
  });
});

const fetchX = bqX[rootIndex];
shapes.push({
  id: "heap-note",
  type: "text",
  x: fetchX + BQ_W + 30,
  y: 470,
  w: W - (fetchX + BQ_W + 30) - 20,
  h: 50,
  label: "Heap: one entry per host, keyed by the\ntime it may be contacted next; the root goes first",
  tone: PATTERN_TONE.infra,
});

// Step 2: one fetch from the root host.
shapes.push(
  {
    id: "fetcher",
    type: "box",
    x: fetchX,
    y: 470,
    w: BQ_W,
    h: 50,
    label: "Fetcher",
    sub: `GET ${root.host}/…, ${FETCH_S} s`,
    tone: PATTERN_TONE.compute,
    fill: "pastel",
    step: 2,
  },
  {
    id: "lease",
    type: "arrow",
    x: 0,
    y: 0,
    from: `heap-${root.id}`,
    to: "fetcher",
    label: "lease head URL",
    packet: true,
    step: 2,
  },
  {
    id: "reinsert",
    type: "arrow",
    x: 0,
    y: 0,
    from: "fetcher",
    to: `heap-${root.id}`,
    via: [
      [fetchX + BQ_W + 18, 495],
      [fetchX + BQ_W + 18, HEAP_Y + 20],
    ],
    dashed: true,
    step: 2,
  },
  {
    id: "rule",
    type: "text",
    x: 20,
    y: 540,
    w: W - 40,
    h: 20,
    label: `Back in the heap at now + ${FACTOR} × ${FETCH_S} s = ${GAP_S} s later: ${clock(root.next + GAP_S)}`,
    tone: PATTERN_TONE.infra,
    step: 2,
  },
  {
    id: "rule2",
    type: "text",
    x: 20,
    y: 564,
    w: W - 40,
    h: 20,
    label: "A 429 or 5xx doubles the gap; never less than 1 s",
    tone: PATTERN_TONE.infra,
    step: 2,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The URL frontier: priority in front, one queue per host behind",
  width: W,
  height: 600,
  shapes,
  steps: [{ title: "Front queues, back queues, a heap" }, { title: "One fetch: lease, download, wait 10 ×" }],
};

export default spec;
