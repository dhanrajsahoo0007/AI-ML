import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// An exact leaderboard in one sorted set, and the cost of each command on it (top-k-and-leaderboards, first figure).
// Left: the sorted set `views` ranked by score, highest first: five of Brightpost's 1,000,000 products with their
// views in the last hour (illustrative scores), then the rest. Right: four commands against it with their cost.
// Working (computed below): N = 1,000,000 members; log₂ N = 19.9, written "about 20 steps". ZRANGE … REV for the top
// 10 costs O(log N + M) with M = 10 returned. log₂ 1,000,000,000 = 29.9, about 30: a thousand times more members
// costs 10 more steps. ZSCORE reads the hash table, so it does not depend on N.
// Layout (860 × 330): the set as rank, member and score cells from x 20; the commands from x 420, each a command box
// and a cost box on one row.
// Colours (PATTERN_TONE): the sorted set violet (a store), the commands orange (requests), costs neutral.
// Fact check (2026-11-16, redis.io command pages): ZADD and ZINCRBY O(log N); ZREVRANK O(log N); ZRANGE and
// ZREVRANGE O(log N + M); ZSCORE O(1); ZREVRANGE is deprecated since 6.2 in favour of ZRANGE … REV; sorted sets are a
// skip list plus a hash table (redis.io sorted sets page).

const N = SHOP.catalogueProducts;
const logN = Math.round(Math.log2(N)); // 20
const ROWS: [string, number][] = [
  ["kettle", 41_200],
  ["toaster", 18_750],
  ["mug", 12_400],
  ["lamp", 9_980],
  ["blender", 8_310],
];
const shapes: LayoutShape[] = [];

const X0 = 20;
const Y0 = 70;
const RH = 36;
const RANK_W = 60;
const MEM_W = 150;
const SCORE_W = 120;

shapes.push({
  id: "set-t",
  type: "text",
  x: X0,
  y: 16,
  w: RANK_W + MEM_W + SCORE_W,
  h: 18,
  label: "Sorted set “views”, highest score first",
  tone: PATTERN_TONE.store,
});
const head = (id: string, x: number, w: number, label: string) =>
  shapes.push({ id, type: "text", x, y: 42, w, h: 18, label, tone: PATTERN_TONE.infra });
head("h-rank", X0, RANK_W, "rank");
head("h-mem", X0 + RANK_W, MEM_W, "member");
head("h-score", X0 + RANK_W + MEM_W, SCORE_W, "score");

ROWS.forEach(([member, score], i) => {
  const y = Y0 + i * RH;
  shapes.push({
    id: `r${i}`,
    type: "cell",
    x: X0,
    y,
    w: RANK_W,
    h: RH,
    label: String(i),
    tone: PATTERN_TONE.store,
    quiet: i > 0,
  });
  shapes.push({
    id: `m${i}`,
    type: "cell",
    x: X0 + RANK_W,
    y,
    w: MEM_W,
    h: RH,
    label: member,
    tone: PATTERN_TONE.store,
    quiet: true,
  });
  shapes.push({
    id: `s${i}`,
    type: "cell",
    x: X0 + RANK_W + MEM_W,
    y,
    w: SCORE_W,
    h: RH,
    label: n(score),
    tone: PATTERN_TONE.store,
    quiet: true,
  });
});
shapes.push({
  id: "rest",
  type: "text",
  x: X0,
  y: Y0 + ROWS.length * RH + 8,
  w: RANK_W + MEM_W + SCORE_W,
  h: 18,
  label: `… ${n(N - ROWS.length)} more members`,
  tone: PATTERN_TONE.infra,
});
shapes.push({
  id: "impl",
  type: "text",
  x: X0,
  y: Y0 + ROWS.length * RH + 34,
  w: RANK_W + MEM_W + SCORE_W,
  h: 34,
  label: "Inside: a skip list kept in score order\nand a hash table from member to score",
  tone: PATTERN_TONE.infra,
});

const CX = 420;
const CMD_W = 230;
const COST_W = 190;
const OPS: [string, string, string][] = [
  ["ZINCRBY views 1 kettle", "O(log N)", `one view: about ${logN} steps`],
  ["ZRANGE views 0 9 REV", "O(log N + 10)", "the top 10, already sorted"],
  ["ZREVRANK views kettle", "O(log N)", "kettle’s rank: 0"],
  ["ZSCORE views kettle", "O(1)", "a hash-table lookup"],
];
shapes.push({
  id: "ops-t",
  type: "text",
  x: CX,
  y: 16,
  w: CMD_W + 10 + COST_W,
  h: 18,
  label: `Commands and their cost, N = ${n(N)}`,
  tone: PATTERN_TONE.traffic,
});
OPS.forEach(([cmd, cost, sub], i) => {
  const y = 50 + i * 62;
  shapes.push({
    id: `c${i}`,
    type: "box",
    x: CX,
    y,
    w: CMD_W,
    h: 46,
    label: cmd,
    tone: PATTERN_TONE.traffic,
    fill: "pastel",
  });
  shapes.push({
    id: `k${i}`,
    type: "box",
    x: CX + CMD_W + 10,
    y,
    w: COST_W,
    h: 46,
    label: cost,
    sub,
    tone: PATTERN_TONE.infra,
  });
});
shapes.push({
  id: "log",
  type: "text",
  x: CX,
  y: 300,
  w: CMD_W + 10 + COST_W,
  h: 18,
  label: `log₂ ${n(N)} ≈ ${logN} steps; a billion members would need ${Math.round(Math.log2(1e9))}`,
  tone: PATTERN_TONE.infra,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A sorted-set leaderboard and the cost of each command",
  width: 860,
  height: 330,
  shapes,
};

export default spec;
