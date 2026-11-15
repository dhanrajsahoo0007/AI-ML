// Constants for the memory-summarization-compression figures (assets/diagrams/animated/agents/rolling-summary,
// summary-tree, what-gets-lost) on genai-system-design/memory-summarization-compression. Brightpost names and numbers
// come from ./agents and ./agents-memory; this file adds the 40-turn support thread and the two summary passes.
//
// The thread (one turn = one message, customer or support agent) runs over two days, so it agrees with the
// agent-memory story: on 12 Nov the customer reports the cracked kettle and the £42 refund is approved at 10:20; on
// 19 Nov the customer returns to the same thread and asks for texts instead of email ("prefers text"). Every token
// count is illustrative: 120 tokens per turn on average.

import { BRIGHTPOST } from "./agents";
import { MEMORY_VISIT } from "./agents-memory";

/** Average tokens per turn (illustrative). */
const TURN_TOKENS = 120;

const tokens = (turns: number) => turns * TURN_TOKENS;

/**
 * The rolling summary's rule (illustrative): when the raw turns reach 25, fold the oldest 15 into the running summary
 * and keep the newest 10 word for word. On a 40-turn thread that happens twice.
 * - Turn 25: 25 raw turns = 3,000 tokens, the trigger. Pass 1 folds turns 1–15 (1,800 tokens) into S1, 300 tokens.
 *   Left: S1 300 + turns 16–25 1,200 = 1,500.
 * - Turn 40: S1 300 + turns 16–40 (25 turns, 3,000) = 3,300. Pass 2 folds S1 + turns 16–30 (300 + 1,800 = 2,100
 *   tokens read) into S2, 350 tokens. Left: S2 350 + turns 31–40 1,200 = 1,550.
 * - Without a summary turn 40 carries all 40 turns: 4,800 tokens. 1,550 is 3,250 fewer, 68 % less.
 */
export const ROLLING = {
  turns: 40,
  turnTokens: TURN_TOKENS,
  triggerTurns: 25,
  foldTurns: 15,
  keepTurns: 10,
  trigger: tokens(25),
  raw: tokens(40),
  s1: 300,
  s2: 350,
  pass1: { at: 25, folds: "1–15", reads: tokens(15), kept: "16–25", keptTokens: tokens(10) },
  pass2: { at: 40, folds: "16–30", reads: 300 + tokens(15), kept: "31–40", keptTokens: tokens(10) },
  block: tokens(15),
  /** Turn 40 before pass 2: S1 + turns 16–40. */
  beforePass2: 300 + tokens(25),
  afterPass1: 300 + tokens(10),
  afterPass2: 350 + tokens(10),
} as const;

/** Saving at turn 40: (4,800 − 1,550) / 4,800 = 67.7 % → 68 %. */
export const ROLLING_SAVING = {
  tokens: ROLLING.raw - ROLLING.afterPass2,
  pct: Math.round(((ROLLING.raw - ROLLING.afterPass2) / ROLLING.raw) * 100),
} as const;

/** One fact from the thread and how each summary pass words it; `null` = the fact is gone. */
export interface TrackedFact {
  id: string;
  name: string;
  /** What kind of fact it is: the summary prompt keeps decisions and ids. */
  kind: string;
  turn: number;
  raw: string;
  /** "not yet" when the fact arrives after pass 1. */
  s1: string | null;
  s2: string | null;
}

/** The summary prompt both passes use. */
export const SUMMARY_PROMPT = "Keep the decisions and the ids.";

/**
 * Five facts from the thread through both passes (what-gets-lost). Ids and decisions survive both; the photo's time
 * is dropped in pass 1 and the damage description in pass 2, when the refund decision no longer needs it.
 */
export const TRACKED: readonly TrackedFact[] = [
  {
    id: "order",
    name: "Order number",
    kind: "id",
    turn: 1,
    raw: `"It's order ${BRIGHTPOST.orderId}"`,
    s1: `order ${BRIGHTPOST.orderId}`,
    s2: `order ${BRIGHTPOST.orderId}`,
  },
  {
    id: "refund",
    name: "Refund",
    kind: "id + decision",
    turn: 14,
    raw: `${BRIGHTPOST.refundId}, £${BRIGHTPOST.price}, ${BRIGHTPOST.approvedAt}`,
    s1: `${BRIGHTPOST.refundId} £${BRIGHTPOST.price} approved`,
    s2: `${BRIGHTPOST.refundId} £${BRIGHTPOST.price} approved`,
  },
  {
    id: "text",
    name: "Contact",
    kind: "decision",
    turn: 26,
    raw: '"Text me from now on"',
    s1: "not yet",
    s2: MEMORY_VISIT.newPreference,
  },
  {
    id: "damage",
    name: "Damage",
    kind: "detail",
    turn: 3,
    raw: "crack from spout to base",
    s1: "cracked from spout",
    s2: null,
  },
  {
    id: "photo",
    name: "Photo time",
    kind: "timestamp",
    turn: 3,
    raw: "photo sent 09:42",
    s1: null,
    s2: null,
  },
];

/** What S2 says where the damage description used to be. */
export const S2_DAMAGE = "arrived damaged";

/** The question at turn 41 that the summary cannot answer. */
export const TURN_41 = "The courier's claim needs the photo: what did I send, and when?";

/**
 * A summary tree over a long history (illustrative): 400 turns in 8 leaf blocks of 50 turns (6,000 tokens each),
 * summarised in pairs: 8 → 4 → 2 → 1. Leaf summaries 400 tokens, level 2 400, the root 400. In a rolling chain the
 * first block is re-summarised at every later pass: 8 blocks, 8 passes, so block 1's facts go through 8 summaries.
 * In the tree every leaf goes through log2(8) = 3 levels.
 */
export const TREE = {
  leaves: 8,
  turnsPerLeaf: 50,
  leafTokens: tokens(50),
  nodeTokens: 400,
  depth: Math.log2(8),
  chainDepth: 8,
  totalTurns: 8 * 50,
  rawTokens: tokens(400),
} as const;
