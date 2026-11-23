import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One user at a time against one batch (user-data-export, Step 5 and Deep dive 2): the warehouse's activity log is
// partitioned by date, not by user, so finding one user's rows reads the whole table.
// Two steps: 1 per-user queries: each of the day's 20,000 requesters runs its own query, and each query scans all
// 100 TB · 2 one batch: the day's requester ids go into one small table, one job per date partition joins it with the
// partition on owner_id, and the output is split into per-user files.
// Working (round numbers chosen to size the system; the price is an assumption, not a quote):
//   per user: 20,000 queries × 100 TB = 2,000,000 TB = 2,000 PB read a day; × $5 per TB = $10,000,000 a day.
//   batched: 100 TB read once a day × $5 per TB = $500 a day; $500 ÷ 20,000 exports = $0.025 an export.
//   ratio: 2,000,000 TB ÷ 100 TB = 20,000 × less read.
// Layout (880 × 370): two groups. Left (x 20 to 420) "Per user": three requester boxes at x 40 (y 90, 160, 230),
// the table as one tall cell at x 260 (y 80 to 280), the totals as text at y 300 and 324. Right (x 460 to 860)
// "One batch": the requester table at x 480, y 80; four partition cells 44 wide from x 652 at y 80; the join at y 180;
// the per-user files at y 270; the totals as text at y 330.
// Colours (PATTERN_TONE): requesters blue (data), the table and partitions violet (store), the join teal (compute),
// the per-user output green (the pattern's result); the per-user cost red.

const shapes: LayoutShape[] = [];

// Left: one scan per requester.
const users = [
  { id: "u1", label: "user 1", y: 90 },
  { id: "u2", label: "user 2", y: 160 },
  { id: "u3", label: "… user 20,000", y: 230 },
];
shapes.push({
  id: "table",
  type: "cell",
  x: 260,
  y: 80,
  w: 140,
  h: 200,
  label: "activity_log\n100 TB\n365 date partitions",
  tone: PATTERN_TONE.store,
  fill: "pastel",
});
users.forEach((u, i) => {
  shapes.push({
    id: u.id,
    type: "box",
    x: 40,
    y: u.y,
    w: 130,
    h: 40,
    label: u.label,
    tone: PATTERN_TONE.data,
    fill: "pastel",
    quiet: i > 0,
  });
  shapes.push({
    id: `${u.id}-scan`,
    type: "arrow",
    x: 0,
    y: 0,
    from: u.id,
    to: "table",
    label: i === 1 ? "full scan" : undefined,
    tone: "red",
    quiet: i !== 1,
  });
});
shapes.push(
  {
    id: "left-total",
    type: "text",
    x: 30,
    y: 300,
    w: 380,
    h: 18,
    label: "20,000 × 100 TB = 2,000 PB read a day",
    tone: "red",
  },
  {
    id: "left-cost",
    type: "text",
    x: 30,
    y: 324,
    w: 380,
    h: 18,
    label: "≈ $10,000,000 a day at $5 per TB",
    tone: "red",
  }
);

// Right: one batch, one scan of each partition.
const P0 = 652;
const PW = 44;
const parts = ["d1", "d2", "…", "d365"];
shapes.push({
  id: "req",
  type: "box",
  x: 480,
  y: 80,
  w: 150,
  h: 56,
  label: "Requesters",
  sub: "20,000 ids, 1 table",
  tone: PATTERN_TONE.data,
  fill: "pastel",
  step: 2,
});
parts.forEach((p, i) => {
  shapes.push({
    id: `p${i}`,
    type: "cell",
    x: P0 + i * (PW + 4),
    y: 80,
    w: PW,
    h: 56,
    label: p,
    tone: PATTERN_TONE.store,
    fill: "pastel",
    step: 2,
    quiet: i > 0,
  });
});
shapes.push(
  {
    id: "join",
    type: "box",
    x: 540,
    y: 180,
    w: 260,
    h: 56,
    label: "INNER JOIN on owner_id",
    sub: "one job per date partition",
    tone: PATTERN_TONE.compute,
    fill: "pastel",
    step: 2,
  },
  { id: "req-join", type: "arrow", x: 0, y: 0, from: "req", to: "join", step: 2 },
  { id: "part-join", type: "arrow", x: 0, y: 0, from: "p1", to: "join", label: "each once", step: 2 },
  {
    id: "out",
    type: "box",
    x: 540,
    y: 270,
    w: 260,
    h: 44,
    label: "Per-user files",
    sub: "split by owner, to staging",
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 2,
  },
  { id: "join-out", type: "arrow", x: 0, y: 0, from: "join", to: "out", step: 2 },
  {
    id: "right-total",
    type: "text",
    x: 470,
    y: 330,
    w: 380,
    h: 18,
    label: "100 TB read once ≈ $500 a day, $0.025 an export",
    tone: PATTERN_TONE.pattern,
    step: 2,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Per-user scans against one batched join",
  width: 880,
  height: 370,
  shapes,
  groups: [
    { id: "per-user", title: "Per user: one scan each", tone: "red", x: 20, y: 30, w: 400, h: 325 },
    { id: "batch", title: "One batch: one scan a day", tone: PATTERN_TONE.pattern, x: 460, y: 30, w: 400, h: 325 },
  ],
  steps: [{ title: "One query per user" }, { title: "One join for the whole batch" }],
};

export default spec;
