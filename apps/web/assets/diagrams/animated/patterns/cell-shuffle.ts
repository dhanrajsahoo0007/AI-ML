import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Plain sharding against shuffle sharding on the same 8 workers (bulkheads-and-cell-architecture, shuffle figure).
// Two steps: 1 plain sharding: 4 shards of 2 workers; a poison request from shopper A kills both workers of shard 1,
// so every shopper on that shard is down: 1 in 4 · 2 shuffle sharding: every pair of the 8 workers is a shard (28 of
// them); A is on W1 and W4, so a poison request kills only A's shard; 12 shards lose one of their two workers and
// still answer on the other (clients retry); 15 shards share no worker with A.
// Working (computed below): C(8, 2) = 8 × 7 ÷ 2 = 28 shards. Shards containing W1 or W4: 7 + 7 − 1 = 13, of which
// one is A's own, so 12 share exactly one worker; 28 − 13 = 15 share none. Down: 1 ÷ 4 = 25 % against
// 1 ÷ 28 = 3.6 %, 7 times fewer.
// Layout: top band a row of 8 workers in 4 pairs; bottom band the 28 shards as the upper triangle of an 8 × 8 grid
// (row = first worker, column = second), with the counts on the right.
// Colours (PATTERN_TONE): shards still healthy green (the pattern), shards with one worker lost neutral, the dead
// shard red. Fact check (2026-11-16, AWS Builders' Library, "Workload isolation using shuffle-sharding"): the
// article's own example is 8 workers, shards of 2, 28 combinations, the rainbow customer on workers 1 and 4, and a
// scope of impact of 1/28 against 1/4 for plain sharding.

const WORKERS = 8;
const A = [1, 4];
const shards: [number, number][] = [];
for (let i = 1; i <= WORKERS; i++) for (let j = i + 1; j <= WORKERS; j++) shards.push([i, j]);
const total = shards.length; // 28
const isA = (s: [number, number]) => s[0] === A[0] && s[1] === A[1];
const touches = (s: [number, number]) => s.some((w) => A.includes(w));
const oneLost = shards.filter((s) => touches(s) && !isA(s)).length; // 12
const clean = total - oneLost - 1; // 15
const plainShards = WORKERS / 2; // 4
const pct = (x: number) => `${Math.round(x * 1000) / 10} %`;

const shapes: LayoutShape[] = [];

// Step 1: plain sharding.
shapes.push({
  id: "plain-title",
  type: "text",
  x: 40,
  y: 14,
  w: 760,
  h: 18,
  label: `Plain sharding: ${plainShards} shards of 2 workers`,
  tone: PATTERN_TONE.infra,
});
const BW = 70;
for (let w = 1; w <= WORKERS; w++) {
  const pair = Math.floor((w - 1) / 2);
  const dead = pair === 0;
  shapes.push({
    id: `p-w${w}`,
    type: "box",
    x: 90 + pair * (2 * BW + 8 + 30) + ((w - 1) % 2) * (BW + 8),
    y: 42,
    w: BW,
    h: 40,
    label: `W${w}`,
    tone: dead ? PATTERN_TONE.fail : PATTERN_TONE.pattern,
    fill: dead ? "soft" : "pastel",
  });
}
shapes.push({
  id: "plain-note",
  type: "text",
  x: 40,
  y: 92,
  w: 760,
  h: 18,
  label: `Shopper A’s poison request kills W1 and W2: all of shard 1 is down, 1 in ${plainShards} shoppers (${pct(1 / plainShards)})`,
  tone: PATTERN_TONE.fail,
});

// Step 2: shuffle sharding, the 28 pairs as a triangle.
const TOP = 160;
shapes.push({
  id: "shuffle-title",
  type: "text",
  x: 40,
  y: TOP - 18,
  w: 760,
  h: 18,
  label: `Shuffle sharding: every pair of the ${WORKERS} workers is a shard, ${WORKERS} × ${WORKERS - 1} ÷ 2 = ${total}`,
  tone: PATTERN_TONE.pattern,
  step: 2,
});
const CW = 48;
const CH = 30;
const GX = 90;
const GY = TOP + 30;
for (let j = 2; j <= WORKERS; j++) {
  shapes.push({
    id: `col-${j}`,
    type: "text",
    x: GX + (j - 2) * CW,
    y: GY - 22,
    w: CW - 4,
    h: 18,
    label: `W${j}`,
    tone: PATTERN_TONE.infra,
    step: 2,
  });
}
for (let i = 1; i < WORKERS; i++) {
  shapes.push({
    id: `row-${i}`,
    type: "text",
    x: GX - 48,
    y: GY + (i - 1) * (CH + 4),
    w: 40,
    h: CH,
    label: `W${i}`,
    tone: PATTERN_TONE.infra,
    step: 2,
  });
}
shards.forEach((s) => {
  const dead = isA(s);
  const hit = touches(s) && !dead;
  shapes.push({
    id: `s-${s[0]}-${s[1]}`,
    type: "cell",
    x: GX + (s[1] - 2) * CW,
    y: GY + (s[0] - 1) * (CH + 4),
    w: CW - 4,
    h: CH,
    label: dead ? "A" : undefined,
    tone: dead ? PATTERN_TONE.fail : hit ? PATTERN_TONE.infra : PATTERN_TONE.pattern,
    fill: dead ? "soft" : hit ? "paper" : "pastel",
    step: 2,
    quiet: !dead,
    highlight: dead,
  });
});

const NX = GX + (WORKERS - 1) * CW + 40;
const NW = 840 - NX - 20;
const notes: [string, string, (typeof PATTERN_TONE)[keyof typeof PATTERN_TONE]][] = [
  ["n-dead", `1 shard down: A’s own (W1 + W4)\n1 in ${total} = ${pct(1 / total)} of shoppers`, PATTERN_TONE.fail],
  ["n-one", `${oneLost} shards lose one worker\nand retry on the other`, PATTERN_TONE.infra],
  ["n-clean", `${clean} shards share no worker with A`, PATTERN_TONE.pattern],
  [
    "n-cmp",
    `${pct(1 / plainShards)} down before, ${pct(1 / total)} now:\n${total / plainShards} times fewer shoppers`,
    PATTERN_TONE.infra,
  ],
];
notes.forEach(([id, label, tone], k) => {
  shapes.push({
    id,
    type: "box",
    x: NX,
    y: GY + k * 58,
    w: NW,
    h: 48,
    label,
    tone,
    fill: tone === PATTERN_TONE.infra ? "paper" : "soft",
    step: 2,
  });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Plain sharding against shuffle sharding on 8 workers",
  width: 840,
  height: GY + 7 * (CH + 4) + 16,
  shapes,
  steps: [{ title: "Plain sharding: 4 shards" }, { title: "Shuffle sharding: 28 shards" }],
};

export default spec;
