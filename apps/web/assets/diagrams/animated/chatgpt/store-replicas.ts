import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Scaling the conversation store without sharding it (chatgpt, Step 3 and Deep dive 3).
// Three steps: 1 reads: a cache answers most of them; misses go through connection pools to read replicas in three
// regions · 2 writes: one primary takes every write, a hot standby is ready to take over, and the primary ships its
// write-ahead log (WAL) to the replicas · 3 the write-heavy table moves out: message bodies go to a sharded message
// store, which keeps the primary at metadata writes only.
// Working (round numbers chosen to size the system):
//   peak 35,000 prompts/s × 10 metadata reads = 350,000 reads/s; 90 % cache hits leave 35,000 reads/s
//   12 replicas (3 regions × 4): 35,000 ÷ 12 ≈ 2,900 reads/s each
//   2,000 chat servers × 20 connections = 40,000 client connections; pools hold about 300 per replica
//   metadata writes: 3,000/s average × 3 = 9,000/s at peak; message bodies: 2 per prompt × 35,000 = 70,000/s
//   left on the primary: 9,000 + 70,000 = 79,000 writes/s, about 9 × the metadata writes
// Layout: three columns (x 20, 270, 490) and a standby at x 720. The chat service and the pools share the middle
// replica row (y 94 to 150) so the pool arrows pass between the replica boxes (y 30, 100, 170); the cache sits under
// the pools at y 190; the primary at y 260, the message store at y 360. Arrows from the chat service to the primary and the message store drop down its
// left side (via x 95) so they pass under the pool box. Colours (PATTERN_TONE): the chat service teal (compute), the
// cache, replicas, primary and standby violet (stores), the moved table green (the design's change), red for the
// cost of leaving it on the primary.

const shapes: LayoutShape[] = [
  {
    id: "chat",
    type: "box",
    x: 20,
    y: 94,
    w: 150,
    h: 56,
    label: "Chat service",
    sub: "2,000 servers",
    tone: PATTERN_TONE.compute,
    fill: "pastel",
  },
  {
    id: "cache",
    type: "box",
    x: 270,
    y: 190,
    w: 160,
    h: 56,
    label: "Cache",
    sub: "90 % of reads",
    tone: PATTERN_TONE.store,
    fill: "pastel",
  },
  {
    id: "pool",
    type: "box",
    x: 270,
    y: 94,
    w: 160,
    h: 56,
    label: "Connection pools",
    sub: "40,000 → 300 per replica",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  },
  ...["A", "B", "C"].map((r, i): LayoutShape => ({
    id: `r${r}`,
    type: "box",
    x: 490,
    y: 30 + i * 70,
    w: 190,
    h: 44,
    label: `Region ${r}: 4 replicas`,
    tone: PATTERN_TONE.store,
    fill: "pastel",
  })),
  {
    id: "each",
    type: "text",
    x: 690,
    y: 112,
    w: 180,
    h: 20,
    label: "≈ 2,900 reads/s each",
    tone: PATTERN_TONE.infra,
  },
  { id: "a-cache", type: "arrow", x: 0, y: 0, from: "chat", to: "cache", label: "350,000 reads/s" },
  { id: "a-pool", type: "arrow", x: 0, y: 0, from: "chat", to: "pool", label: "35,000/s" },
  { id: "a-ra", type: "arrow", x: 0, y: 0, from: "pool", to: "rA" },
  { id: "a-rb", type: "arrow", x: 0, y: 0, from: "pool", to: "rB" },
  { id: "a-rc", type: "arrow", x: 0, y: 0, from: "pool", to: "rC" },

  {
    id: "primary",
    type: "box",
    x: 490,
    y: 260,
    w: 190,
    h: 56,
    label: "Primary",
    sub: "every write",
    tone: PATTERN_TONE.store,
    fill: "pastel",
    step: 2,
    highlight: true,
  },
  {
    id: "standby",
    type: "box",
    x: 720,
    y: 260,
    w: 150,
    h: 56,
    label: "Hot standby",
    sub: "kept in sync",
    tone: PATTERN_TONE.store,
    fill: "pastel",
    step: 2,
  },
  {
    id: "a-write",
    type: "arrow",
    x: 0,
    y: 0,
    from: "chat",
    to: "primary",
    via: [[95, 288]],
    label: "9,000 writes/s",
    step: 2,
  },
  { id: "a-standby", type: "arrow", x: 0, y: 0, from: "primary", to: "standby", step: 2 },
  { id: "a-wal", type: "arrow", x: 0, y: 0, from: "primary", to: "rC", label: "WAL", dashed: true, step: 2 },

  {
    id: "msg",
    type: "box",
    x: 490,
    y: 360,
    w: 190,
    h: 56,
    label: "Message store",
    sub: "sharded by conversation",
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 3,
    highlight: true,
  },
  {
    id: "a-msg",
    type: "arrow",
    x: 0,
    y: 0,
    from: "chat",
    to: "msg",
    via: [[95, 388]],
    label: "70,000 writes/s",
    step: 3,
  },
  {
    id: "msg-cost",
    type: "text",
    x: 695,
    y: 360,
    w: 180,
    h: 56,
    label: "left on the primary:\n79,000 writes/s,\n9 × the metadata",
    tone: PATTERN_TONE.fail,
    step: 3,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One primary, many replicas, and the write-heavy table moved out",
  width: 880,
  height: 440,
  shapes,
  steps: [
    { title: "Reads: cache, pools, replicas" },
    { title: "Writes: one primary and a standby" },
    { title: "Move the write-heavy table out" },
  ],
};

export default spec;
