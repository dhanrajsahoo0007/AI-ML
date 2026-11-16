import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Cardinality (metrics-and-logging, Deep dive 2): every label multiplies the number of series, and one unbounded
// label breaks the index.
// Steps: 1 bounded labels: one request counter × method 4 × status 5 × route 25 × pod 40 = 20,000 series · 2 add
// user_id with 100,000 active values: 20,000 × 100,000 = 2,000,000,000 series (red) · 3 the guardrails: a limit per
// tenant (500,000 active series), a limit per metric (50,000), and user_id moved to a log field.
// Working (assumption, round): about 4 kB of memory per active series in an ingester (labels, index postings, the
// open chunk). 20,000 × 4 kB = 80 MB; 2,000,000,000 × 4 kB = 8 TB; a tenant at its limit: 500,000 × 4 kB = 2 GB.
// Layout: row 1 at y 50: a metric box (x 20, 140 wide), then four 90-wide factor boxes from x 188, 118 apart, with a ×
// circle between each pair, "=" and a 150-wide result box at x 666. Row 2 at y 140: the 20,000 box, × user_id, = the
// red result. Row 3 at y 240: three guardrail boxes 250 wide. Colours (PATTERN_TONE): labels neutral (infra), series
// counts violet (store), the unbounded label and its result red (fail), guardrails green (the pattern's own part).

const Y1 = 50;
const Y2 = 140;
const Y3 = 240;
const H = 52;
const FX = (i: number) => 188 + i * 118;
const factors = [
  { id: "method", label: "method", sub: "4 values" },
  { id: "status", label: "status", sub: "5 values" },
  { id: "route", label: "route", sub: "25 values" },
  { id: "pod", label: "pod", sub: "40 values" },
];

const shapes: LayoutShape[] = [
  {
    id: "metric",
    type: "box",
    x: 20,
    y: Y1,
    w: 140,
    h: H,
    label: "http_requests",
    sub: "one counter",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  },
];
factors.forEach((f, i) => {
  shapes.push({
    id: `times${i}`,
    type: "circle",
    x: FX(i) - 14,
    y: Y1 + H / 2,
    w: 20,
    symbol: "times",
    tone: PATTERN_TONE.infra,
  });
  shapes.push({
    id: f.id,
    type: "box",
    x: FX(i),
    y: Y1,
    w: 90,
    h: H,
    label: f.label,
    sub: f.sub,
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  });
});
shapes.push({ id: "eq1", type: "text", x: 636, y: Y1 + 16, w: 24, h: 20, label: "=", tone: PATTERN_TONE.infra });
shapes.push({
  id: "bounded",
  type: "box",
  x: 666,
  y: Y1,
  w: 150,
  h: H,
  label: "20,000 series",
  sub: "≈ 80 MB in memory",
  tone: PATTERN_TONE.store,
  fill: "pastel",
});

// Row 2: one unbounded label.
shapes.push({
  id: "carry",
  type: "box",
  x: 306,
  y: Y2,
  w: 150,
  h: H,
  label: "20,000 series",
  sub: "from row 1",
  tone: PATTERN_TONE.store,
  step: 2,
  quiet: true,
});
shapes.push({
  id: "times-user",
  type: "circle",
  x: 470,
  y: Y2 + H / 2,
  w: 20,
  symbol: "times",
  tone: PATTERN_TONE.infra,
  step: 2,
  quiet: true,
});
shapes.push({
  id: "user",
  type: "box",
  x: 484,
  y: Y2,
  w: 120,
  h: H,
  label: "user_id",
  sub: "100,000 values",
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 2,
  quiet: true,
});
shapes.push({
  id: "eq2",
  type: "text",
  x: 636,
  y: Y2 + 16,
  w: 24,
  h: 20,
  label: "=",
  tone: PATTERN_TONE.infra,
  step: 2,
  quiet: true,
});
shapes.push({
  id: "exploded",
  type: "box",
  x: 666,
  y: Y2,
  w: 150,
  h: H,
  label: "2 billion series",
  sub: "≈ 8 TB in memory",
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 2,
  highlight: true,
});
shapes.push({ id: "down", type: "arrow", x: 0, y: 0, from: "bounded", to: "carry", dashed: true, step: 2 });

// Row 3: the guardrails.
const guards = [
  { id: "tenant", label: "Tenant limit", sub: "500,000 series ≈ 2 GB" },
  { id: "per-metric", label: "Per-metric limit", sub: "50,000 series" },
  { id: "to-logs", label: "user_id in logs", sub: "a field, never a label" },
];
guards.forEach((g, i) =>
  shapes.push({
    id: g.id,
    type: "box",
    x: 20 + i * 274,
    y: Y3,
    w: 250,
    h: H,
    label: g.label,
    sub: g.sub,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 3,
    quiet: i > 0,
  })
);
shapes.push({
  id: "reject",
  type: "text",
  x: 20,
  y: Y3 + H + 14,
  w: 796,
  h: 20,
  label: "Series 500,001 is refused with a 429 and counted; the 500,000 existing series keep flowing",
  tone: PATTERN_TONE.pattern,
  step: 3,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Cardinality: labels multiply series",
  width: 836,
  height: Y3 + H + 48,
  shapes,
  steps: [
    { title: "Bounded labels: 20,000 series" },
    { title: "One unbounded label: 2 billion" },
    { title: "Limits, and the id moves to logs" },
  ],
};

export default spec;
