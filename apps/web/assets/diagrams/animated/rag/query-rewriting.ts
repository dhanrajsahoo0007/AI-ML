import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE, RESULTS, TOP_K, rankList, rankListWidth } from "@/components/diagrams/presets/rag";

// Core concepts 3 and 4: query rewriting and HyDE. Brightpost's main question ("How do I reset my password if I lost
// my phone?") becomes three search queries (multi-query) and one hypothetical answer (HyDE, Gao et al. 2022: an LLM
// writes a plausible answer, that text is embedded and used to search, and the real chunks near it are returned).
// Each of the four runs its own search; the four result lists are merged with reciprocal rank fusion.
//
// The merged top 5 is illustrative: which query found which chunk ("found by") is made up to show the mechanism, but
// the titles are RESULTS from presets/rag.ts. The point: the three relevant chunks are each found by more than one
// query, so all three reach the top 5, where the question alone placed 2 of 3 (relevant at ranks 2, 4 and 7).
//
// Layout (860 wide): the question on top; the four rewrites in a row of 200-wide boxes (x 18 | 230 | 442 | 654);
// one merge box; the merged list centred under it, its header on the left and the result note on the right.
// Steps: 1 three rewrites · 2 the HyDE answer · 3 the merged list.
//
// Tones (three plus neutral): the question and its rewrites orange, chunk titles blue, the merge and the found-by
// cells lime.

const ROW_Y = 140;
const BOX = { w: 200, h: 84, gap: 12, x0: 18 } as const;
const boxX = (i: number) => BOX.x0 + i * (BOX.w + BOX.gap);

/** Each rewrite: label (the query text), sub (its tag), step. */
const REWRITES = [
  { id: "q1", label: "reset forgotten password", sub: "query Q1", step: 1 },
  { id: "q2", label: "lost phone two-factor", sub: "query Q2", step: 1 },
  { id: "q3", label: "sign in without my phone", sub: "query Q3", step: 1 },
  {
    id: "hyde",
    label: "Sign in with a backup code\nand reset your password.\nNo codes? Verify your ID.",
    sub: "H: HyDE answer",
    step: 2,
  },
] as const;

const byTitle = (t: string) => RESULTS.find((r) => r.title === t)!;
/** The merged top 5 and which rewrites found each chunk (illustrative). */
const MERGED = [
  { ...byTitle("Lost phone: use a backup code"), scoreLabel: "Q2 Q3 H" },
  { ...byTitle("Reset a forgotten password"), scoreLabel: "Q1 H" },
  { ...byTitle("No backup codes: verify your ID"), scoreLabel: "Q2 H" },
  { ...byTitle("Change your password"), scoreLabel: "Q1" },
  { ...byTitle("Set up two-factor sign-in"), scoreLabel: "Q2" },
].map(({ title, relevant, scoreLabel }) => ({ title, relevant, scoreLabel }));
const relevantInTop = MERGED.filter((m) => m.relevant).length;
const relevantAll = RESULTS.filter((r) => r.relevant).length;
const relevantBefore = RESULTS.slice(0, TOP_K).filter((r) => r.relevant).length;

const LIST = { w: 240, scoreW: 80, y: 372 } as const;
const listW = rankListWidth({ w: LIST.w, scoreW: LIST.scoreW });
const listX = Math.round(430 - listW / 2);

const rewrites: LayoutShape[] = REWRITES.flatMap((r, i) => [
  {
    id: r.id,
    type: "box" as const,
    x: boxX(i),
    y: ROW_Y,
    w: BOX.w,
    h: BOX.h,
    label: r.label,
    sub: r.sub,
    tone: RAG_TONE.query,
    fill: "pastel" as const,
    step: r.step,
  },
  { id: `to-${r.id}`, type: "arrow" as const, x: 0, y: 0, from: "question", to: r.id, step: r.step },
  { id: `${r.id}-merge`, type: "arrow" as const, x: 0, y: 0, from: r.id, to: "merge", step: 3 },
]);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Query rewriting: one question becomes four searches",
  width: 860,
  height: 560,
  steps: [
    { title: "An LLM rewrites the question as three search queries" },
    { title: "HyDE: it also writes a guessed answer to search with" },
    { title: "The four result lists are merged into one top 5" },
  ],
  shapes: [
    {
      id: "question",
      type: "box",
      x: 280,
      y: 20,
      w: 300,
      h: 52,
      label: "How do I reset my password\nif I lost my phone?",
      tone: RAG_TONE.query,
      fill: "pastel",
    },
    {
      id: "llm-note",
      type: "text",
      x: 600,
      y: 28,
      w: 240,
      h: 36,
      label: "An LLM writes the rewrites;\neach one runs its own search",
      tone: RAG_TONE.infra,
    },
    ...rewrites,
    {
      id: "merge",
      type: "box",
      x: 280,
      y: 280,
      w: 300,
      h: 44,
      label: "Merge the 4 result lists (RRF)",
      tone: RAG_TONE.rank,
      fill: "pastel",
      step: 3,
    },
    { id: "merge-list", type: "arrow", x: 0, y: 0, from: "merge", to: "m-t1", step: 3 },
    {
      id: "list-title",
      type: "text",
      x: 20,
      y: LIST.y + 4,
      w: listX - 40,
      h: 40,
      label: `Merged top ${TOP_K}\n(illustrative)`,
      tone: RAG_TONE.infra,
      step: 3,
    },
    {
      id: "found-title",
      type: "text",
      x: listX + listW - LIST.scoreW,
      y: LIST.y - 22,
      w: LIST.scoreW,
      h: 18,
      label: "found by",
      tone: RAG_TONE.infra,
      step: 3,
    },
    ...rankList("m", listX, LIST.y, MERGED, { w: LIST.w, scoreW: LIST.scoreW, rowH: 30, gap: 4, step: 3 }),
    {
      id: "result",
      type: "text",
      x: listX + listW + 20,
      y: LIST.y + 40,
      w: 860 - (listX + listW + 20) - 10,
      h: 56,
      label: `${relevantInTop} of ${relevantAll} relevant chunks\nreach the top ${TOP_K}\n(the question alone: ${relevantBefore} of ${relevantAll})`,
      tone: RAG_TONE.infra,
      step: 3,
    },
  ],
};

export default spec;
