import type { DiagramSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// "Data versioning and lineage": Brightpost's vector index as a series of immutable snapshots. Each snapshot records
// the embedding model and the corpus version it was built from; questions reach whichever one the live alias names.
//
// Steps: 1 snapshot 1 (Sep 1: embed-v2, corpus c41) and snapshot 2 (Oct 6: embed-v2, corpus c42, in which
// FRESHNESS.changedArticles = 12 articles changed, so 36 chunks were re-embedded) exist; the alias points at 2 ·
// 2 a new embedding model builds snapshot 3 from the same corpus c42 (all CORPUS.chunks = 3,600 chunks re-embedded)
// and the alias moves to it · 3 the golden-set check finds mean recall@5 down from 0.84 to 0.71 · 4 rollback: the
// alias points at snapshot 2 again; snapshot 3 is kept for debugging.
//
// Constants that are not in presets/rag.ts (illustrative): the dates, the names embed-v2, embed-v3, c41 and c42, and
// the golden-set mean recall@5 of 0.84 before and 0.71 after (a mean over many questions, so not METRICS.recall5,
// which is the single main question's 0.67).
//
// Grid: snapshots at x 110 | 325 | 540 on the top row (y 90, cards 190 wide so the date fits in the label); the
// questions, the alias and the failed check on the bottom row (y 255). The alias sits between snapshots 2 and 3 so
// both pointers are mirror-image diagonals. Colour (two tones plus neutral): snapshots violet (stores), the failed
// check red; the questions and the alias neutral, the alias is the accent.

const RECALL = { before: 0.84, after: 0.71 } as const;

const X = [110, 325, 540, 755] as const;
const ROW = { snap: 90, live: 255 } as const;
const W = 190;
const ALIAS_X = (X[1] + X[2]) / 2;

const spec: DiagramSpec = {
  title: "Index snapshots: each records its embedding model and corpus version, and a bad one is rolled back",
  width: 880,
  height: 310,
  steps: [
    { title: "Every index build is an immutable snapshot" },
    { title: `A new model re-embeds all ${fmt(CORPUS.chunks)} chunks into snapshot 3` },
    { title: "The golden-set check finds recall@5 down" },
    { title: "Roll back: the alias points at snapshot 2 again" },
  ],
  zones: [
    {
      id: "snaps",
      title: "Index snapshots (never changed in place)",
      tone: RAG_TONE.infra,
      x: 10,
      y: 34,
      w: 640,
      h: 100,
    },
  ],
  nodes: [
    {
      id: "s1",
      label: "Snapshot 1 · Sep 1",
      sub: "embed-v2 · c41",
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "soft",
      x: X[0],
      y: ROW.snap,
      w: W,
    },
    {
      id: "s2",
      label: "Snapshot 2 · Oct 6",
      sub: "embed-v2 · c42",
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "pastel",
      x: X[1],
      y: ROW.snap,
      w: W,
    },
    {
      id: "s3",
      label: "Snapshot 3 · Nov 3",
      sub: "embed-v3 · c42",
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 2,
      x: X[2],
      y: ROW.snap,
      w: W,
    },
    {
      id: "check",
      label: "Recall@5 drops",
      sub: `${RECALL.before} → ${RECALL.after}`,
      icon: "gauge",
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 3,
      x: X[3],
      y: ROW.live,
      w: W,
    },
    {
      id: "questions",
      label: "Questions",
      sub: "live traffic",
      icon: "users",
      tone: RAG_TONE.infra,
      x: X[0],
      y: ROW.live,
      w: W,
    },
    {
      id: "alias",
      label: "Live alias",
      sub: "help-search",
      icon: "link",
      tone: RAG_TONE.infra,
      accent: true,
      x: ALIAS_X,
      y: ROW.live,
      w: W,
    },
  ],
  edges: [
    { from: "s1", to: "s2", packet: true },
    { from: "questions", to: "alias", label: "search", packet: true },
    { from: "alias", to: "s2", label: "live", packet: true, delay: 0.6, until: 1 },
    { from: "s2", to: "s3", packet: true, step: 2 },
    { from: "alias", to: "s3", label: "live", packet: true, delay: 0.6, step: 2, until: 3 },
    { from: "s3", to: "check", label: "golden set", labelAt: 0.75, dashed: true, step: 3, via: [[X[3], ROW.snap]] },
    { from: "alias", to: "s2", label: "rollback", packet: true, delay: 0.6, step: 4 },
  ],
};

export default spec;
