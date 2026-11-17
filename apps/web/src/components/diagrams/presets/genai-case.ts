// Shared skeleton for the GenAI System Design case-study figures (/genai-system-design; plan:
// SYSTEM-DESIGN/plans/genai-design-plan.md §7). The hero (`<folder>/architecture`, 1200 × 740) reuses the grid of
// presets/case-study.ts with GenAI zone titles, so a reader who knows the System Design heroes reads these at once.
//
// Role tones for sequence and layout figures come from the RAG, agent and production legends (no new colours). A
// page adds presets/gcase-<slug>.ts for its own constants; tests/unit/diagrams/genai-case-presets.test.ts pins each.

import type { DiagramZone, Tone } from "../types";
import { AGENT_TONE } from "./agents";
import { HERO, zoneFrame, type ZoneId } from "./case-study";
import { PROD_TONE } from "./production";
import { RAG_TONE } from "./rag";

export { HERO };

/** GenAI names for the six zones of the case-study hero (same places, same tones). */
export const GENAI_ZONE_TITLES = {
  clients: "Clients",
  edge: "Edge and gateway",
  core: "Orchestration",
  services: "Models and tools",
  async: "Offline pipelines",
  storage: "Knowledge and state",
} as const satisfies Record<ZoneId, string>;

/**
 * Zone rectangles of a GenAI hero. `titles` renames a zone for this system (for example core: "Call orchestration");
 * `omit` drops a zone the system does not have.
 */
export function genaiZones(titles: Partial<Record<ZoneId, string>> = {}, omit: readonly ZoneId[] = []): DiagramZone[] {
  return zoneFrame({ ...GENAI_ZONE_TITLES, ...titles }, omit);
}

/**
 * Role tones for sequence lanes, layout boxes and node tones, one meaning per colour across all eleven pages. Sequence
 * lanes accept section tones only, so `SEQUENCE_LANE` maps the two diagram-only tones (lime, pink) away.
 */
export const GENAI_TONE = {
  /** The caller, customer or user, and a person who approves or takes over. */
  user: AGENT_TONE.task,
  /** A model call: the LLM, a classifier, a speech model. */
  model: AGENT_TONE.model,
  /** A tool, an action, an API the agent calls. */
  tool: AGENT_TONE.action,
  /** Retrieved text, a tool result, a transcript, audio frames. */
  data: AGENT_TONE.result,
  /** Stores: an index, a ticket store, a cache, a trace store. */
  store: PROD_TONE.store,
  /** Ranking: a reranker, a score, a router decision. */
  rank: RAG_TONE.rank,
  /** A check: a policy service, a guardrail, a judge, an eval gate. */
  check: PROD_TONE.check,
  /** Failure, attack, a blocked or wrong action. */
  failure: PROD_TONE.failure,
} as const;

/** Sequence-lane tones (section tones only): checks become teal, everything else keeps its role colour. */
export const SEQUENCE_LANE = {
  user: GENAI_TONE.user,
  model: GENAI_TONE.model,
  tool: GENAI_TONE.tool,
  data: GENAI_TONE.data,
  store: GENAI_TONE.store,
  check: "teal",
  person: GENAI_TONE.user,
  harness: "neutral",
} as const satisfies Record<string, Tone>;
