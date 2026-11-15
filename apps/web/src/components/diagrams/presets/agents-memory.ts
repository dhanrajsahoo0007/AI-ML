// Constants for the agent-memory figures (assets/diagrams/animated/agents/memory-vs-rag, memory-scoring,
// memory-write-policy) on genai-system-design/agent-memory. Brightpost names and numbers come from ./agents; this file
// adds only the memory story: a week after the cracked-kettle refund the customer writes again (the same story as the
// RAG track's rag/memory-read-write and rag/memory-types, whose labels this file repeats word for word).

import { BRIGHTPOST } from "./agents";

/** The return visit, a week after the refund (12 Nov → 19 Nov; the date is illustrative). */
export const MEMORY_VISIT = {
  today: "19 Nov",
  message: "Has my kettle refund gone through? Text me from now on, not email.",
  /** Memories the store held before today's chat, as labelled in rag/memory-read-write and rag/memory-types. */
  refundMemory: `${BRIGHTPOST.orderId}: £${BRIGHTPOST.price} refund approved`,
  oldPreference: "prefers email",
  newPreference: "prefers text",
} as const;

// ── Retrieval score (Generative Agents, Park et al. 2023, §4.1) ─────────────────────────────────────────────────────
//
// score = α_rec · recency + α_imp · importance + α_rel · relevance, every α = 1. Each term is min-max scaled to [0, 1]
// over the candidates first. Recency = 0.995 ^ (hours since the memory was last retrieved); importance = an LLM's
// 1–10 rating made when the memory is written; relevance = cosine similarity between the memory's embedding and the
// query's. The decay factor, the scaling and the weights are the paper's; the hours, ratings and cosines below are
// illustrative.

const DECAY_PER_HOUR = 0.995;

interface Candidate {
  id: string;
  text: string;
  kind: string;
  hoursSinceUsed: number;
  importance: number;
  cosine: number;
}

/** Three stored memories scored against today's message (illustrative inputs). */
const CANDIDATES: readonly Candidate[] = [
  { id: "refund", text: MEMORY_VISIT.refundMemory, kind: "episodic", hoursSinceUsed: 168, importance: 7, cosine: 0.82 },
  { id: "email", text: MEMORY_VISIT.oldPreference, kind: "semantic", hoursSinceUsed: 720, importance: 5, cosine: 0.61 },
  { id: "giftwrap", text: "asked about gift wrap", kind: "episodic", hoursSinceUsed: 48, importance: 2, cosine: 0.2 },
];

/** How many memories the prompt keeps in the scoring figure. */
export const SCORING_KEEP = 2;

const r2 = (v: number) => Math.round(v * 100) / 100;

const minMax = (xs: readonly number[]) => {
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return xs.map((x) => (x - lo) / (hi - lo));
};

const rawRecency = CANDIDATES.map((c) => DECAY_PER_HOUR ** c.hoursSinceUsed);
const recN = minMax(rawRecency).map(r2);
const impN = minMax(CANDIDATES.map((c) => c.importance)).map(r2);
const relN = minMax(CANDIDATES.map((c) => c.cosine)).map(r2);

/**
 * The worked scores, rounded to 2 dp before summing so the figure's sums add up.
 * Recency 0.995^168 = 0.43, 0.995^720 = 0.03, 0.995^48 = 0.79 → scaled 0.53, 0, 1.
 * Importance 7, 5, 2 → 1, 0.6, 0. Relevance 0.82, 0.61, 0.20 → 1, 0.66, 0.
 * Totals: refund 0.53 + 1 + 1 = 2.53; prefers email 0 + 0.6 + 0.66 = 1.26; gift wrap 1 + 0 + 0 = 1.00.
 */
export const SCORED = CANDIDATES.map((c, i) => ({
  ...c,
  recencyRaw: r2(rawRecency[i]),
  recency: recN[i],
  importanceScaled: impN[i],
  relevance: relN[i],
  total: r2(recN[i] + impN[i] + relN[i]),
}));

// ── Write policy ──────────────────────────────────────────────────────────────────────────────────────────────────

/** The three facts the memory writer extracts from today's chat, what each is compared with, and the decision. */
export const WRITE_CASES = [
  {
    id: "text",
    candidate: MEMORY_VISIT.newPreference,
    kind: "semantic",
    nearest: MEMORY_VISIT.oldPreference,
    relation: "conflict: same field",
    verdict: "UPDATE",
    why: "replace; keep old",
    after: MEMORY_VISIT.newPreference,
    afterSub: `email superseded ${MEMORY_VISIT.today}`,
  },
  {
    id: "refund",
    candidate: MEMORY_VISIT.refundMemory,
    kind: "episodic",
    nearest: MEMORY_VISIT.refundMemory,
    relation: "duplicate: same fact",
    verdict: "DROP",
    why: "nothing new",
    after: MEMORY_VISIT.refundMemory,
    afterSub: `unchanged, ${BRIGHTPOST.delivered}`,
  },
  {
    id: "chased",
    candidate: `chased refund ${BRIGHTPOST.orderId}`,
    kind: "episodic",
    nearest: "nothing close",
    relation: "new",
    verdict: "ADD",
    why: "store it",
    after: `chased refund ${BRIGHTPOST.orderId}`,
    afterSub: `${MEMORY_VISIT.today}, from this chat`,
  },
] as const;
