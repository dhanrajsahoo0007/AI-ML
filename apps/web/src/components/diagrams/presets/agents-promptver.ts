// Constants for the runtime-resolution figure (prompt-management-versioning.mdx,
// animated/agents/prompt-runtime-resolve). The version names and the 60 s TTL come from ./agents-prompts, so this
// figure and the release figure quote the same numbers. The chat rate per worker is ILLUSTRATIVE and labelled so on
// the page.
//
// Facts (Langfuse docs, "Caching" page, checked 17 Nov 2026,
// https://langfuse.com/docs/prompt-management/features/caching): the default client-side cache TTL is 60 s; a fresh
// cached prompt is returned without any network request; a stale prompt is returned at once while the SDK refetches
// it in the background, which does not block the application; with an empty cache the SDK fetches from the API
// (their measured mean for an uncached fetch is about 0.039 s); when the cache is empty and the API is unavailable,
// a fallback prompt keeps the application running.

import { CACHE_TTL_S, PROMPT_VERSIONS } from "./agents-prompts";

/** Illustrative load on one worker: 2 new chats a second, each fetching its prompt once. */
const CHATS_PER_S = 2;
/** Langfuse's measured mean for an uncached prompt fetch, rounded (docs, checked 17 Nov 2026). */
const UNCACHED_FETCH_S = 0.039;

/**
 * Registry calls per worker per hour.
 *   With the cache: at most one background refresh per TTL, 3600 / 60 = 60, whatever the traffic.
 *   Without it: one fetch per chat, 2 × 3600 = 7,200, and each one adds about 39 ms before the first model call.
 * Worst case for a moved label to reach one worker: 60 s until its copy goes stale, plus the wait for its next chat
 * (1 / 2 = 0.5 s; that chat still gets the stale copy and starts the refresh), plus one fetch (0.039 s):
 * 60 + 0.5 + 0.039 ≈ 61 s, one refresh interval.
 */
export const RESOLVE = {
  name: PROMPT_VERSIONS.name,
  label: "canary",
  cached: PROMPT_VERSIONS.candidate,
  rolledBack: PROMPT_VERSIONS.live,
  fallback: PROMPT_VERSIONS.live,
  ttlS: CACHE_TTL_S,
  chatsPerS: CHATS_PER_S,
  fetchMs: Math.round(UNCACHED_FETCH_S * 1000),
  refreshesPerHour: 3600 / CACHE_TTL_S,
  fetchesPerHourUncached: CHATS_PER_S * 3600,
  worstCaseS: Math.round(CACHE_TTL_S + 1 / CHATS_PER_S + UNCACHED_FETCH_S),
} as const;
