import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ARTICLES, CORPUS, FRESHNESS, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// Incremental re-indexing with content hashes. Step 1: every article has the hash stored when it was last indexed and
// the hash of today's text; five sample rows of the 1,200 (CORPUS.articles) are drawn. Step 2: where the two hashes
// differ the article changed; in the sample only "Reset a forgotten password" did, and across the corpus 12 of
// 1,200 did this week (FRESHNESS). Step 3: only their chunks are re-embedded: 12 × 3 = 36 chunks (FRESHNESS
// .reembedChunks) instead of all 3,600 (CORPUS.chunks), drawn as two bars on one scale (1% of the width).
//
// Hash values are made up (four hex digits and an ellipsis). The sample titles other than ARTICLES.reset and
// ARTICLES.twoFactor are illustrative Brightpost articles.
//
// Tones (two plus neutral): articles blue (changed ones pastel), re-embedding pink (the highlight is the 36-chunk
// bar); hashes and the "no" cells neutral. Columns: title x 40 (w 300) | stored hash x 360 | today's hash x 490 |
// re-embed x 620 (cells 110 wide). Rows from y 60, 38 apart; bars at y 316 and 362, 600 wide = 3,600 chunks.

const SAMPLE: { title: string; stored: string; today: string }[] = [
  { title: ARTICLES.twoFactor, stored: "1a8d…", today: "1a8d…" },
  { title: ARTICLES.reset, stored: "9f2c…", today: "4b7e…" },
  { title: "Track a parcel", stored: "c03b…", today: "c03b…" },
  { title: "Return an item", stored: "77e1…", today: "77e1…" },
  { title: "Change your delivery address", stored: "e5a0…", today: "e5a0…" },
];

const COL = { title: 40, stored: 360, today: 490, embed: 620 } as const;
const ROW0 = 60;
const ROW_H = 30;
const ROW_GAP = 8;
const rowY = (i: number) => ROW0 + i * (ROW_H + ROW_GAP);

const header = (id: string, x: number, w: number, label: string, step?: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y: 30,
  w,
  h: 20,
  label,
  tone: RAG_TONE.infra,
  step,
});

const rows: LayoutShape[] = SAMPLE.flatMap((r, i): LayoutShape[] => {
  const changed = r.stored !== r.today;
  const y = rowY(i);
  return [
    {
      id: `t${i}`,
      type: "box",
      x: COL.title,
      y,
      w: 300,
      h: ROW_H,
      label: r.title,
      tone: RAG_TONE.text,
      fill: changed ? "pastel" : "paper",
    },
    { id: `s${i}`, type: "cell", x: COL.stored, y, w: 110, h: ROW_H, label: r.stored, tone: RAG_TONE.infra },
    { id: `n${i}`, type: "cell", x: COL.today, y, w: 110, h: ROW_H, label: r.today, tone: RAG_TONE.infra },
    {
      id: `e${i}`,
      type: "cell",
      x: COL.embed,
      y,
      w: 110,
      h: ROW_H,
      label: changed ? `yes, ${CORPUS.chunksPerArticle} chunks` : "no",
      tone: changed ? RAG_TONE.embedding : RAG_TONE.infra,
      fill: changed ? "pastel" : "soft",
      step: 2,
    },
  ];
});

const BAR = { x: 40, w: 600, h: 30, full: 316, inc: 362 } as const;
const INC_LABEL = `Hash changed: ${FRESHNESS.changedArticles} × ${CORPUS.chunksPerArticle} = ${FRESHNESS.reembedChunks} chunks (${Math.round((100 * FRESHNESS.reembedChunks) / CORPUS.chunks)}%)`;
const incW = Math.max(4, Math.round((BAR.w * FRESHNESS.reembedChunks) / CORPUS.chunks));

const bars: LayoutShape[] = [
  {
    id: "bars-title",
    type: "text",
    x: BAR.x,
    y: 288,
    w: 600,
    h: 20,
    label: "Chunks sent to the embedding model, on one scale",
    tone: RAG_TONE.infra,
    step: 3,
  },
  {
    id: "full",
    type: "cell",
    x: BAR.x,
    y: BAR.full,
    w: BAR.w,
    h: BAR.h,
    label: `Re-embed everything: ${fmt(CORPUS.chunks)} chunks`,
    tone: RAG_TONE.embedding,
    fill: "soft",
    step: 3,
  },
  {
    id: "inc",
    type: "cell",
    x: BAR.x,
    y: BAR.inc,
    w: incW,
    h: BAR.h,
    tone: RAG_TONE.embedding,
    highlight: true,
    step: 3,
  },
  {
    id: "inc-label",
    type: "text",
    x: BAR.x + incW + 10,
    y: BAR.inc + 5,
    w: Math.round(INC_LABEL.length * 6.8),
    h: 20,
    label: INC_LABEL,
    tone: RAG_TONE.embedding,
    step: 3,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Incremental re-indexing: re-embed only the articles whose hash changed",
  width: 780,
  height: 410,
  steps: [
    { title: "Every article keeps the hash of the text it was indexed from" },
    { title: `Different hashes mark the ${FRESHNESS.changedArticles} changed articles` },
    { title: `Only their ${FRESHNESS.reembedChunks} chunks are re-embedded` },
  ],
  shapes: [
    header("h-title", COL.title, 300, `Article (5 of ${fmt(CORPUS.articles)})`),
    header("h-stored", COL.stored, 110, "Stored hash"),
    header("h-today", COL.today, 110, "Today's hash"),
    header("h-embed", COL.embed, 110, "Re-embed?", 2),
    ...rows,
    {
      id: "more",
      type: "text",
      x: COL.title,
      y: rowY(SAMPLE.length) - 2,
      w: 690,
      h: 20,
      label: `… ${fmt(CORPUS.articles - SAMPLE.length)} more articles: ${FRESHNESS.changedArticles} of ${fmt(CORPUS.articles)} changed this week`,
      tone: RAG_TONE.infra,
      step: 2,
    },
    ...bars,
  ],
};

export default spec;
