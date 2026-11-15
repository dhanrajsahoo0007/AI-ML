import type { SequenceSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { FALLBACK, sec } from "@/components/diagrams/presets/production-gateway";

// One Brightpost support request that falls back from provider A to provider B (llm-gateway; reused by
// multi-model-routing-fallbacks and other serving pages, so it names no gateway product and no page-only detail).
//
// Four steps, times from presets/production-gateway.ts FALLBACK (illustrative, with the shared 400 ms first token):
//   1 the request reaches provider A, which answers 429 with retry-after: 1 after 50 ms;
//   2 the gateway waits the 1 s and retries at 1.05 s; A accepts but sends no first token within the 2 s timeout;
//   3 at 3.05 s the gateway sends the same request to B in B's format; B's first token comes 400 ms later, at 3.45 s,
//     and the answer streams to the app with a header saying which provider served it;
//   4 A is left alone for a 30 s cooldown, so the next request goes straight to B.
// Lanes (left to right in the order the request travels): the support app, the gateway, provider A, provider B.
// Colours (lanes take the seven section tones): the app orange (traffic), the gateway neutral (infrastructure), both
// providers green (the model). The timeout row is the engine's red "timeout" kind: the one thing that breaks.
// Fact check: a 429 may carry retry-after in seconds (RFC 9110 §10.2.3; Anthropic rate-limit docs, November 2026);
// gateways retry before they fall back (LiteLLM num_retries then fallbacks; Portkey retry and fallback strategy).

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Retry, then fall back to a second provider",
  width: 780,
  steps: [
    { title: "Provider A is overloaded and answers 429" },
    { title: "Wait as told, retry once, time out" },
    { title: "Send the same request to provider B" },
    { title: "Leave A alone for a while" },
  ],
  lanes: [
    { id: "app", label: "Support app", icon: "chat", tone: PROD_TONE.traffic },
    { id: "gw", label: "Gateway", icon: "gateway", tone: PROD_TONE.infra },
    { id: "a", label: "Provider A", icon: "api", tone: PROD_TONE.model },
    { id: "b", label: "Provider B", icon: "api", tone: PROD_TONE.model },
  ],
  messages: [
    // Step 1: the first try is refused.
    { from: "app", to: "gw", label: "chat request, team key" },
    { from: "gw", to: "a", label: "request in A's format" },
    { from: "a", to: "gw", label: `429, retry-after: ${FALLBACK.retryAfterMs / 1000}`, kind: "return" },

    // Step 2: one retry after the wait; no first token before the timeout.
    {
      from: "gw",
      to: "a",
      label: `retry at ${sec(FALLBACK.retryAtMs)}: no token in ${sec(FALLBACK.firstTokenTimeoutMs)}`,
      kind: "timeout",
      step: 2,
      delay: 0.6,
      duration: 2,
      at: 4,
    },

    // Step 3: the fallback provider answers.
    { from: "gw", to: "b", label: `same request in B's format, ${sec(FALLBACK.fallbackAtMs)}`, step: 3, at: 5 },
    { from: "b", to: "gw", label: `first token at ${sec(FALLBACK.userFirstTokenMs)}`, kind: "return", step: 3, at: 6 },
    { from: "gw", to: "app", label: "streamed answer, served by B", kind: "return", step: 3, at: 7 },

    // Step 4: A is skipped while it cools down.
    { from: "app", to: "gw", label: "next request", step: 4, at: 9 },
    { from: "gw", to: "b", label: "straight to B", step: 4, at: 10 },
  ],
  notes: [
    { lane: "gw", text: `wait ${sec(FALLBACK.retryAfterMs)}, as told`, step: 2, at: 3.5 },
    { lane: "a", text: `A cools down for ${FALLBACK.cooldownS} s`, step: 4, at: 8.5 },
  ],
};

export default spec;
