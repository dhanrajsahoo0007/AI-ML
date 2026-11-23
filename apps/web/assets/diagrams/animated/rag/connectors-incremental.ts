import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { CORPUS, FRESHNESS, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// Full sync against incremental sync with a cursor, for the help-centre connector over one week.
// Working: in a week FRESHNESS.changedArticles = 12 of the 1,200 articles change (1%).
// - Full sync every night re-reads every article: 7 × 1,200 = 8,400 article fetches a week.
// - Incremental sync every night asks "what changed since the cursor?", fetches those, and moves the cursor to the
//   newest change it saw: 12 fetches in the whole week. The seven ticks on the timeline are the nightly cursor
//   positions; the 12 dots are the changes, spread across the nights.
// - The gap: an article deleted in the source has no row left to report as changed, so a "changed since" query never
//   returns it, and its 3 chunks (CORPUS.chunksPerArticle) stay in the index. Fixes: delete events (tombstones) from
//   the source, or a periodic listing of all 1,200 ids (ids only, no content) diffed against the index.
//
// NIGHTS is local and illustrative (a nightly schedule). Tones (two plus neutral): articles blue, the missed delete
// red.

/** Illustrative: one sync run per night. */
const NIGHTS = 7;

const LEFT = 20;
const LABEL_W = 150;
const X = 190;
const SPAN = 480;
const RIGHT = X + SPAN + 16;
const CELLS = 24; // 1,200 articles drawn as 24 cells of 50

const fullCells: LayoutShape[] = Array.from({ length: CELLS }, (_, i) => ({
  id: `full-${i}`,
  type: "cell",
  x: X + i * (SPAN / CELLS),
  y: 50,
  w: SPAN / CELLS,
  h: 24,
  tone: RAG_TONE.text,
  fill: "pastel",
}));

const TL_Y = 168;
const tickX = (n: number) => X + (n * SPAN) / NIGHTS;
const ticks: LayoutShape[] = Array.from({ length: NIGHTS + 1 }, (_, n) => ({
  id: `tick-${n}`,
  type: "path",
  x: 0,
  y: 0,
  points: [
    [tickX(n), TL_Y - 12],
    [tickX(n), TL_Y + 12],
  ],
  dashed: true,
  step: 2,
}));

// 12 changes spread over the 7 nights (positions within the week, 0..1, illustrative).
const CHANGE_AT = [0.05, 0.1, 0.2, 0.33, 0.37, 0.48, 0.53, 0.62, 0.68, 0.78, 0.92, 0.96];
const changes: LayoutShape[] = CHANGE_AT.slice(0, FRESHNESS.changedArticles).map((t, i) => ({
  id: `change-${i}`,
  type: "circle",
  x: Math.round(X + t * SPAN),
  y: TL_Y,
  w: 12,
  tone: RAG_TONE.text,
  fill: "pastel",
  step: 2,
}));

const shapes: LayoutShape[] = [
  // Step 1: full sync.
  {
    id: "full-label",
    type: "box",
    x: LEFT,
    y: 40,
    w: LABEL_W,
    h: 44,
    label: "Full sync",
    sub: "every night",
  },
  ...fullCells,
  {
    id: "full-count",
    type: "text",
    x: RIGHT,
    y: 52,
    w: 160,
    h: 20,
    label: `${fmt(CORPUS.articles)} fetched a night`,
  },
  {
    id: "full-week",
    type: "text",
    x: X,
    y: 84,
    w: SPAN,
    h: 20,
    label: `${NIGHTS} nights × ${fmt(CORPUS.articles)} = ${fmt(NIGHTS * CORPUS.articles)} fetches a week`,
    tone: RAG_TONE.infra,
  },

  // Step 2: incremental sync with a cursor.
  {
    id: "inc-label",
    type: "box",
    x: LEFT,
    y: TL_Y - 22,
    w: LABEL_W,
    h: 44,
    label: "Incremental",
    sub: "from a cursor",
    step: 2,
  },
  {
    id: "timeline",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [X, TL_Y],
      [X + SPAN, TL_Y],
    ],
    step: 2,
  },
  ...ticks,
  ...changes,
  {
    id: "cursor-label",
    type: "text",
    x: X - 10,
    y: TL_Y - 40,
    w: SPAN + 20,
    h: 20,
    label: "each dashed tick: the cursor saved by one night's run",
    tone: RAG_TONE.infra,
    step: 2,
  },
  {
    id: "inc-count",
    type: "text",
    x: RIGHT,
    y: TL_Y - 10,
    w: 160,
    h: 20,
    label: `${FRESHNESS.changedArticles} fetched a week`,
    step: 2,
  },
  {
    id: "inc-week",
    type: "text",
    x: X,
    y: TL_Y + 20,
    w: SPAN,
    h: 20,
    label: `${FRESHNESS.changedArticles} of ${fmt(CORPUS.articles)} articles changed this week (1%): only they are fetched`,
    tone: RAG_TONE.infra,
    step: 2,
  },

  // Step 3: the delete that a cursor never sees.
  {
    id: "del-label",
    type: "box",
    x: LEFT,
    y: 252,
    w: LABEL_W,
    h: 44,
    label: "Deleted article",
    sub: "no row left to report",
    tone: RAG_TONE.failure,
    fill: "pastel",
    step: 3,
  },
  {
    id: "del-why",
    type: "text",
    x: X,
    y: 252,
    w: SPAN + 160,
    h: 20,
    label: `"Changed since the cursor" never returns it, so its ${CORPUS.chunksPerArticle} chunks stay in the index`,
    tone: RAG_TONE.failure,
    step: 3,
  },
  {
    id: "del-fix",
    type: "text",
    x: X,
    y: 276,
    w: SPAN + 160,
    h: 20,
    label: `Fix: delete events (tombstones), or list all ${fmt(CORPUS.articles)} ids now and then and diff`,
    tone: RAG_TONE.infra,
    step: 3,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Full sync against incremental sync with a cursor",
  width: 860,
  height: 312,
  steps: [
    { title: `Full sync: every article, every night` },
    { title: `Incremental: only what changed since the cursor` },
    { title: "The gap: a deleted article never shows up as changed" },
  ],
  shapes,
};

export default spec;
