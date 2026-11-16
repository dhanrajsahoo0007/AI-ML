import type { SequenceSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { PCACHE_PRICE, PCACHE_PROMPT } from "@/components/diagrams/presets/production-pcache";

// The life of one cache entry (prompt-caching, Core concepts). Brightpost sends three requests with the same fixed
// 1,200-token prefix (PCACHE_PROMPT) to a provider with a 5-minute lifetime (Anthropic's default, refreshed by every
// read; docs checked 2026-11-15; OpenAI's in-memory retention is "5 to 10 minutes of inactivity").
//   1 request 1 finds nothing, so the provider writes the prefix (1.25× on Anthropic) and answers; the usage block
//     reports the 1,200 tokens as written.
//   2 request 2, 0.4 s later, hits: the prefix is read at 0.1× and the lifetime restarts.
//   3 six minutes with no request: the entry expires. Request 3 misses and writes again at 1.25×.
// Lanes: the support app (orange, the prompt's sender), the provider API (neutral, control), the prompt cache (violet,
// a store). One accent: the hit. The expiry is the one thing that breaks, drawn as a note.

const FIXED = n(PCACHE_PROMPT.fixed);

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A cache entry: written, read, then expired",
  width: 800,
  steps: [
    { title: "The first call writes the prefix" },
    { title: "Later calls read it" },
    { title: "After the lifetime ends, it is written again" },
  ],
  lanes: [
    { id: "app", label: "Support app", icon: "chat", tone: PROD_TONE.traffic },
    { id: "api", label: "Provider API", icon: "api", tone: PROD_TONE.infra },
    { id: "cache", label: "Prompt cache", icon: "cache", tone: PROD_TONE.store },
  ],
  messages: [
    { from: "app", to: "api", label: "request 1, breakpoint after the policy" },
    { from: "api", to: "cache", label: `look up the ${FIXED}-token prefix` },
    { from: "cache", to: "api", label: "miss", kind: "return" },
    { from: "api", to: "cache", label: `write it, ${PCACHE_PRICE.write5m}× price` },
    { from: "api", to: "app", label: `answer, ${FIXED} tokens written`, kind: "return" },

    { from: "app", to: "api", label: "request 2, 0.4 s later", step: 2 },
    { from: "api", to: "cache", label: "look up the same prefix", step: 2 },
    { from: "cache", to: "api", label: "hit, lifetime restarts", kind: "return", step: 2 },
    { from: "api", to: "app", label: `answer, ${FIXED} tokens read at ${PCACHE_PRICE.read}×`, kind: "return", step: 2 },

    { from: "app", to: "api", label: "request 3, after 6 quiet minutes", step: 3 },
    { from: "api", to: "cache", label: "look up the prefix", step: 3 },
    { from: "cache", to: "api", label: "miss: the entry expired", kind: "return", step: 3 },
    { from: "api", to: "cache", label: `write it again, ${PCACHE_PRICE.write5m}× price`, step: 3 },
    { from: "api", to: "app", label: `answer, ${FIXED} tokens written`, kind: "return", step: 3 },
  ],
  notes: [
    { lane: "cache", text: `lifetime ${PCACHE_PRICE.ttlMinutes} min`, step: 1, at: 3.5 },
    { lane: "cache", text: `no read for ${PCACHE_PRICE.ttlMinutes} min: gone`, step: 3, at: 9.5 },
  ],
};

export default spec;
