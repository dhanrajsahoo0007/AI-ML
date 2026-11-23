import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Retention tiers (metrics-and-logging, Data model and Step 7): raw points for 15 days, 1-minute rollups for 90 days,
// 1-hour rollups for 2 years, all as compressed blocks in object storage (the last 2 hours also in memory).
// Working (10,000,000 series, 1.37 bytes a stored value at every tier, a round assumption):
// raw: 10,000,000 × 8,640 points a day × 1.37 B = 118 GB a day; × 15 days = 1.8 TB.
// 1-minute: 4 values (min, max, sum, count) × 1,440 minutes × 10,000,000 × 1.37 B = 79 GB a day; × 90 = 7.1 TB.
// 1-hour: 4 × 24 × 10,000,000 × 1.37 B = 1.3 GB a day; × 730 = 0.96 TB.
// Tiered total: 1.8 + 7.1 + 0.96 = 9.8 TB. Raw for 2 years: 118 GB × 730 = 86 TB, about 9 × more.
// Note: a 1-minute rollup with four aggregates keeps 5,760 values a day against 8,640 raw, only a third fewer; the
// saving comes from the 1-hour tier and from deleting raw data after 15 days.
// Layout: three 220-wide tier boxes at y 40 (x 20, 320, 620), 80 apart, joined by compactor arrows; under each a total cell at
// y 134; a comparison row at y 214. Colours (PATTERN_TONE): tiers violet (stores), the compactor arrows neutral,
// the totals blue (data), the comparison green against neutral.

const X = [20, 320, 620];
const W = 220;
const tiers = [
  { id: "raw", label: "Raw, every 10 s", sub: "kept 15 days · 118 GB a day", total: "1.8 TB" },
  { id: "min", label: "1-minute rollups", sub: "kept 90 days · 79 GB a day", total: "7.1 TB" },
  { id: "hour", label: "1-hour rollups", sub: "kept 2 years · 1.3 GB a day", total: "0.96 TB" },
];

const shapes: LayoutShape[] = [];
tiers.forEach((t, i) => {
  shapes.push({
    id: t.id,
    type: "box",
    x: X[i],
    y: 40,
    w: W,
    h: 60,
    label: t.label,
    sub: t.sub,
    tone: PATTERN_TONE.store,
    fill: "pastel",
  });
  shapes.push({
    id: `${t.id}-total`,
    type: "cell",
    x: X[i] + 35,
    y: 134,
    w: W - 70,
    h: 40,
    label: t.total,
    tone: PATTERN_TONE.data,
  });
  shapes.push({ id: `${t.id}-down`, type: "arrow", x: 0, y: 0, from: t.id, to: `${t.id}-total`, head: false });
});
shapes.push({ id: "c1", type: "arrow", x: 0, y: 0, from: "raw", to: "min", label: "compact" });
shapes.push({ id: "c2", type: "arrow", x: 0, y: 0, from: "min", to: "hour", label: "compact" });
shapes.push({
  id: "aggs",
  type: "text",
  x: 20,
  y: 8,
  w: 820,
  h: 20,
  label: "Each rollup keeps min, max, sum and count, so averages, rates and peaks survive",
  tone: PATTERN_TONE.infra,
});
shapes.push({
  id: "all-raw",
  type: "box",
  x: 20,
  y: 214,
  w: 380,
  h: 52,
  label: "All raw for 2 years: 86 TB",
  sub: "118 GB × 730 days",
  tone: PATTERN_TONE.infra,
  fill: "pastel",
});
shapes.push({
  id: "tiered",
  type: "box",
  x: 450,
  y: 214,
  w: 380,
  h: 52,
  label: "Tiered: 9.8 TB",
  sub: "1.8 + 7.1 + 0.96, about 9 × less",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  highlight: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Retention tiers: raw, 1-minute, 1-hour",
  width: 860,
  height: 286,
  shapes,
};

export default spec;
