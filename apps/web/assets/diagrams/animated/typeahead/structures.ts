import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Three structures that answer "top five completions for a prefix" (typeahead, Deep dive 1), compared on the same
// 10,000,000 queries. One frame, no steps; the chosen structure's header carries the highlight ring.
// Working (round numbers chosen to size the system, computed below):
// - Trie with the top 5 at every node: a radix trie with n keys has at most 2n nodes = 20,000,000; 64 bytes a node
//   (5 query ids × 4 B = 20 B, edge label and child offsets 24 B, flags and padding) = 1,280 MB; + query text
//   10 M × 20 B = 200 MB; + scores 10 M × 4 B = 40 MB; total 1,520 MB ≈ 1.5 GB.
// - Finite state transducer: Lucene's published 69 MB for 9.8 M terms is about 7 B a term; a query is about twice as
//   long as a term, so about 14 B × 10 M = 140 MB, plus weights: ≈ 0.15 GB (an estimate, not a measurement).
// - Prefix inverted index: 3 words a query × 6 prefixes a word = 18 postings × 10 M = 180 M × 4 B = 720 MB; + query
//   text 200 MB; + an 8-byte Bloom filter per query 80 MB; total 1,000 MB ≈ 1.0 GB.
// Bars: 100 px per GB, so 150, 15 and 100 px.
// Layout (880 × 440): a row-label column (x 20, w 135), three columns 225 wide from x 165, 235 apart; rows from y 85,
// 60 apart; a footer line at y 400.
// Colours (PATTERN_TONE): the trie green (the pattern: our choice), the transducer violet (a compact store), the
// inverted index blue (a general search structure), row labels neutral. Three tones plus neutral.
// Fact check (2026-11-17, elastic.co/blog/you-complete-me, 2013; blog.mikemccandless.com, 2010): Elasticsearch's
// completion suggester builds an FST per segment; Lucene's FST held 9.8 M terms in 69 MB.

const COL_X = [165, 400, 635];
const COL_W = 225;
const ROW_Y = [85, 145, 205, 265, 325];
const ROW_H = 48;
const PX_PER_GB = 100;

const columns = [
  {
    id: "trie",
    title: "Trie, top 5 per node",
    sub: "our choice",
    tone: PATTERN_TONE.pattern,
    shape: "a node per prefix;\nits top 5 stored on it",
    gb: 1.52,
    mem: "1.5 GB",
    memWhy: "20 M nodes × 64 B + text",
    lookup: "3 steps down, then\nread one stored list",
    matches: "the start of the query",
    update: "rebuild the file daily;\na live count rewrites lists",
  },
  {
    id: "fst",
    title: "Finite state transducer",
    sub: "Lucene, Elasticsearch",
    tone: PATTERN_TONE.store,
    shape: "shared prefixes and\nsuffixes; weights on arcs",
    gb: 0.15,
    mem: "0.15 GB",
    memWhy: "≈ 14 B a query",
    lookup: "3 arcs, then a best-first\nsearch for the top 5",
    matches: "the start of the query",
    update: "immutable: rebuild\nfrom sorted input",
  },
  {
    id: "inv",
    title: "Prefix inverted index",
    sub: "search-engine style",
    tone: PATTERN_TONE.data,
    shape: "prefix → query ids,\nsorted by score",
    gb: 1.0,
    mem: "1.0 GB",
    memWhy: "180 M postings × 4 B + text",
    lookup: "read the list for “ele”,\nkeep the first 5",
    matches: "the start of any word",
    update: "append to lists;\nre-sort hot lists",
  },
];

const rows = ["Shape", "Memory, 10 M queries", "Lookup for “ele”", "Matches", "Rebuild or update"];

const shapes: LayoutShape[] = [];

rows.forEach((label, r) => {
  shapes.push({
    id: `row-${r}`,
    type: "text",
    x: 20,
    y: ROW_Y[r],
    w: 135,
    h: ROW_H,
    label: label === "Memory, 10 M queries" ? "Memory,\n10 M queries" : label,
    tone: PATTERN_TONE.infra,
  });
});

columns.forEach((c, i) => {
  const x = COL_X[i];
  shapes.push({
    id: c.id,
    type: "box",
    x,
    y: 20,
    w: COL_W,
    h: 50,
    label: c.title,
    sub: c.sub,
    tone: c.tone,
    fill: "pastel",
    highlight: i === 0 || undefined,
  });
  shapes.push({ id: `${c.id}-shape`, type: "text", x, y: ROW_Y[0], w: COL_W, h: ROW_H, label: c.shape });
  const barW = Math.round(c.gb * PX_PER_GB);
  shapes.push({
    id: `${c.id}-bar`,
    type: "cell",
    x: x + 10,
    y: ROW_Y[1] + 4,
    w: barW,
    h: 20,
    tone: c.tone,
    fill: "pastel",
  });
  shapes.push({
    id: `${c.id}-mem`,
    type: "text",
    x: x + 16 + barW,
    y: ROW_Y[1] + 4,
    w: 64,
    h: 20,
    label: c.mem,
  });
  shapes.push({
    id: `${c.id}-memwhy`,
    type: "text",
    x,
    y: ROW_Y[1] + 28,
    w: COL_W,
    h: 18,
    label: c.memWhy,
    tone: PATTERN_TONE.infra,
  });
  shapes.push({ id: `${c.id}-lookup`, type: "text", x, y: ROW_Y[2], w: COL_W, h: ROW_H, label: c.lookup });
  shapes.push({ id: `${c.id}-matches`, type: "text", x, y: ROW_Y[3], w: COL_W, h: ROW_H, label: c.matches });
  shapes.push({ id: `${c.id}-update`, type: "text", x, y: ROW_Y[4], w: COL_W, h: ROW_H, label: c.update });
});

shapes.push({
  id: "footer",
  type: "text",
  x: 20,
  y: 392,
  w: 840,
  h: 36,
  label: "All three fit in one 64 GB server: lookup cost decides (D4), not memory (D8).",
  tone: PATTERN_TONE.pattern,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three prefix structures compared on 10 million queries",
  width: 880,
  height: 440,
  shapes,
};

export default spec;
