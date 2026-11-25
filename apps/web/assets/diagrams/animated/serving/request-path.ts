import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC } from "@/components/diagrams/presets/production";

// The whole LLM serving system, end to end (llm-serving-inference, the Architecture figure and the hero). One
// Brightpost question enters through the gateway, the router sends it to the least busy replica, it waits in that
// replica's queue, the engine's batcher runs it with other requests on the GPU, prefill writes the KV cache and decode
// reads it, and tokens stream back through the gateway. An autoscaler watches queue depth and adds a replica at peak.
// `transformer/serving-stack` (Efficient Attention page) draws the inside of one engine (scheduler grid, prefill,
// decode, paged blocks), not this path through the platform, so this is a new spec; `serving/engine-anatomy` zooms
// into the "Replica 1" zone.
//
// Seven steps: 1 the question reaches the gateway · 2 the router picks a replica · 3 the request waits in that
// replica's queue · 4 the batcher runs it with others on the GPU · 5 prefill writes the KV cache, decode reads it ·
// 6 tokens stream back (the one-way "question" edge is replaced by a two-way "SSE stream" edge) · 7 the autoscaler
// sees the queue grow and adds Replica 3. Nodes never move.
//
// Numbers: 12 requests/s at peak (TRAFFIC). Three replicas at peak = ⌈1.056 GPU-s of prefill per second ÷ 0.6⌉ = 2,
// plus one spare (SIZING in presets/production-serving.ts, illustrative; worked through on the page).
//
// Fact checks: per-iteration batching inside the engine (Yu et al., OSDI 2022, Orca, §3.2); the paged KV cache that
// prefill writes and every decode step reads (Kwon et al., SOSP 2023, arXiv 2309.06180, §4); vLLM exports the
// waiting-queue length as `vllm:num_requests_waiting`, the signal an autoscaler can scale on (vLLM metrics docs,
// checked November 2026); token streaming over server-sent events is how the major chat APIs stream (OpenAI and
// Anthropic streaming docs, November 2026).
//
// Layout (880 × 530): top row y 100: customers (glyph, x 60), gateway (x 300), router (x 560). Zone "Replica 1"
// x 150..680, y 190..410: engine (x 300, y 255) under the gateway so the token stream runs straight up; queue
// (x 560, y 255) under the router; KV cache (x 300, y 355) under the engine. Right column x 790: Replica 2 (y 255),
// Replica 3 (y 355), autoscaler (y 470). The router reaches Replica 2 round the top (y 50, below the pause button; x 870); queue depth runs
// down x 560 and along y 470 to the autoscaler, which points straight up at Replica 3. The zone's tab ("Replica 1",
// x 166..268) stays clear of the stream edge at x 300.
// Colour (three tones plus neutral): customers orange (traffic); engine and replicas teal (compute); KV cache violet
// (a store); gateway, router, queue and autoscaler neutral (control). The engine is the one accent.

const ROW = { top: 100, mid: 255, low: 355, base: 470 } as const;
const COL = { client: 60, a: 300, b: 560, c: 790 } as const;

const spec: DiagramSpec = {
  title: "The serving path: from a customer's question to streamed tokens",
  width: 880,
  height: 530,
  steps: [
    { title: "A customer's question reaches the gateway" },
    { title: "The router picks a replica" },
    { title: "The request waits in that replica's queue" },
    { title: "The batcher runs it with other requests on the GPU" },
    { title: "Prefill writes the KV cache; decode reads it" },
    { title: "Tokens stream back as they are made" },
    { title: "The autoscaler adds a replica when the queue grows" },
  ],
  zones: [{ id: "replica1", title: "Replica 1", tone: PROD_TONE.compute, x: 150, y: 190, w: 530, h: 220 }],
  nodes: [
    {
      id: "customers",
      label: "Customers",
      sub: `${TRAFFIC.peakPerSecond} requests/s at peak`,
      icon: "users",
      tone: PROD_TONE.traffic,
      variant: "glyph",
      x: COL.client,
      y: ROW.top,
    },
    {
      id: "gateway",
      label: "Gateway",
      sub: "keys, limits, quotas",
      icon: "gateway",
      tone: PROD_TONE.infra,
      x: COL.a,
      y: ROW.top,
      w: 176,
    },
    {
      id: "router",
      label: "Router",
      sub: "model, replica, prefix",
      icon: "router",
      tone: PROD_TONE.infra,
      step: 2,
      x: COL.b,
      y: ROW.top,
      w: 170,
    },
    {
      id: "queue",
      label: "Queue + batcher",
      sub: "continuous batching",
      icon: "queue",
      tone: PROD_TONE.infra,
      step: 3,
      x: COL.b,
      y: ROW.mid,
      w: 176,
    },
    {
      id: "engine",
      label: "Engine on GPU",
      sub: "prefill, then decode",
      icon: "gpu",
      tone: PROD_TONE.compute,
      accent: true,
      step: 4,
      x: COL.a,
      y: ROW.mid,
      w: 170,
    },
    {
      id: "kv",
      label: "Paged KV cache",
      sub: "+ prefix cache",
      icon: "cache",
      tone: PROD_TONE.store,
      fill: "pastel",
      step: 5,
      x: COL.a,
      y: ROW.low,
      w: 170,
    },
    {
      id: "replica2",
      label: "Replica 2",
      sub: "same engine",
      icon: "gpu",
      tone: PROD_TONE.compute,
      fill: "pastel",
      step: 2,
      x: COL.c,
      y: ROW.mid,
      w: 140,
    },
    {
      id: "replica3",
      label: "Replica 3",
      sub: "added at peak",
      icon: "gpu",
      tone: PROD_TONE.compute,
      fill: "pastel",
      step: 7,
      x: COL.c,
      y: ROW.low,
      w: 140,
    },
    {
      id: "autoscaler",
      label: "Autoscaler",
      sub: "reads queue depth",
      icon: "controller",
      tone: PROD_TONE.infra,
      step: 7,
      x: COL.c,
      y: ROW.base,
      w: 164,
    },
  ],
  edges: [
    // Step 1: the question arrives. Replaced at step 6 by the two-way edge that also carries the stream.
    { from: "customers", to: "gateway", label: "question", packet: true, until: 5 },

    // Step 2: the gateway passes allowed requests to the router, which spreads them over the replicas.
    { from: "gateway", to: "router", label: "allowed", packet: true, delay: 0.4 },
    {
      from: "router",
      to: "replica2",
      label: "other requests",
      dashed: true,
      flow: true,
      via: [
        [COL.b, 50],
        [870, 50],
        [870, ROW.mid],
      ],
      step: 2,
    },

    // Step 3: this request goes to Replica 1, the least busy, and waits in its queue.
    { from: "router", to: "queue", label: "least busy", packet: true, delay: 0.8 },

    // Step 4: at the next iteration the batcher adds it to the running batch.
    { from: "queue", to: "engine", label: "join batch", packet: true, delay: 1.2 },

    // Step 5: prefill writes the prompt's keys and values; each decode step reads them and appends one token's.
    { from: "engine", to: "kv", label: "read / write", dashed: true, flow: true, bidirectional: true },

    // Step 6: tokens stream back through the gateway as they are generated.
    { from: "engine", to: "gateway", label: "tokens", packet: true, step: 6 },
    { from: "customers", to: "gateway", label: "SSE stream", bidirectional: true, packet: true, step: 6 },

    // Step 7: queue depth drives the autoscaler, which starts Replica 3.
    {
      from: "queue",
      to: "autoscaler",
      label: "queue depth",
      dashed: true,
      flow: true,
      via: [[COL.b, ROW.base]],
      labelAt: 0.77,
    },
    { from: "autoscaler", to: "replica3", label: "add replica", packet: true },
  ],
};

export default spec;
