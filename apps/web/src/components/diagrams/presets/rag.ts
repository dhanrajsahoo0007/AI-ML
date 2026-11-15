// Shared building blocks for the RAG figures in assets/diagrams/animated/rag/. Pure functions and constants: every RAG
// figure keeps one colour legend (RAG_TONE) and one running example (the Brightpost help centre), so a number that
// appears in two figures comes from the same constant below. Specs import from here and never hard-code a tone for
// a role or retype a running-example number.

import type { LayoutShape, LayoutTone } from "../types";

// The Transformer preset owns the vector and matrix builders; RAG figures use the same ones (embeddings are pink in
// both tracks).
export { matrix, vector } from "./transformer";

type Point = [number, number];

// ── Colour legend ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The fixed RAG legend: a role keeps its tone in every RAG concept figure. At most four tones plus neutral in one
 * figure; red only where something breaks.
 */
export const RAG_TONE = {
  /** Documents, chunks, passages. */
  text: "blue",
  /** The embedding model, vectors and the embedding space (pink as on the Transformer pages). */
  embedding: "pink",
  /** The vector index and other stores. */
  store: "violet",
  /** Keyword index, BM25 and metadata filters. */
  keyword: "teal",
  /** The question and its rewrites. */
  query: "orange",
  /** Ranking: reranker, fusion, scores. */
  rank: "lime",
  /** The LLM, generation and the answer. */
  answer: "green",
  /** Failure, stale data, blocked access, hallucination. */
  failure: "red",
  /** The user, orchestration and infrastructure. */
  infra: "neutral",
} as const satisfies Record<string, LayoutTone>;


// ── The running example: Brightpost's help centre ───────────────────────────────────────────────────────────────

/**
 * The corpus. Working:
 * - 1,200 help articles averaging 1,100 tokens each = 1,320,000 tokens of text.
 * - Chunks of 400 tokens with a 50-token overlap start every 350 tokens (stride = 400 - 50). A 1,100-token article
 *   gives chunks at 0-400, 350-750 and 700-1,100: ceil((1,100 - 50) / 350) = 3 chunks per article.
 * - 1,200 × 3 = 3,600 chunks. The embedder reads 3,600 × 400 = 1,440,000 tokens (overlaps are read twice).
 * - 1,536 dimensions × 4 bytes (float32) = 6,144 bytes per vector; 3,600 × 6,144 = 22,118,400 bytes ≈ 22 MB of raw
 *   vectors before any index structure or compression.
 */
export const CORPUS = {
  name: "Brightpost help centre",
  articles: 1_200,
  articleTokens: 1_100,
  chunkTokens: 400,
  overlapTokens: 50,
  stride: 350,
  chunksPerArticle: 3,
  chunks: 3_600,
  embedTokens: 1_440_000,
  dims: 1_536,
  bytesPerFloat: 4,
  bytesPerVector: 6_144,
  indexBytes: 22_118_400,
  indexMB: 22,
} as const;

/** The questions used across the track. */
export const QUESTIONS = {
  /** Needs two articles (password reset, two-factor recovery): why top-k and reranking matter. */
  main: "How do I reset my password if I lost my phone?",
  /** Vector search misses the exact code; BM25 finds it (hybrid search). */
  keyword: "What does error E1234 mean?",
  /** Already on advanced-rag; knowledge graphs and agentic RAG. */
  multiHop: "Which team owns the service that failed in last week's incident?",
} as const;

/** The two articles the main question needs. */
export const ARTICLES = {
  reset: "Reset a forgotten password",
  twoFactor: "Recover two-factor access",
  /** Only support staff may see it (access control). */
  runbook: "Runbook: unlock a locked account",
} as const;

/** How many chunks the basic pipeline puts in the prompt. */
export const TOP_K = 5;

/**
 * The prompt for the main question. Working: about 200 tokens of instructions + 5 chunks × 400 tokens + a 15-token
 * question = 2,215 tokens, written "≈ 2,200 tokens".
 */
export const PROMPT = {
  instructionTokens: 200,
  contextTokens: TOP_K * CORPUS.chunkTokens,
  questionTokens: 15,
  total: 200 + TOP_K * CORPUS.chunkTokens + 15,
  rounded: "≈ 2,200 tokens",
} as const;

/**
 * The ten nearest chunks for the main question, in vector-search order (cosine similarity). Three chunks are
 * relevant, from the two articles the answer needs: ranks 2, 4 and 7. Rank 1 is a near miss ("change" a password you
 * still know). Rank 7 sits outside the top 5, which sets up reranking.
 */
export const RESULTS: readonly { title: string; score: number; relevant: boolean }[] = [
  { title: "Change your password", score: 0.82, relevant: false },
  { title: "Reset a forgotten password", score: 0.8, relevant: true },
  { title: "Update your phone number", score: 0.78, relevant: false },
  { title: "Lost phone: use a backup code", score: 0.77, relevant: true },
  { title: "Set up two-factor sign-in", score: 0.74, relevant: false },
  { title: "Locked out after failed sign-ins", score: 0.71, relevant: false },
  { title: "No backup codes: verify your ID", score: 0.69, relevant: true },
  { title: "Delete your account", score: 0.66, relevant: false },
  { title: "Password rules", score: 0.64, relevant: false },
  { title: "Contact support", score: 0.61, relevant: false },
];

/** 1-based ranks of the relevant results. */
export const RELEVANT_RANKS = RESULTS.flatMap((r, i) => (r.relevant ? [i + 1] : []));

/** Recall@k: the share of all relevant chunks that appear in the top k. */
export function recallAt(k: number, ranks: readonly number[] = RELEVANT_RANKS, total = ranks.length) {
  return ranks.filter((r) => r <= k).length / total;
}

/** Reciprocal rank of the first relevant result (MRR over one question). */
export function reciprocalRank(ranks: readonly number[] = RELEVANT_RANKS) {
  return ranks.length ? 1 / Math.min(...ranks) : 0;
}

/** nDCG@k with binary relevance: DCG = Σ 1 / log2(rank + 1) over relevant ranks ≤ k, divided by the ideal DCG. */
export function ndcgAt(k: number, ranks: readonly number[] = RELEVANT_RANKS) {
  const gain = (r: number) => 1 / Math.log2(r + 1);
  const dcg = ranks.filter((r) => r <= k).reduce((s, r) => s + gain(r), 0);
  const ideal = Array.from({ length: Math.min(k, ranks.length) }, (_, i) => gain(i + 1)).reduce((s, g) => s + g, 0);
  return ideal ? dcg / ideal : 0;
}

/**
 * The metrics for RESULTS, rounded for drawing. Working (relevant at ranks 2, 4, 7 of 3 relevant):
 * - recall@5 = 2 / 3 = 0.67; recall@10 = 3 / 3 = 1.0
 * - MRR = 1 / 2 = 0.5
 * - DCG@10 = 1/log2(3) + 1/log2(5) + 1/log2(8) = 0.631 + 0.431 + 0.333 = 1.395; ideal = 1 + 0.631 + 0.5 = 2.131;
 *   nDCG@10 = 0.65
 */
export const METRICS = {
  recall5: Math.round(recallAt(5) * 100) / 100,
  recall10: Math.round(recallAt(10) * 100) / 100,
  mrr: Math.round(reciprocalRank() * 100) / 100,
  ndcg10: Math.round(ndcgAt(10) * 100) / 100,
} as const;

/**
 * Stage latencies for one question, in milliseconds. Illustrative, not measured: every figure that shows them says
 * so. Total to the first token = 20 + 15 + 2 + 400 = 437 ms; with a reranker over 100 candidates add 120 ms.
 */
export const LATENCY_MS = {
  embedQuery: 20,
  vectorSearch: 15,
  buildPrompt: 2,
  rerank100: 120,
  firstToken: 400,
  fullAnswer: 1_500,
} as const;

/** Advanced retrieval (Wave 2): fetch wide, rerank, keep TOP_K. RRF uses k = 60 as in Cormack et al. (2009). */
export const ADVANCED = {
  candidates: 100,
  keep: TOP_K,
  rrfK: 60,
} as const;

/**
 * Vector index arithmetic (Wave 2). Working:
 * - Product quantisation: 1,536 dimensions cut into 96 sub-vectors of 16 dimensions; each sub-vector is replaced by a
 *   one-byte code (256 centroids), so 96 bytes per vector instead of 6,144: 64 times smaller. 3,600 × 96 = 345,600
 *   bytes ≈ 0.35 MB.
 * - IVF: 60 cells (clusters), illustrative: √N is a common rule of thumb for large indexes (pgvector suggests
 *   rows / 1,000 below a million rows, which would be far fewer cells here). A query first compares against the 60
 *   centroids, then probes the nearest 4 cells: about 3,600 × 4 / 60 = 240 vectors instead of 3,600 (300
 *   comparisons with the centroids).
 * - HNSW: M = 16 links per point and efSearch = 64 are common defaults (illustrative).
 */
export const VECTOR_INDEX = {
  pqSubvectors: 96,
  pqSubDims: 16,
  pqBytesPerVector: 96,
  pqRatio: 64,
  pqIndexBytes: 345_600,
  ivfCells: 60,
  ivfProbe: 4,
  ivfCompared: 240,
  hnswM: 16,
  hnswEfSearch: 64,
} as const;

/**
 * Index freshness (Wave 2). Working: in a week 12 of the 1,200 articles change (1%); each has 3 chunks, so only
 * 12 × 3 = 36 chunks are re-embedded instead of 3,600. Content hashes find the 12.
 */
export const FRESHNESS = {
  changedArticles: 12,
  reembedChunks: 36,
} as const;

/** The multi-hop example (Wave 2): incident → service → team. */
export const MULTI_HOP = {
  incident: "INC-311",
  service: "checkout-api",
  team: "Payments team",
} as const;

// ── Builders ──────────────────────────────────────────────────────────────────────────────────────────────────────

interface ShapeOpts {
  step?: number;
}

/**
 * A document drawn as a strip of token cells from (x, y): `tokens` tokens, one cell per `perCell` tokens, the strip
 * `width` wide. Ids `<id>-0` …; cells are soft blue (text). `marks` (token offsets) get a short tick above the strip
 * with the offset written over it, for chunk boundaries.
 */
export function docStrip(
  id: string,
  x: number,
  y: number,
  opts: ShapeOpts & {
    tokens?: number;
    perCell?: number;
    width?: number;
    h?: number;
    tone?: LayoutTone;
    marks?: number[];
  } = {}
): LayoutShape[] {
  const tokens = opts.tokens ?? CORPUS.articleTokens;
  const perCell = opts.perCell ?? 50;
  const width = opts.width ?? 660;
  const h = opts.h ?? 22;
  const n = Math.ceil(tokens / perCell);
  const cell = width / n;
  const tone = opts.tone ?? RAG_TONE.text;
  // Whole-unit edges: each cell ends exactly where the next begins, so rounding never makes neighbours overlap.
  const edge = (i: number) => Math.round(x + i * cell);
  const cells: LayoutShape[] = Array.from({ length: n }, (_, i) => ({
    id: `${id}-${i}`,
    type: "cell",
    x: edge(i),
    y,
    w: edge(i + 1) - edge(i),
    h,
    tone,
    step: opts.step,
  }));
  const marks: LayoutShape[] = (opts.marks ?? []).flatMap((t) => {
    const mx = round(x + (t / tokens) * width);
    return [
      { id: `${id}-m${t}`, type: "path", x: 0, y: 0, points: [[mx, y - 8] as Point, [mx, y]], step: opts.step },
      { id: `${id}-t${t}`, type: "text", x: mx - 30, y: y - 28, w: 60, h: 18, label: fmt(t), step: opts.step },
    ];
  });
  return [...cells, ...marks];
}

/** Token offset → x on a docStrip drawn with the same options. */
export function stripX(tokens: number, x: number, opts: { tokens?: number; width?: number } = {}) {
  return round(x + (tokens / (opts.tokens ?? CORPUS.articleTokens)) * (opts.width ?? 660));
}

/**
 * A row of chunk boxes from (x, y), `w` wide each with `gap` between them, pastel blue by default. Ids
 * `<id>-<i>`. Each chunk may override its label, sub, tone, fill and highlight.
 */
export function chunkRow(
  id: string,
  x: number,
  y: number,
  chunks: { label: string; sub?: string; tone?: LayoutTone; fill?: LayoutShape["fill"]; highlight?: boolean }[],
  opts: ShapeOpts & { w?: number; h?: number; gap?: number } = {}
): LayoutShape[] {
  const w = opts.w ?? 120;
  const gap = opts.gap ?? 12;
  return chunks.map((c, i) => ({
    id: `${id}-${i}`,
    type: "box",
    x: x + i * (w + gap),
    y,
    w,
    h: opts.h ?? 44,
    label: c.label,
    sub: c.sub,
    tone: c.tone ?? RAG_TONE.text,
    fill: c.fill ?? "pastel",
    highlight: c.highlight,
    step: opts.step,
  }));
}

/** A point in an embedding-space scatter: `x` and `y` are 0..1 inside the plot. */
export interface ScatterPoint {
  id: string;
  x: number;
  y: number;
  label?: string;
  /** "chunk" (pink), "relevant" (a chunk the answer needs: pink, solid), "query" (orange), "other" (neutral). */
  kind?: "chunk" | "relevant" | "query" | "other";
  step?: number;
}

/**
 * A 2-D embedding space: a frame `w` × `h` at (x, y), labelled points (circles) and an optional dashed ring of radius
 * `ring.r` (viewBox units) around the point `ring.around`, the top-k neighbourhood. Labels sit right of each point
 * (left when `labelLeft`). Ids: `<id>-frame`, `<id>-<point id>`, `<id>-<point id>-label`, `<id>-ring`.
 */
export function scatter(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  points: ScatterPoint[],
  opts: ShapeOpts & {
    ring?: { around: string; r: number; step?: number; label?: string };
    labelLeft?: string[];
    dot?: number;
  } = {}
): LayoutShape[] {
  const dot = opts.dot ?? 14;
  const at = (p: ScatterPoint): Point => [round(x + p.x * w), round(y + p.y * h)];
  const toneOf = (k: ScatterPoint["kind"]): LayoutTone =>
    k === "query" ? RAG_TONE.query : k === "other" ? RAG_TONE.infra : RAG_TONE.embedding;
  const out: LayoutShape[] = [
    {
      id: `${id}-frame`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
        [x, y],
      ],
      dashed: true,
      step: opts.step,
    },
  ];
  for (const p of points) {
    const [px, py] = at(p);
    const step = p.step ?? opts.step;
    out.push({
      id: `${id}-${p.id}`,
      type: "circle",
      x: px,
      y: py,
      w: p.kind === "query" ? dot + 4 : dot,
      tone: toneOf(p.kind),
      fill: p.kind === "relevant" || p.kind === "query" ? "pastel" : "soft",
      step,
    });
    if (p.label) {
      const left = opts.labelLeft?.includes(p.id);
      const half = (p.kind === "query" ? dot + 4 : dot) / 2;
      const lw = p.label.length * 7 + 6;
      out.push({
        id: `${id}-${p.id}-label`,
        type: "text",
        x: round(left ? px - half - 2 - lw : px + half + 2),
        y: py - 9,
        w: round(lw),
        h: 18,
        label: p.label,
        tone: p.kind === "query" ? RAG_TONE.query : RAG_TONE.infra,
        step,
      });
    }
  }
  if (opts.ring) {
    const centre = points.find((p) => p.id === opts.ring!.around);
    if (centre) {
      const [cx, cy] = at(centre);
      const r = opts.ring.r;
      out.push({
        id: `${id}-ring`,
        type: "path",
        x: 0,
        y: 0,
        points: Array.from({ length: 49 }, (_, i): Point => {
          const a = (2 * Math.PI * i) / 48;
          return [round(cx + r * Math.cos(a)), round(cy + r * Math.sin(a))];
        }),
        smooth: true,
        dashed: true,
        tone: RAG_TONE.query,
        step: opts.ring.step ?? opts.step,
      });
    }
  }
  return out;
}

/**
 * A ranked result list from (x, y): per row a rank cell, a title box and a score cell. Relevant rows get a pastel
 * title box (blue, text) and a "relevant" sub line; the rest are paper. With `cut` a dashed line is drawn under row
 * `cut` (the top-k boundary) with `cutLabel` to its right. Ids `<id>-r<rank>`, `<id>-t<rank>`, `<id>-s<rank>`.
 */
export function rankList(
  id: string,
  x: number,
  y: number,
  items: readonly { title: string; score?: number; relevant?: boolean; scoreLabel?: string }[],
  opts: ShapeOpts & {
    w?: number;
    rowH?: number;
    gap?: number;
    cut?: number;
    cutLabel?: string;
    scoreW?: number;
    digits?: number;
    /** Tone of the score cells (default lime, ranking); neutral keeps a figure within four tones. */
    scoreTone?: LayoutTone;
    stepOf?: (rank: number) => number | undefined;
  } = {}
): LayoutShape[] {
  const w = opts.w ?? 240;
  const rowH = opts.rowH ?? 30;
  const gap = opts.gap ?? 4;
  const scoreW = opts.scoreW ?? 48;
  const rankW = 28;
  const out: LayoutShape[] = [];
  items.forEach((item, i) => {
    const rank = i + 1;
    const ry = y + i * (rowH + gap);
    const step = opts.stepOf?.(rank) ?? opts.step;
    out.push(
      {
        id: `${id}-r${rank}`,
        type: "cell",
        x,
        y: ry,
        w: rankW,
        h: rowH,
        label: String(rank),
        tone: RAG_TONE.infra,
        step,
      },
      {
        id: `${id}-t${rank}`,
        type: "box",
        x: x + rankW + 4,
        y: ry,
        w,
        h: rowH,
        label: item.title,
        tone: RAG_TONE.text,
        fill: item.relevant ? "pastel" : "paper",
        step,
      }
    );
    if (item.score !== undefined || item.scoreLabel) {
      out.push({
        id: `${id}-s${rank}`,
        type: "cell",
        x: x + rankW + 4 + w + 4,
        y: ry,
        w: scoreW,
        h: rowH,
        label: item.scoreLabel ?? item.score!.toFixed(opts.digits ?? 2),
        tone: opts.scoreTone ?? RAG_TONE.rank,
        step,
      });
    }
  });
  if (opts.cut) {
    const cy = y + opts.cut * (rowH + gap) - gap / 2;
    const right = x + rankW + 4 + w + 4 + scoreW;
    out.push({
      id: `${id}-cut`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x - 6, cy],
        [right + 6, cy],
      ],
      dashed: true,
      tone: RAG_TONE.query,
      step: opts.step,
    });
    if (opts.cutLabel) {
      out.push({
        id: `${id}-cut-label`,
        type: "text",
        x: right + 10,
        y: cy - 10,
        w: opts.cutLabel.length * 6.6 + 4,
        h: 20,
        label: opts.cutLabel,
        tone: RAG_TONE.query,
        step: opts.step,
      });
    }
  }
  return out;
}

/** Width of a rankList row with the same options (rank cell + title + score). */
export const rankListWidth = (opts: { w?: number; scoreW?: number } = {}) =>
  28 + 4 + (opts.w ?? 240) + 4 + (opts.scoreW ?? 48);

/**
 * A funnel of stages centred on `cx`, top at `y`: each stage a box whose width is proportional to its candidate
 * count (linear between `minW` for the smallest count and `maxW` for the largest), so the narrowing is visible; the
 * count is the sub line. Ids `<id>-<i>`; arrows `<id>-a<i>` join consecutive stages.
 */
export function funnel(
  id: string,
  cx: number,
  y: number,
  stages: { label: string; count: number; tone?: LayoutTone; sub?: string; step?: number }[],
  opts: ShapeOpts & { maxW?: number; minW?: number; h?: number; gap?: number } = {}
): LayoutShape[] {
  const maxW = opts.maxW ?? 420;
  const minW = opts.minW ?? 140;
  const h = opts.h ?? 44;
  const gap = opts.gap ?? 26;
  const counts = stages.map((s) => s.count);
  const hi = Math.max(...counts);
  const lo = Math.min(...counts);
  const widthOf = (c: number) => (hi === lo ? maxW : round(minW + ((c - lo) / (hi - lo)) * (maxW - minW)));
  const boxes: LayoutShape[] = stages.map((s, i) => {
    const w = widthOf(s.count);
    return {
      id: `${id}-${i}`,
      type: "box",
      x: round(cx - w / 2),
      y: y + i * (h + gap),
      w,
      h,
      label: s.label,
      sub: s.sub ?? `${fmt(s.count)} candidates`,
      tone: s.tone ?? RAG_TONE.rank,
      fill: "pastel",
      step: s.step ?? opts.step,
    };
  });
  const arrows: LayoutShape[] = boxes.slice(1).map((b, i) => ({
    id: `${id}-a${i + 1}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: boxes[i].id,
    to: b.id,
    step: b.step,
  }));
  return [...boxes, ...arrows];
}

/** The six stages of the basic pipeline, in order, as drawn by stageStrip(). */
export const STAGES = ["Parse", "Chunk", "Index", "Retrieve", "Prompt", "Generate"] as const;
export type Stage = (typeof STAGES)[number];

/** The legend tone of each pipeline stage, for figures that colour the locator. */
const STAGE_TONE: Record<Stage, LayoutTone> = {
  Parse: RAG_TONE.text,
  Chunk: RAG_TONE.text,
  Index: RAG_TONE.store,
  Retrieve: RAG_TONE.store,
  Prompt: RAG_TONE.infra,
  Generate: RAG_TONE.answer,
};

/**
 * The compact six-stage pipeline strip, used as a "you are here" locator: boxes `w` wide with arrows between them
 * from (x, y). Neutral soft by default; the stages in `current` are pastel in their legend tone. Ids `<id>-<stage>`
 * (lower case) and `<id>-a<i>`; returns the shapes and each stage's centre x.
 */
export function stageStrip(
  id: string,
  x: number,
  y: number,
  opts: ShapeOpts & { w?: number; h?: number; gap?: number; current?: Stage[]; coloured?: boolean } = {}
): { shapes: LayoutShape[]; centres: Record<Stage, number> } {
  const w = opts.w ?? 100;
  const h = opts.h ?? 34;
  const gap = opts.gap ?? 22;
  const current = new Set(opts.current ?? []);
  const centres = {} as Record<Stage, number>;
  const boxes: LayoutShape[] = STAGES.map((s, i) => {
    const bx = x + i * (w + gap);
    centres[s] = bx + w / 2;
    const on = current.has(s) || opts.coloured;
    return {
      id: `${id}-${s.toLowerCase()}`,
      type: "box",
      x: bx,
      y,
      w,
      h,
      label: s,
      tone: on ? STAGE_TONE[s] : RAG_TONE.infra,
      fill: on ? "pastel" : "soft",
      highlight: current.has(s) && !opts.coloured ? true : undefined,
      step: opts.step,
    };
  });
  const arrows: LayoutShape[] = boxes.slice(1).map((b, i) => ({
    id: `${id}-a${i + 1}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: boxes[i].id,
    to: b.id,
    step: opts.step,
  }));
  return { shapes: [...boxes, ...arrows], centres };
}

/** Width of a stageStrip drawn with the same options. */
export const stageStripWidth = (opts: { w?: number; gap?: number } = {}) =>
  STAGES.length * (opts.w ?? 100) + (STAGES.length - 1) * (opts.gap ?? 22);

// ── Small helpers ───────────────────────────────────────────────────────────────────────────────────────────────

const round = (v: number) => Math.round(v * 10) / 10;

/** 1200 → "1,200". */
export function fmt(n: number) {
  return n.toLocaleString("en-GB");
}
