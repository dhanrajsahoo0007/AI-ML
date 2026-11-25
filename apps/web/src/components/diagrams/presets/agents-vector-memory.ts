// Constants for the long-term vector memory figures (assets/diagrams/animated/agents/vector-memory and memory-decay)
// on genai-system-design/long-term-vector-memory. The Brightpost names come from ./agents and the memory story from
// ./agents-memory (the return visit on 19 Nov, the three scored memories and their cosines); this file adds only what
// these two figures need: a fourth memory, another customer's memory for the filter, and the decay timeline.

import { BRIGHTPOST } from "./agents";
import { MEMORY_VISIT, SCORED } from "./agents-memory";
import { CORPUS } from "./rag";

const scored = (id: string) => {
  const m = SCORED.find((s) => s.id === id);
  if (!m) throw new Error(`agents-memory has no scored memory "${id}"`);
  return m;
};

/** How many memories recall returns, as in rag/memory-read-write and the agent-memory worked example. */
export const RECALL_K = 3;

/** Embedding size: the RAG track's model (1,536 numbers per vector). */
export const MEMORY_DIMS = CORPUS.dims;

/**
 * The fact written on 12 Nov (the refund memory, last used 168 h before the visit in agents-memory SCORED), the
 * vector it becomes (first two and last numbers; illustrative) and the id of its point in the figure.
 */
export const WRITTEN = {
  id: "refund",
  text: MEMORY_VISIT.refundMemory,
  date: BRIGHTPOST.delivered,
  vector: "[0.12, −0.40, …, 0.07]",
} as const;

export interface StoredMemory {
  id: string;
  text: string;
  /** Short label drawn next to the point. */
  short: string;
  customerId: string;
  /** Cosine similarity to today's message. */
  cosine: number;
}

/**
 * Customer 1847's memories with their cosine similarity to today's message. Three cosines come from
 * agents-memory SCORED (0.82, 0.61, 0.20, used by agent/memory-scoring); "kettle arrived cracked" (0.74) is
 * illustrative. Ranked by cosine the top 3 are the refund, the cracked kettle and "prefers email": the three memories
 * rag/memory-read-write recalls.
 */
export const CUSTOMER_MEMORIES: readonly StoredMemory[] = [
  {
    id: "refund",
    text: scored("refund").text,
    short: "refund",
    customerId: BRIGHTPOST.customerId,
    cosine: scored("refund").cosine,
  },
  {
    id: "cracked",
    text: "kettle arrived cracked",
    short: "cracked",
    customerId: BRIGHTPOST.customerId,
    cosine: 0.74,
  },
  {
    id: "email",
    text: scored("email").text,
    short: "email",
    customerId: BRIGHTPOST.customerId,
    cosine: scored("email").cosine,
  },
  {
    id: "giftwrap",
    text: scored("giftwrap").text,
    short: "gift wrap",
    customerId: BRIGHTPOST.customerId,
    cosine: scored("giftwrap").cosine,
  },
];

/**
 * Another customer's memory that sits closer to today's message than any of 1847's (cosine 0.86, illustrative).
 * Without the customer filter it would rank first.
 */
export const OTHER_CUSTOMER_MEMORY: StoredMemory = {
  id: "other",
  text: "kettle refund pending",
  short: "2210",
  customerId: "2210",
  cosine: 0.86,
};

/** The top RECALL_K of customer 1847's memories by cosine: refund 0.82, cracked 0.74, prefers email 0.61. */
export const RECALLED = [...CUSTOMER_MEMORIES].sort((a, b) => b.cosine - a.cosine).slice(0, RECALL_K);

// ── Decay (Generative Agents, Park et al. 2023, §4.1) ────────────────────────────────────────────────────────────────
//
// Recency = 0.995 ^ (hours since the memory was last retrieved), the paper's decay factor and the one agents-memory
// uses. Every 24 hours multiplies it by 0.995^24 = 0.89 (about 11 % a day); after a week 0.995^168 = 0.43; after
// 30 days 0.995^720 = 0.03. A retrieval resets it to 1.

export const DECAY_PER_HOUR = 0.995;

export const recency = (hours: number) => DECAY_PER_HOUR ** hours;

/**
 * The timeline, in hours from 20 Oct 00:00 (30 days before the visit). "prefers email" was last used on 20 Oct
 * (720 h before the visit), the refund on 12 Nov (168 h before), gift wrap on 17 Nov (48 h before): the
 * hoursSinceUsed of agents-memory SCORED. The visit is at 720 h; the figure runs one more week, to 26 Nov (888 h).
 * The dates other than 12 Nov and 19 Nov are derived from those hours.
 */
export const DECAY_TIMELINE = {
  startLabel: "20 Oct",
  visitHour: 720,
  visitLabel: MEMORY_VISIT.today,
  endHour: 888,
  endLabel: "26 Nov",
  memories: [
    { id: "email", text: scored("email").text, lastUsed: 720 - scored("email").hoursSinceUsed },
    { id: "refund", text: scored("refund").text, lastUsed: 720 - scored("refund").hoursSinceUsed },
    { id: "giftwrap", text: scored("giftwrap").text, lastUsed: 720 - scored("giftwrap").hoursSinceUsed },
  ],
} as const;
