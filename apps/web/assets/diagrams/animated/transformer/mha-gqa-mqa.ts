import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// MHA, GQA and MQA side by side: which key/value head each query head reads. Replaces the Mermaid under "Picking
// MHA, GQA or MQA" on the Efficient Attention page. Drawn scaled down to 8 query heads (MHA 8 KV heads, GQA 2 KV
// heads in groups of 4, MQA 1 KV head); the text under each panel gives the page's real model: 64 query heads with
// 64, 8 or 1 KV heads. Each KV head is a teal key cell over a violet value cell.
//
// KV cache per token, from the page's formula bytes = 2 × L × H_kv × d_head × seq len × batch × bytes per value,
// with seq len = 1, batch = 1 and the page's model: L = 80 layers, d_head = 128, 16-bit values (2 bytes):
// - MHA, H_kv = 64: 2 × 80 × 64 × 128 × 2 = 2,621,440 bytes ≈ 2.62 MB (2.5 MiB). The page says "about 2.6 MB".
// - GQA, H_kv = 8:  2 × 80 × 8 × 128 × 2 = 327,680 bytes ≈ 0.33 MB, 8× smaller. The page says "about 0.33 MB".
// - MQA, H_kv = 1:  2 × 80 × 1 × 128 × 2 = 40,960 bytes ≈ 0.04 MB (41 KB), 64× smaller ("shrinks by the number of
//   heads", page §3).
// MB here is 10^6 bytes, as on the page. The bars under the panels share one scale: MHA's bar is the full 234 px,
// GQA's 234 / 8 ≈ 29 px, MQA's 234 / 64 ≈ 3.7 px; each bar is half keys (teal), half values (violet).

const LAYERS = 80;
const D_HEAD = 128;
const BYTES = 2; // 16-bit values
const Q_HEADS_REAL = 64;
const cacheBytes = (hKv: number) => 2 * LAYERS * hKv * D_HEAD * BYTES;

const Q = 8; // query heads drawn
const CELL = 24;
const GAP = 6;
const ROW_W = Q * CELL + (Q - 1) * GAP; // 234
const PANEL_W = 272;
const PANELS = [16, 304, 592];
const GROUP_Y = 40;
const GROUP_H = 352;
const Y = {
  qText: 64,
  q: 86,
  k: 180,
  kvText: 236,
  real: 256,
  cacheText: 290,
  bar: 314,
  value: 336,
  working: 358,
};
const rowX = (p: number) => PANELS[p] + (PANEL_W - ROW_W) / 2;
const qX = (p: number, i: number) => rowX(p) + i * (CELL + GAP);

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 18) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

const fmtMB = (b: number) => (b / 1e6).toFixed(2);

interface Variant {
  id: string;
  title: string;
  hKv: number; // KV heads drawn
  hKvReal: number; // KV heads in the page's model
}

const VARIANTS: Variant[] = [
  { id: "mha", title: "Multi-head (MHA)", hKv: 8, hKvReal: 64 },
  { id: "gqa", title: "Grouped-query (GQA)", hKv: 2, hKvReal: 8 },
  { id: "mqa", title: "Multi-query (MQA)", hKv: 1, hKvReal: 1 },
];
const MAX_BYTES = cacheBytes(VARIANTS[0].hKvReal);

function panel(p: number, v: Variant): LayoutShape[] {
  const out: LayoutShape[] = [];
  const group = Q / v.hKv; // query heads per KV head
  // Query heads.
  for (let i = 0; i < Q; i++)
    out.push({
      id: `${v.id}-q${i}`,
      type: "cell",
      x: qX(p, i),
      y: Y.q,
      w: CELL,
      h: CELL,
      tone: ROLE_TONE.query,
      fill: "pastel",
      quiet: true,
    });
  // KV heads: each centred under the query heads that share it.
  for (let g = 0; g < v.hKv; g++) {
    const first = qX(p, g * group);
    const last = qX(p, (g + 1) * group - 1) + CELL;
    const kx = (first + last) / 2 - CELL / 2;
    const cell = (part: "k" | "v", y: number, tone: LayoutTone): LayoutShape => ({
      id: `${v.id}-${part}${g}`,
      type: "cell",
      x: kx,
      y,
      w: CELL,
      h: CELL,
      label: part.toUpperCase(),
      tone,
      fill: "pastel",
      quiet: true,
    });
    out.push(cell("k", Y.k, ROLE_TONE.key), cell("v", Y.k + CELL, ROLE_TONE.value));
    // One line per query head, landing spread across the top of its key cell.
    for (let j = 0; j < group; j++) {
      const i = g * group + j;
      const land = group === 1 ? kx + CELL / 2 : kx + 3 + (j * (CELL - 6)) / (group - 1);
      out.push({
        id: `${v.id}-line${i}`,
        type: "path",
        x: 0,
        y: 0,
        points: [
          [qX(p, i) + CELL / 2, Y.q + CELL + 2],
          [Math.round(land * 10) / 10, Y.k - 2],
        ],
        tone: "neutral",
      });
    }
  }
  const x = PANELS[p] + 8;
  const w = PANEL_W - 16;
  const bytes = cacheBytes(v.hKvReal);
  const barW = (ROW_W * bytes) / MAX_BYTES;
  const ratio = MAX_BYTES / bytes;
  out.push(
    text(`${v.id}-q-text`, x, Y.qText, w, `${Q} query heads`, ROLE_TONE.query),
    text(`${v.id}-kv-text`, x, Y.kvText, w, `${v.hKv} KV head${v.hKv > 1 ? "s" : ""}`, ROLE_TONE.key),
    text(`${v.id}-real`, x, Y.real, w, `Real model: ${Q_HEADS_REAL} query, ${v.hKvReal} KV`),
    text(`${v.id}-cache-text`, x, Y.cacheText, w, "KV cache per token"),
    // The bar: keys then values, on one scale across the panels.
    {
      id: `${v.id}-bar-k`,
      type: "cell",
      x: rowX(p),
      y: Y.bar,
      w: barW / 2,
      h: 14,
      tone: ROLE_TONE.key,
      fill: "pastel",
      quiet: true,
    },
    {
      id: `${v.id}-bar-v`,
      type: "cell",
      x: rowX(p) + barW / 2,
      y: Y.bar,
      w: barW / 2,
      h: 14,
      tone: ROLE_TONE.value,
      fill: "pastel",
      quiet: true,
    },
    text(
      `${v.id}-value`,
      x,
      Y.value,
      w,
      ratio === 1 ? `≈ ${fmtMB(bytes)} MB` : `≈ ${fmtMB(bytes)} MB (${ratio}× smaller)`,
      "neutral",
      20
    ),
    text(`${v.id}-working`, x, Y.working, w, `2 × ${LAYERS} × ${v.hKvReal} × ${D_HEAD} × ${BYTES} bytes`)
  );
  return out;
}

const ARROW_Y = 424;
const spec: LayoutSpec = {
  kind: "layout",
  title: "MHA, GQA and MQA: query heads sharing key/value heads",
  width: 880,
  height: 540,
  groups: VARIANTS.map((v, p) => ({
    id: `g-${v.id}`,
    title: v.title,
    tone: ROLE_TONE.block,
    x: PANELS[p],
    y: GROUP_Y,
    w: PANEL_W,
    h: GROUP_H,
  })),
  shapes: [
    ...VARIANTS.flatMap((v, p) => panel(p, v)),
    {
      id: "faster",
      type: "arrow",
      x: 140,
      y: ARROW_Y,
      w: 600,
      h: 0,
      label: "smaller cache, faster decode",
    },
    {
      id: "quality",
      type: "arrow",
      x: 740,
      y: ARROW_Y + 34,
      w: -600,
      h: 0,
      label: "more quality",
    },
    text(
      "foot",
      16,
      ARROW_Y + 60,
      848,
      `Drawn with ${Q} query heads; the real model has ${Q_HEADS_REAL}. Cache per token = 2 (K and V) × ${LAYERS} layers × KV heads × ` +
        `d_head ${D_HEAD} × ${BYTES} bytes (16-bit).\nThe bars share one scale. GQA is the common compromise.`,
      "neutral",
      36
    ),
  ],
};

export default spec;
