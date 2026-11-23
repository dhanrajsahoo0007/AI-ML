import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST } from "@/components/diagrams/presets/agents";
import { RESOLVE } from "@/components/diagrams/presets/agents-promptver";

// How a worker resolves a prompt label at runtime (prompt-management-versioning, Architecture). A Brightpost refund
// chat in the canary arm asks for brightpost-support at the canary label. The SDK answers from its in-memory cache
// (v13, no network call), the worker renders it, sends it to the model and logs the version and hash on the trace.
// After the 60 s TTL the copy is stale: the SDK still serves it and refreshes in the background. The rollback moves
// the canary label to v12 in the registry, and the next refresh brings v12 to this worker. On a cold start with the
// registry down, the fetch fails and the SDK serves the v12 fallback shipped in the image.
//
// Six steps: 1 the chat asks for the canary prompt · 2 a cache hit, rendered and traced · 3 stale after 60 s, refresh
// in the background · 4 the rollback moves the label · 5 the next refresh brings v12 · 6 registry down on a cold start:
// the fallback copy. Nodes never move.
//
// Numbers (worked in presets/agents-promptver.ts): at most 3600 / 60 = 60 registry calls per worker per hour with the
// cache, against 2 × 3600 = 7,200 with a fetch per chat (2 chats a second is illustrative); a moved label reaches a
// worker in about 60 + 0.5 + 0.039 ≈ 61 s. Facts from Langfuse's caching docs, checked 17 Nov 2026.
//
// Layout: three columns (x 105, 370, 670; 190 wide, gaps of 75 and 110 for the edge labels) and three rows (y 80,
// 230, 380). Top: the chat, the worker, the model. Middle: the trace store, the SDK cache, the registry. Bottom: the
// fallback copy under the cache, the label move under the registry. Cache ⇄ registry has two edges bent apart
// (refresh above through y 205, v12 below through y 255); the failed fetch in step 6 runs over the top through y 155
// so it does not sit on them.
//
// Colour (agents legend, four tones plus neutral): the chat orange, the model green, the cache (the accent), the
// registry and the trace store violet, the worker, the fallback and the label move neutral; the failed fetch is the
// one red edge.

const COL = [105, 370, 670] as const;
const ROW = [80, 230, 380] as const;
const W = 190;

const spec: DiagramSpec = {
  title: "Resolving a prompt label at runtime: cache, refresh, rollback, fallback",
  width: 860,
  height: 440,
  steps: [
    { title: `A chat asks for the ${RESOLVE.label} prompt` },
    { title: `Cache hit: ${RESOLVE.cached} from memory, no network call` },
    { title: `After ${RESOLVE.ttlS} s the copy is stale: serve it, refresh behind` },
    { title: `The rollback moves the ${RESOLVE.label} label to ${RESOLVE.rolledBack}` },
    { title: `The next refresh brings ${RESOLVE.rolledBack} to this worker` },
    { title: "Cold start, registry down: the fallback copy" },
  ],
  zones: [],
  nodes: [
    {
      id: "chat",
      label: "Refund chat",
      sub: `order ${BRIGHTPOST.orderId}, canary arm`,
      icon: "chat",
      tone: AGENT_TONE.task,
      x: COL[0],
      y: ROW[0],
      w: W,
    },
    {
      id: "worker",
      label: "Worker",
      sub: "Brightpost chat service",
      icon: "server",
      tone: AGENT_TONE.infra,
      x: COL[1],
      y: ROW[0],
      w: W,
    },
    {
      id: "cache",
      label: "SDK prompt cache",
      sub: `in memory, ${RESOLVE.ttlS} s TTL`,
      icon: "database",
      tone: AGENT_TONE.memory,
      accent: true,
      x: COL[1],
      y: ROW[1],
      w: W,
    },
    {
      id: "model",
      label: "Model",
      sub: "gets the prompt",
      icon: "model",
      tone: AGENT_TONE.model,
      step: 2,
      x: COL[2],
      y: ROW[0],
      w: W,
    },
    {
      id: "trace",
      label: "Trace store",
      sub: "version + hash per call",
      icon: "trace",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 2,
      x: COL[0],
      y: ROW[1],
      w: W,
    },
    {
      id: "registry",
      label: "Prompt registry",
      sub: `${RESOLVE.label} label → version`,
      icon: "database",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 3,
      x: COL[2],
      y: ROW[1],
      w: W,
    },
    {
      id: "move",
      label: "Roll back",
      sub: `${RESOLVE.label} → ${RESOLVE.rolledBack}`,
      icon: "history",
      tone: AGENT_TONE.infra,
      step: 4,
      x: COL[2],
      y: ROW[2],
      w: W,
    },
    {
      id: "fallback",
      label: "Fallback copy",
      sub: `${RESOLVE.fallback}, in the image`,
      icon: "file",
      tone: AGENT_TONE.infra,
      step: 6,
      x: COL[1],
      y: ROW[2],
      w: W,
    },
  ],
  edges: [
    // Step 1: the chat reaches a worker, which asks the SDK for the label.
    { from: "chat", to: "worker", label: "new chat", packet: true },
    { from: "worker", to: "cache", label: `get ${RESOLVE.label}`, packet: true, bidirectional: true },

    // Step 2: a hit. The worker renders v13 locally, calls the model and logs the version on the trace.
    { from: "worker", to: "model", label: `${RESOLVE.cached} rendered`, packet: true, step: 2 },
    { from: "worker", to: "trace", label: `${RESOLVE.cached} + hash`, packet: true, step: 2 },

    // Step 3: stale after the TTL; the SDK serves the old copy and refreshes in the background.
    {
      from: "cache",
      to: "registry",
      label: "refresh",
      dashed: true,
      flow: true,
      via: [[520, 205]],
      step: 3,
    },

    // Step 4: the rollback is a label move in the registry, not a deploy.
    { from: "move", to: "registry", label: "move label", packet: true, step: 4 },

    // Step 5: the next refresh returns v12.
    { from: "registry", to: "cache", label: RESOLVE.rolledBack, packet: true, via: [[520, 255]], step: 5 },

    // Step 6: a cold start with the registry down. The fetch fails; the SDK serves the fallback.
    {
      from: "cache",
      to: "registry",
      label: "fetch fails",
      tone: AGENT_TONE.failure,
      dashed: true,
      via: [
        [455, 155],
        [COL[2], 155],
      ],
      step: 6,
    },
    { from: "fallback", to: "cache", label: `use ${RESOLVE.fallback}`, packet: true, step: 6 },
  ],
};

export default spec;
