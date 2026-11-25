import type { DiagramEdge, DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { GENAI_TONE, HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { CAPACITY, HARDWARE, POOLS, STORAGE } from "@/components/diagrams/presets/gcase-chat";

// The consumer chat assistant (genai-system-design/case-studies/chatgpt-style-chat-service), the hero. Built one
// requirement at a time, exactly as the design sheet §8 lists it (SYSTEM-DESIGN/plans/genai-design/design/
// chatgpt-style-chat-service.md, v3):
//   1 Stream a reply from one model (F1): user → API gateway → chat orchestrator (accent) → one model pool, the whole
//     history sent each turn, tokens back as SSE.
//   2 Store conversations as a tree; resume and stop (F1, F2): conversation store (durable before `done`), hot state
//     (conversation cache, resume buffer).
//   3 Assemble the window (F3): context assembler, tools (search, code sandbox, file parser), file index, background
//     jobs (summaries every fold).
//   4 Serve on KV (N2, N3, N8): inference router (rendezvous hash of conversation_id, bounded load), prefill pool, KV
//     store; the model pool becomes the fast decode racks fed over RDMA; tokens return to the orchestrator. The step-1
//     orchestrator ⇄ model edge is replaced (`until: 3`).
//   5 Route fast or reasoning (F4): turn router in the path (orchestrator → inference router is replaced, `until: 4`),
//     reasoning decode racks.
//   6 Memory across chats (F5): memory service, memory store and recall index; background extraction from user text.
//   7 Safety in the stream (F6): safety screens on the input and on each 32-token window.
//   8 Limits, degradation and release gates (F7, F8): rate limiter and usage meter, small-model pool (fallback and
//     rung 3), traces and usage, evaluation.
// Numbers (presets/gcase-chat.ts): CAPACITY.design.prefillUnits = 1,113 units of 8 GPUs (the same with FP8 or BF16
// decode attention, so no fleet range is needed here; decode rack counts are left off the hero because they differ
// between the two: 45 + 33 with FP8, 63 + 48 with BF16); POOLS.fastSpeed 60 and reasoningSpeed 100 tokens a second;
// HARDWARE.kvStore.bytesPerRegion = 8 PB; STORAGE.messageWritesPeak ≈ 46,300 writes a second.
//
// Layout (1200 × 740, genaiZones() from presets/genai-case.ts). Tabs: "Chat orchestration" x 421–597 y 46–74;
// "Models and tools" x 421–580 y 316–344, so no line enters the services zone's left column from above.
//   Clients x 105 and edge x 297 on the gateway lane y 156; the rate limiter under the gateway at y 262.
//   Chat orchestration, columns x 490 | 660 (150 wide), rows y 100 | 156 | 226:
//            x 490            x 660
//     100    Safety screens   Memory service
//     156    (gateway lane)   Orchestrator*      (44 tall: 134–178)
//     226    Assembler        Turn router
//   The request enters along y 156 through the empty left slot. The orchestrator reaches safety and the assembler by
//   the two diagonals, memory straight up, the turn router straight down; the turn router drops on x 660 (right of the
//   services tab) into the inference router.
//   Models and tools, columns x 490 | 660, rows y 385 | 470 | 555 | 640:
//            x 490            x 660
//     385    Small model      Inference router
//     470    ·                Prefill pool
//     555    Reasoning decode Fast decode
//     640    Tools            ·
//   The request runs straight down the right column: inference router → prefill → fast decode; prefill → reasoning is
//   a diagonal through the empty slot; inference router → small model a short step left.
//   Offline x 878: background jobs 316, evaluation 440. Data and state x 1098 (glyphs): memory store 102, hot state
//   204, conversations 306, traces and usage 408, KV store 510, file index 612.
// Routing (every long edge checked against the boxes, glyph labels and tabs it passes):
//   - Tokens: one trunk up the right gutter x 756 into the orchestrator's right side at y 172; fast decode joins it
//     from its right side, reasoning decode from below along y 600 (under fast decode, over tools).
//   - The orchestrator's store lines leave its right side above the trunk (y 140 to hot state, bend x 1000; y 156 to
//     conversations, bend x 985), so the lower one bends further left and nothing crosses. Memory goes straight right
//     along y 100. All three pass over the offline cards (they start at y 294).
//   - Prefill ⇄ KV store leaves the prefill pool's right side at y 480, crosses the token trunk once (the hero's only
//     crossing), runs under evaluation (its foot is y 462) and bends down at x 1000 into the KV store.
//   - The assembler reaches tools down the left gutter x 394 and enters tools from the left; tools reach the file
//     index along y 640 (under the trunk's foot at y 600), bending up at x 985.
//   - Background jobs write summaries straight into conversations (y 316, under the orchestrator's line at y 296)
//     and memories round the right: down to y 375 (between the conversations label and the traces glyph), right to
//     x 1160, up into the memory store's right side.
//   - The usage meter writes along the bottom: down from the rate limiter to y 705 under every zone, right to x 1176,
//     up into the traces store's right side. Evaluation reads traces through a short bend at x 1015.
// Colours (GENAI_TONE roles): the user orange; prefill, decode and small-model pools green (models); safety screens,
// rate limiter and evaluation lime (checks); turn router and inference router lime (ranking: a routing decision);
// tools teal; assembler and memory blue (retrieved text and context); background jobs neutral; stores violet glyphs;
// the orchestrator is the one accent.

const C = { clients: 105, edge: 297, left: 490, right: 660, async: 878, store: 1098 } as const;
const CORE = { top: 100, lane: 156, low: 226 } as const;
const SVC = { s1: 385, s2: 470, s3: 555, s4: 640 } as const;
const ASYNC = { jobs: 316, evals: 440 } as const;
const STORE = { memory: 102, hot: 204, conv: 306, traces: 408, kv: 510, files: 612 } as const;
const GUTTER = { left: 394, trunk: 756, bottom: 705, between: 375, right: 1160, outer: 1176 } as const;
const BEND = { hot: 1000, conv: 970, kv: 1000, files: 985, evals: 1015 } as const;
const W = 150;
const CH = 40;
const SH = 44;

const card = (
  id: string,
  label: string,
  sub: string,
  icon: string | undefined,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => ({ id, label, sub, icon, x, y, w: W, h: CH, step, fill: "pastel", ...extra });

const pool = (id: string, label: string, sub: string, icon: string | undefined, x: number, y: number, step: number) =>
  card(id, label, sub, icon, x, y, step, { h: SH, tone: GENAI_TONE.model });

const store = (id: string, label: string, sub: string, icon: string, y: number, step: number): DiagramNode => ({
  id,
  label,
  sub,
  icon,
  tone: GENAI_TONE.store,
  variant: "glyph",
  x: C.store,
  y,
  step,
});

/** The token trunk: up the right gutter into the orchestrator's right side. */
const trunkUp = (fromY: number): [number, number][] => [
  [GUTTER.trunk, fromY],
  [GUTTER.trunk, 172],
];

const edges: DiagramEdge[] = [
  // Step 1: one model, the whole history each turn, tokens back as SSE.
  { from: "user", to: "gateway", flow: true, packet: true, bidirectional: true },
  { from: "gateway", to: "orch", flow: true, packet: true, bidirectional: true },
  {
    from: "orch",
    to: "fast",
    label: "whole history",
    labelAt: 0.3,
    flow: true,
    packet: true,
    bidirectional: true,
    until: 3,
  },

  // Step 2: the tree, durable before `done`; the cache and the resume buffer.
  {
    from: "orch",
    to: "hot",
    label: "cache, buffer",
    labelAt: 0.2,
    bidirectional: true,
    via: [
      [GUTTER.trunk + 4, 140],
      [BEND.hot, 140],
      [BEND.hot, STORE.hot],
    ],
  },
  {
    from: "orch",
    to: "conv",
    label: "durable before done",
    labelAt: 0.4,
    via: [
      [BEND.conv, CORE.lane],
      [BEND.conv, 300],
    ],
  },

  // Step 3: assemble the window; tools; summaries folded in the background.
  { from: "orch", to: "asm", step: 3 },
  {
    from: "asm",
    to: "tools",
    label: "search, files",
    labelAt: 0.5,
    via: [
      [GUTTER.left, CORE.low],
      [GUTTER.left, SVC.s4],
    ],
  },
  {
    from: "tools",
    to: "files",
    label: "chunks",
    labelAt: 0.5,
    bidirectional: true,
    via: [
      [BEND.files, SVC.s4],
      [BEND.files, STORE.files],
    ],
  },
  { from: "jobs", to: "conv", bidirectional: true },

  // Step 4: affinity, prefill with prefix tiers, decode over RDMA, tokens back.
  { from: "orch", to: "ir", label: "conversation_id", labelAt: 0.55, flow: true, packet: true, until: 4 },
  { from: "ir", to: "prefill", label: "home unit", labelAt: 0.5, flow: true, packet: true },
  { from: "prefill", to: "fast", label: "KV over RDMA", labelAt: 0.5, flow: true, packet: true },
  {
    from: "prefill",
    to: "kv",
    label: "prefix blocks",
    labelAt: 0.62,
    bidirectional: true,
    via: [
      [C.right + W / 2 + 10, 480],
      [BEND.kv, 480],
      [BEND.kv, STORE.kv],
    ],
  },
  { from: "fast", to: "orch", label: "tokens", step: 4, labelAt: 0.6, flow: true, packet: true, via: trunkUp(SVC.s3) },

  // Step 5: the turn router joins the path; reasoning racks.
  { from: "orch", to: "router", flow: true, step: 5 },
  { from: "router", to: "ir", label: "effort", labelAt: 0.45, flow: true, packet: true },
  { from: "prefill", to: "reasoning" },
  {
    from: "reasoning",
    to: "orch",
    flow: true,
    via: [[C.left, 600], ...trunkUp(600)],
  },

  // Step 6: memory across chats; extraction from user-written text only.
  { from: "orch", to: "memory", step: 6 },
  { from: "memory", to: "memstore", label: "20 memories, recall", labelAt: 0.5, bidirectional: true },
  {
    from: "jobs",
    to: "memstore",
    label: "user text only",
    labelAt: 0.12,
    dashed: true,
    via: [
      [C.async, GUTTER.between],
      [GUTTER.right, GUTTER.between],
      [GUTTER.right, STORE.memory],
    ],
  },

  // Step 7: screens on the input and on every 32-token window.
  { from: "orch", to: "safety", bidirectional: true, step: 7 },

  // Step 8: token limits, the small-model fallback, usage and traces, release gates.
  { from: "gateway", to: "limits", label: "token buckets", labelAt: 0.5, bidirectional: true, step: 8 },
  { from: "ir", to: "small", step: 8 },
  {
    from: "limits",
    to: "traces",
    label: "usage",
    labelAt: 0.5,
    via: [
      [C.edge, GUTTER.bottom],
      [GUTTER.outer, GUTTER.bottom],
      [GUTTER.outer, STORE.traces],
    ],
  },
  {
    from: "traces",
    to: "evals",
    dashed: true,
    via: [
      [BEND.evals, STORE.traces],
      [BEND.evals, ASYNC.evals],
    ],
  },
];

const spec: DiagramSpec = {
  title:
    "A consumer chat service: the window on turn 50, prefill and decode on KV, fast or reasoning, memory, safety, limits",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "Stream a reply from one model", covers: "F1" },
    { title: "Store conversations as a tree; resume and stop", covers: "F1, F2" },
    { title: "Assemble the window: compaction, files, tools", covers: "F3" },
    { title: "Serve on KV: prefill and decode apart, prefix tiers, affinity", covers: "N2, N3, N8" },
    { title: "Route fast or reasoning", covers: "F4" },
    { title: "Memory across chats", covers: "F5" },
    { title: "Safety in the stream", covers: "F6" },
    { title: "Limits, degradation and release gates", covers: "F7, F8" },
  ],
  zones: genaiZones({ core: "Chat orchestration", services: "Models and tools" }),
  nodes: [
    // Clients and edge
    card("user", "User", "web, apps", "users", C.clients, CORE.lane, 1, { h: 48, tone: GENAI_TONE.user }),
    card("gateway", "API gateway", "SSE, dedupe", "gateway", C.edge, CORE.lane, 1, { h: 48 }),
    card("limits", "Rate limiter", "tokens per 5 h", "meter", C.edge, 262, 8, { tone: GENAI_TONE.check }),

    // Chat orchestration
    {
      id: "orch",
      label: "Orchestrator",
      sub: "owns each turn",
      icon: "coordinator",
      accent: true,
      x: C.right,
      y: CORE.lane,
      w: W,
      h: 44,
      step: 1,
    },
    card("safety", "Safety screen", "input, stream", "shield", C.left, CORE.top, 7, { tone: GENAI_TONE.check }),
    card("memory", "Memory", "saved, recall", "history", C.right, CORE.top, 6, { tone: GENAI_TONE.data }),
    card("asm", "Assembler", "the window", "prompt", C.left, CORE.low, 3, { tone: GENAI_TONE.data }),
    card("router", "Turn router", "fast or reasoning", "router", C.right, CORE.low, 5, { tone: GENAI_TONE.rank }),

    // Models and tools
    card("ir", "Inference router", "rendezvous hash", undefined, C.right, SVC.s1, 4, {
      h: SH,
      tone: GENAI_TONE.rank,
    }),
    pool("small", "Small model", "8B: fallback, jobs", "model", C.left, SVC.s1, 8),
    pool(
      "prefill",
      "Prefill pool",
      `${n(CAPACITY.design.prefillUnits)} units of ${HARDWARE.prefill.gpus}`,
      "gpu",
      C.right,
      SVC.s2,
      4
    ),
    pool("fast", "Fast decode", `racks, ${POOLS.fastSpeed} tok/s`, "gpu", C.right, SVC.s3, 1),
    pool("reasoning", "Reasoning", `racks, ${POOLS.reasoningSpeed} tok/s`, "gpu", C.left, SVC.s3, 5),
    card("tools", "Tools", "web, code, files", "tool", C.left, SVC.s4, 3, { h: SH, tone: GENAI_TONE.tool }),

    // Offline pipelines
    card("jobs", "Background", "folds, extraction", "workers", C.async, ASYNC.jobs, 3, { h: SH }),
    card("evals", "Evaluation", "gates, canaries", "chart", C.async, ASYNC.evals, 8, {
      h: SH,
      tone: GENAI_TONE.check,
    }),

    // Data and state
    store("memstore", "Memory store", "saved + recall index", "history", STORE.memory, 6),
    store("hot", "Hot state", "Redis: cache, buffer", "cache", STORE.hot, 2),
    store(
      "conv",
      "Conversations",
      `tree, ${n(Math.round(STORAGE.messageWritesPeak / 100) * 100)} writes/s`,
      "database",
      STORE.conv,
      2
    ),
    store("traces", "Traces, usage", "per turn, 30 days", "trace", STORE.traces, 8),
    store("kv", "KV store", `${HARDWARE.kvStore.bytesPerRegion / 1e15} PB NVMe a region`, "disk", STORE.kv, 4),
    store("files", "File index", "chunks per chat", "folder", STORE.files, 3),
  ],
  edges,
};

export default spec;
