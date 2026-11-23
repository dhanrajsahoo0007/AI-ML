import type { SequenceSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// What a client does with a 429 from a model provider, four cases (illustrative timings).
//   1 The token bucket is empty: 429 with retry-after: 4 (seconds).
//   2 Wait the 4 s as told plus a small random extra (jitter), retry, succeed. Jitter stops many workers that got the
//     same retry-after from returning in the same instant.
//   3 No retry-after on the 429: wait about 1 s, then about 2 s, each a random time up to that limit (exponential
//     backoff with full jitter), then succeed.
//   4 A 429 for a spent monthly cap (error_code enforced_spend_limit_reached, no retry-after): retrying cannot work, so
//     stop and alert.
// Lanes: the Brightpost worker (orange, traffic) and the provider's API (green, the model).
// Fact check: retry-after in seconds and the spend-cap 429 without it, Anthropic rate-limit docs; OpenAI treats
// Retry-After as a minimum wait and advises jitter (both read 15 November 2026).

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A 429: wait as told, back off, or stop",
  width: 780,
  steps: [
    { title: "The bucket is empty: 429 with retry-after" },
    { title: "Wait as told, plus a little jitter" },
    { title: "No retry-after: back off, with jitter" },
    { title: "A spent monthly cap: do not retry" },
  ],
  lanes: [
    { id: "w", label: "Worker", icon: "function", tone: PROD_TONE.traffic },
    { id: "p", label: "Provider API", icon: "api", tone: PROD_TONE.model },
  ],
  messages: [
    // Step 1
    { from: "w", to: "p", label: "request, 2,200 tokens in" },
    { from: "p", to: "w", label: "429 rate_limit_error, retry-after: 4", kind: "return" },
    // Step 2
    { from: "w", to: "p", label: "retry at 4.3 s", step: 2, at: 3 },
    { from: "p", to: "w", label: "200, answer streams", kind: "return", step: 2, at: 4 },
    // Step 3
    { from: "w", to: "p", label: "next request", step: 3, at: 6 },
    { from: "p", to: "w", label: "429, no retry-after", kind: "return", step: 3, at: 7 },
    { from: "w", to: "p", label: "retry after about 0.6 s", step: 3, at: 9 },
    { from: "p", to: "w", label: "429 again", kind: "return", step: 3, at: 10 },
    { from: "w", to: "p", label: "retry after about 1.4 s", step: 3, at: 12 },
    { from: "p", to: "w", label: "200, answer streams", kind: "return", step: 3, at: 13 },
    // Step 4
    { from: "w", to: "p", label: "request", step: 4, at: 15 },
    { from: "p", to: "w", label: "429, enforced_spend_limit_reached", kind: "return", step: 4, at: 16 },
  ],
  notes: [
    { lane: "w", text: "wait 4 s as told, plus 0 to 1 s random", step: 2, at: 2.5 },
    { lane: "w", text: "wait a random time up to 1 s", step: 3, at: 8 },
    { lane: "w", text: "then up to 2 s", step: 3, at: 11 },
    { lane: "w", text: "no retry-after: stop, alert a person", step: 4, at: 17 },
  ],
};

export default spec;
