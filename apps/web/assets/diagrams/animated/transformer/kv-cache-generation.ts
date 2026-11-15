import type { SequenceSpec } from "@/components/diagrams/types";

// Generation with a KV cache, as a sequence: one prefill pass over the whole prompt, then one decode step per new
// token. Replaces the Mermaid sequence diagram in "What happens during generation" on the Transformer page.
//
// Step 1, prefill: every prompt token goes through the decoder stack in one parallel pass. Each layer's attention
// computes keys and values for every prompt token; they are stored in the cache. The last position gives the first
// output token (this pass sets the time to first token).
// Step 2, decode: only the newest token goes in. Each layer computes its query, key and value, attends over the
// cached keys and values plus its own, and appends its key and value to the cache.
// Step 3, the same again: the cache is one entry longer per layer; the loop ends at </s> or a length limit.
//
// Facts checked: causal attention means earlier tokens' keys and values never change when a token is appended, so
// they can be cached and reused (the cache holds one key and one value vector per token per layer, per KV head).
// Lane tones follow the Transformer legend as far as sequence lanes allow: attention orange for the decoder stack,
// keys teal for the cache. Sequence lanes take the base tones only, so there is no pink or lime here.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Prefill once, then decode one token at a time with a KV cache",
  width: 760,
  steps: [
    { title: "Prefill: the whole prompt in one pass" },
    { title: "Decode: feed only the newest token" },
    { title: "Decode again: the cache grows each step" },
  ],
  lanes: [
    { id: "prompt", label: "User prompt", icon: "chat", tone: "neutral" },
    { id: "stack", label: "Decoder stack", icon: "queue", tone: "orange" },
    { id: "cache", label: "KV cache", icon: "database", tone: "teal" },
  ],
  messages: [
    // Step 1: prefill.
    { from: "prompt", to: "stack", label: "Prefill: all prompt tokens at once", step: 1 },
    { from: "stack", to: "cache", label: "Store K and V for every layer", step: 1 },
    { from: "stack", to: "prompt", label: "First output token", kind: "return", step: 1 },

    // Step 2: one decode step.
    { from: "prompt", to: "stack", label: "Feed only the newest token", step: 2, delay: 0.6 },
    { from: "stack", to: "cache", label: "Read past K, V; append new ones", step: 2 },
    { from: "stack", to: "prompt", label: "Next token", kind: "return", step: 2 },

    // Step 3: the same again, one entry longer.
    { from: "prompt", to: "stack", label: "Feed the token it just made", step: 3, delay: 0.6 },
    { from: "stack", to: "cache", label: "Read past K, V; append again", step: 3 },
    { from: "stack", to: "prompt", label: "Next token, until </s>", kind: "return", step: 3 },
  ],
  notes: [
    { lane: "prompt", text: "time to first token", step: 1, at: 2.5 },
    { lane: "cache", text: "+1 entry per layer per token", step: 2, at: 4.5 },
  ],
};

export default spec;
