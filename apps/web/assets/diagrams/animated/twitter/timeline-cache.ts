import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The timeline cache, priced from one entry up to the fleet (twitter, Deep dive 2).
// Four steps: 1 one entry: an 8-byte post id and an 8-byte author id, 16 bytes · 2 one reader's list: new ids go on
// the front, the list is trimmed to 500, so 500 × 16 B = 8,000 B ≈ 8 KB · 3 the fleet: only users active in the last
// 30 days get a list · 4 what the design refuses to cache: every registered user, and whole posts instead of ids.
// Working (round numbers chosen to size the system):
//   400,000,000 users active in 30 days × 8,000 B = 3,200,000,000,000 B = 3.2 TB of entries.
//   × 1.5 for list and key overhead = 4.8 TB; × 2 copies = 9.6 TB; ÷ 64 GB usable a node = 150 nodes.
//   Every registered user: 1,500,000,000 × 8,000 B = 12 TB of entries (3.75 × the active set), mostly never read.
//   Whole posts of about 1,000 B instead of 16-byte entries: 400,000,000 × 500 × 1,000 B = 200 TB (62.5 × the ids),
//   and every edit or delete of a post would have to rewrite it in every follower's list.
// Layout (880 × 420): a row label on the left (x 20, w 130), content from x 160. Row 1 y 40, row 2 y 120, row 3
// y 230, row 4 y 340. Colours (PATTERN_TONE): ids pink, the list green (the pattern's own part), the fleet sum violet
// (a store), rejected options red, labels and arrows neutral.

const ENTRY_B = 8 + 8;
const LIST_LEN = 500;
const LIST_B = ENTRY_B * LIST_LEN; // 8,000
const ACTIVE = 400_000_000;
const RAW_TB = (ACTIVE * LIST_B) / 1e12; // 3.2
const OVERHEAD = 1.5;
const COPIES = 2;
const TOTAL_TB = Math.round(RAW_TB * OVERHEAD * COPIES * 10) / 10; // 9.6
const NODE_GB = 64;
const NODES = Math.round((TOTAL_TB * 1000) / NODE_GB); // 150
const REGISTERED = 1_500_000_000;
const ALL_TB = (REGISTERED * LIST_B) / 1e12; // 12
const POST_B = 1_000;
const FULL_TB = (ACTIVE * LIST_LEN * POST_B) / 1e12; // 200

const fmt = (v: number) => v.toLocaleString("en-GB");
const shapes: LayoutShape[] = [];
const rowLabel = (id: string, y: number, label: string, step: number) =>
  shapes.push({ id, type: "text", x: 20, y, w: 130, h: 48, label, tone: PATTERN_TONE.infra, step });

// Step 1: one entry.
rowLabel("l1", 40, "One entry", 1);
shapes.push({
  id: "pid",
  type: "box",
  x: 160,
  y: 40,
  w: 150,
  h: 48,
  label: "post id",
  sub: "8 bytes, time-sorted",
  tone: PATTERN_TONE.id,
  fill: "pastel",
});
shapes.push({
  id: "aid",
  type: "box",
  x: 310,
  y: 40,
  w: 150,
  h: 48,
  label: "author id",
  sub: "8 bytes",
  tone: PATTERN_TONE.id,
  fill: "pastel",
});
shapes.push({
  id: "esum",
  type: "text",
  x: 480,
  y: 40,
  w: 340,
  h: 48,
  label: `= ${ENTRY_B} bytes; the post body is not here`,
  tone: PATTERN_TONE.infra,
});

// Step 2: one list.
rowLabel("l2", 120, "One reader", 2);
shapes.push({
  id: "key",
  type: "box",
  x: 160,
  y: 120,
  w: 90,
  h: 48,
  label: "tl:42",
  sub: "list key",
  tone: PATTERN_TONE.infra,
  fill: "pastel",
  step: 2,
});
const cells = ["newest", "", "", "", "", "#500"];
cells.forEach((c, i) =>
  shapes.push({
    id: `c${i}`,
    type: "cell",
    x: 270 + i * 58,
    y: 120,
    w: 52,
    h: 48,
    label: c,
    tone: PATTERN_TONE.pattern,
    step: 2,
    quiet: i > 0,
    highlight: i === 0,
  })
);
shapes.push({
  id: "push",
  type: "text",
  x: 250,
  y: 172,
  w: 150,
  h: 20,
  label: "new id in front",
  tone: PATTERN_TONE.infra,
  step: 2,
});
shapes.push({
  id: "trim",
  type: "text",
  x: 530,
  y: 172,
  w: 110,
  h: 20,
  label: "trim to 500",
  tone: PATTERN_TONE.infra,
  step: 2,
});
shapes.push({
  id: "lsum",
  type: "text",
  x: 630,
  y: 120,
  w: 230,
  h: 48,
  label: `${LIST_LEN} × ${ENTRY_B} B = ${fmt(LIST_B)} B ≈ 8 KB`,
  tone: PATTERN_TONE.infra,
  step: 2,
});

// Step 3: the fleet.
rowLabel("l3", 230, "Active users", 3);
const fleet = [
  { id: "f1", label: "400 M users", sub: "active in 30 days" },
  { id: "f2", label: `${RAW_TB} TB`, sub: "× 8 KB each" },
  { id: "f3", label: `${TOTAL_TB} TB`, sub: "× 1.5 overhead, × 2 copies" },
  { id: "f4", label: `${NODES} nodes`, sub: `${NODE_GB} GB usable each` },
];
fleet.forEach((f, i) =>
  shapes.push({
    id: f.id,
    type: "box",
    x: 160 + i * 180,
    y: 230,
    w: 150,
    h: 56,
    label: f.label,
    sub: f.sub,
    tone: PATTERN_TONE.store,
    fill: "pastel",
    step: 3,
    highlight: i === 3,
  })
);
for (let i = 0; i < 3; i++)
  shapes.push({ id: `fa${i}`, type: "arrow", x: 0, y: 0, from: fleet[i].id, to: fleet[i + 1].id, step: 3 });

// Step 4: what is not cached.
rowLabel("l4", 340, "Not cached", 4);
shapes.push({
  id: "all",
  type: "box",
  x: 160,
  y: 340,
  w: 220,
  h: 56,
  label: `Every user: ${ALL_TB} TB`,
  sub: "1.5 B lists, most never read",
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 4,
});
shapes.push({
  id: "full",
  type: "box",
  x: 400,
  y: 340,
  w: 220,
  h: 56,
  label: `Whole posts: ${FULL_TB} TB`,
  sub: "1 KB each, 62.5 × the ids",
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 4,
});
shapes.push({
  id: "miss",
  type: "box",
  x: 640,
  y: 340,
  w: 220,
  h: 56,
  label: "Inactive: rebuild on miss",
  sub: "about 300 ms, once",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 4,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The timeline cache: ids only, bounded, active users only",
  width: 880,
  height: 420,
  shapes,
  steps: [
    { title: "One entry: two ids" },
    { title: "One reader's list, capped at 500" },
    { title: "Every active user" },
    { title: "What the design refuses to cache" },
  ],
};

export default spec;
