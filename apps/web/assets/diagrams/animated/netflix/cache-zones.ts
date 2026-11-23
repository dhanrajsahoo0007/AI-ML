import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The catalogue cache: a full copy per zone, best effort across regions (netflix case study, Deep dive 3).
// Three steps: 1 every write goes to all three zones' copies; each zone's browse servers read their own zone's copy ·
// 2 zone b's copy is lost (a red note above it): its servers read a copy in another zone, so nothing becomes a miss · 3 other regions
// receive the changes asynchronously, with no guarantee; a lost update is fixed by the TTL or the next write.
// Working (round numbers chosen to size the system):
//   reads: 25,000 home pages/s × 400 title and row objects = 10,000,000 reads/s; ÷ 3 zones ≈ 3,300,000 per zone.
//   size: 600,000,000 profiles × 4 KB of rows = 2.4 TB, + 0.1 TB of title data = 2.5 TB per copy.
//   zone lost: its 3,300,000 reads/s split over the two others: +1,650,000 each, so each zone is sized for 5,000,000.
//   one sharded copy instead: losing a zone loses a third of the keys = 3,300,000 misses/s on the stores behind.
// Layout (860 × 450): three zone groups (170 wide, 15 apart) for region A from x 30; region B's group at x 640; a
//   row writer under zone a with an arrow to each copy; notes at the bottom.
// Colours (PATTERN_TONE): browse servers teal (compute), cache copies violet (store), writes blue (data), the
//   fallback read and region B green (the pattern), the lost copy red (fail). Four tones plus red.
// Fact check (2026-11-17): the per-zone mirror, the read from another zone when the local one is unavailable and the
//   best-effort replication follow the EVCache features page (read 2026); the numbers are this page's.

const ZONES = ["a", "b", "c"];
const GX = (i: number) => 30 + i * 185;
const ZONE_W = 170;
const READS_PER_ZONE_M = 10 / 3;

const shapes: LayoutShape[] = [];
ZONES.forEach((z, i) => {
  const x = GX(i) + 15;
  shapes.push({
    id: `srv-${z}`,
    type: "box",
    x,
    y: 70,
    w: 140,
    h: 48,
    label: "Browse servers",
    sub: `${READS_PER_ZONE_M.toFixed(1)} M reads/s`,
    tone: PATTERN_TONE.compute,
    fill: "pastel",
  });
  shapes.push({
    id: `copy-${z}`,
    type: "box",
    x,
    y: 180,
    w: 140,
    h: 52,
    label: "Cache copy",
    sub: "2.5 TB, every key",
    tone: PATTERN_TONE.store,
    fill: "pastel",
  });
  shapes.push({ id: `rd-${z}`, type: "arrow", x: 0, y: 0, from: `srv-${z}`, to: `copy-${z}`, packet: true });
  shapes.push({ id: `wr-${z}`, type: "arrow", x: 0, y: 0, from: "writer", to: `copy-${z}`, dashed: true });
});
shapes.push({
  id: "writer",
  type: "box",
  x: 30,
  y: 300,
  w: 200,
  h: 46,
  label: "Row writer",
  sub: "nightly rows, title edits: set × 3",
  tone: PATTERN_TONE.data,
  fill: "pastel",
});
shapes.push({
  id: "n1",
  type: "text",
  x: 20,
  y: 364,
  w: 820,
  h: 18,
  label: "every write sets all 3 copies; each zone reads its own: 10 M reads/s ÷ 3 = 3.3 M per zone",
  tone: PATTERN_TONE.infra,
});

// Step 2: zone b's copy is lost.
shapes.push({
  id: "lost",
  type: "text",
  x: GX(1) + 97,
  y: 132,
  w: 70,
  h: 36,
  label: "copy\nlost",
  tone: PATTERN_TONE.fail,
  step: 2,
  highlight: true,
});
shapes.push({
  id: "fallback",
  type: "arrow",
  x: 0,
  y: 0,
  from: "srv-b",
  to: "copy-a",
  tone: PATTERN_TONE.pattern,
  packet: true,
  step: 2,
});
shapes.push({
  id: "n2",
  type: "text",
  x: 20,
  y: 390,
  w: 820,
  h: 18,
  label:
    "zone b's 3.3 M reads/s move to zones a and c (+1.65 M each): size each for 5 M; one sharded copy would miss 3.3 M/s",
  tone: PATTERN_TONE.fail,
  step: 2,
});

// Step 3: other regions, best effort.
shapes.push({
  id: "copy-r2",
  type: "box",
  x: 665,
  y: 180,
  w: 150,
  h: 52,
  label: "Cache copies",
  sub: "3 zones, own servers",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 3,
});
shapes.push({
  id: "repl",
  type: "arrow",
  x: 0,
  y: 0,
  from: "copy-c",
  to: "copy-r2",
  dashed: true,
  packet: true,
  tone: PATTERN_TONE.pattern,
  step: 3,
});
shapes.push({
  id: "n3",
  type: "text",
  x: 20,
  y: 416,
  w: 820,
  h: 18,
  label: "other regions get changes asynchronously, no guarantee: a lost update is fixed by the TTL or the next write",
  tone: PATTERN_TONE.pattern,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A full cache copy per zone, best effort across regions",
  width: 860,
  height: 450,
  groups: [
    ...ZONES.map((z, i) => ({
      id: `zone-${z}`,
      title: `Region A, zone ${z}`,
      tone: PATTERN_TONE.infra,
      x: GX(i),
      y: 30,
      w: ZONE_W,
      h: 230,
    })),
    { id: "region-b", title: "Region B", tone: PATTERN_TONE.pattern, x: 640, y: 30, w: 200, h: 230 },
  ],
  shapes,
  steps: [
    { title: "A copy in every zone" },
    { title: "A zone's copy is lost" },
    { title: "Other regions, best effort" },
  ],
};

export default spec;
