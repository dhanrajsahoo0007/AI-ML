import type { DiagramEdge, DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { GENAI_TONE, HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { CHAT, COMPLETION_CONTEXT, COMPLETION_FLEET, EVAL } from "@/components/diagrams/presets/gcase-code";

// The code assistant (genai-system-design/case-studies/code-assistant), the hero. Built one requirement at a time,
// exactly as the design sheet §8 lists it (SYSTEM-DESIGN/plans/genai-design/design/code-assistant.md, v3):
//   1 A completion from the open file (F1): IDE plugin → gateway → our FIM model → first line → ghost text.
//   2 Gate, cancel, reuse, context (F1, N2): the context assembler (the accent, labelled "Assembler" to fit its card)
//     joins on a dashed line from the gateway (until step 3): its completion layout runs in the plugin (stable blocks
//     first, frozen for 30 s), so the FIM line now carries COMPLETION_CONTEXT.newAvg = 490 new tokens (1,510 reused
//     from the KV prefix). The plugin–gateway and gateway–assembler gaps are about 40 px, so those lines carry no label.
//   3 Search the repository without shipping it (F5, F6): local index (grep, symbols) → sync service (Merkle compare)
//     → embeddings arm (A/B only).
//   4 Chat over the repository (F2): gateway → assembler (the dashed step-2 line is replaced by the chat flow) → mid
//     model.
//   5 The agent loop (F3): orchestrator beside the assembler (every step's prompt), small model for explore, sessions
//     and audit log.
//   6 Apply edits fast and exactly (F4): the plugin sends sketches through the gateway to our apply model.
//   7 Sandbox, tiers, packages, MCP and cloud tasks (F3, F6): policy engine between the orchestrator and the local
//     sandbox; MCP servers and the cloud microVM (git proxy, registry mirror) off the orchestrator's trunk; snapshot
//     builder → environment snapshots → cloud; the pull request to the reviewer.
//   8 Measure what is kept, gate every release (F7): telemetry and offline suites feed the evaluation gate.
// Numbers (presets/gcase-code.ts): COMPLETION_FLEET.gpus = 355 GPUs; COMPLETION_CONTEXT.newAvg = 490 new tokens;
// EVAL.suiteTasks = 300 past issues.
//
// Layout (1200 × 740, genaiZones() from presets/genai-case.ts). Three rows (y 114 | 182 | 250) carry every line from
// the clients column into the core zone, straight across the empty edge column, so no line crosses another (row 1 sits
// low enough that the NEW tags clear the zone tabs):
//            clients x 105     edge x 297     core x 490 (156 wide)    core x 669 (146 wide)
//     114    Local index  ───────────────────  Sync service ──────────────────────────────→ Embeddings arm (glyph)
//     182    Local sandbox ──────────────────  Policy engine ←─┐ (up from the orchestrator)
//     250    IDE plugin ──── Gateway ────────  Assembler* ──── Orchestrator ──→ Sessions, audit (glyph)
//   The gateway's other lines leave its foot and drop down x 297: into the FIM model (y 390) and the apply model
//   (y 470). The assembler reaches the mid model through the gap under the core zone (y 305, then down x 676): the
//   services tab "Models, sandboxes and tools" ends at x 670, so the mid model is 132 wide at x 676 and the line drops
//   right of the tab. Services: FIM and apply x 490; mid x 676; small and MCP x 668 (150 wide); rows 390 · 470 · 550;
//   the cloud microVM 628, 320 wide. The orchestrator's trunk runs down the right gutter x 756 into small, MCP and the
//   cloud card from their right; its only label ("explore") sits on the trunk above the services zone, so no NEW tag
//   covers it.
//   Offline x 870 (160 wide): snapshot builder 360 (level with the environment snapshots glyph), evaluation gate 470
//   (level with the offline suites glyph); telemetry (glyph 590) rises into the gate's foot at x 930.
//   Environment snapshots reach the cloud card round the outside: right to x 1170, down to y 705, left to x 575, up.
//   The pull request leaves the cloud card along y 628 into the reviewer (no other line goes below y 470 on the left).
// Colours (GENAI_TONE roles): plugin and reviewer orange (people); models green; local sandbox, MCP and the cloud
// microVM teal (tools); policy engine and evaluation lime (checks); the local index a violet card and every store a
// violet glyph; gateway, sync, orchestrator and builder neutral; the context assembler is the one accent.

const C = { clients: 105, edge: 297, core1: 490, core2: 669, svc1: 490, svc2: 676, async: 879, store: 1098 } as const;
const ROW = { a: 114, b: 182, c: 250 } as const;
const SVC = { r1: 390, r2: 470, r3: 550, cloud: 628 } as const;
const ASYNC = { builder: 360, evals: 470 } as const;
const STORE = { embeddings: 114, audit: 250, env: 360, suites: 470, telemetry: 590 } as const;
const BEND = { trunk: 756, underCore: 305, mid: 676, gateFoot: 930, outside: 1170, bottom: 705 } as const;
const W = 150;
const CH = 44;
/**
 * The mid model is 132 wide at x 676, so the line into it drops right of the services tab (which ends at x 670); the
 * small model and MCP below it are 150 wide at x 668 (same right edge, 13 px from the trunk).
 */
const COL2_W = 132;

const card = (
  id: string,
  label: string,
  sub: string,
  icon: string,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => ({ id, label, sub, icon, x, y, w: W, h: CH, step, fill: "pastel", ...extra });

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

const model = (id: string, label: string, sub: string, x: number, y: number, step: number): DiagramNode =>
  card(id, label, sub, "model", x, y, step, { h: 48, tone: GENAI_TONE.model, w: x === C.svc2 ? COL2_W : W });

/** The orchestrator's trunk: out of its right side, down the right gutter x 756, left into the target. */
const trunk = (y: number): [number, number][] => [
  [BEND.trunk, ROW.c],
  [BEND.trunk, y],
];

const edges: DiagramEdge[] = [
  // Step 1: a completion from the open file (the plugin–gateway gap is 42 px: no label; the FIM line carries it).
  { from: "plugin", to: "gateway", flow: true, packet: true, bidirectional: true },
  {
    from: "gateway",
    to: "fim",
    label: "first line",
    labelAt: 0.75,
    flow: true,
    packet: true,
    bidirectional: true,
    delay: 0.5,
    via: [[C.edge, SVC.r1]],
    until: 1,
  },

  // Step 2: gate, cancel, reuse; the assembler's completion layout runs in the plugin.
  {
    from: "gateway",
    to: "fim",
    label: `${n(COMPLETION_CONTEXT.newAvg)} new tokens`,
    labelAt: 0.78,
    flow: true,
    packet: true,
    bidirectional: true,
    delay: 0.5,
    via: [[C.edge, SVC.r1]],
    step: 2,
  },
  { from: "gateway", to: "assembler", dashed: true, until: 3 },

  // Step 3: search the repository without shipping it.
  { from: "localidx", to: "sync", label: "changed hashes", labelAt: 0.5, bidirectional: true },
  { from: "sync", to: "embeddings", label: "changed chunks (arm)", labelAt: 0.5, dashed: true },

  // Step 4: chat over the repository.
  {
    from: "gateway",
    to: "assembler",
    flow: true,
    packet: true,
    bidirectional: true,
    step: 4,
  },
  {
    from: "assembler",
    to: "mid",
    label: `${n(CHAT.total)} tokens`,
    labelAt: 0.45,
    flow: true,
    bidirectional: true,
    via: [
      [C.core1, BEND.underCore],
      [BEND.mid, BEND.underCore],
    ],
  },

  // Step 5: the agent loop.
  { from: "assembler", to: "orchestrator", bidirectional: true },
  { from: "orchestrator", to: "small", label: "explore", labelAt: 0.35, bidirectional: true, via: trunk(SVC.r2) },
  { from: "orchestrator", to: "audit", label: "steps, tokens, cost", labelAt: 0.5 },

  // Step 6: apply edits fast and exactly.
  {
    from: "gateway",
    to: "apply",
    label: "sketch → region",
    labelAt: 0.8,
    bidirectional: true,
    via: [[C.edge, SVC.r2]],
  },

  // Step 7: sandbox, permission tiers, packages, MCP and cloud tasks.
  {
    from: "orchestrator",
    to: "policy",
    label: "every tool call",
    labelAt: 0.6,
    bidirectional: true,
    via: [[C.core2, ROW.b]],
  },
  { from: "policy", to: "sandbox", label: "run, no network", labelAt: 0.5, flow: true, packet: true },
  { from: "orchestrator", to: "mcp", via: trunk(SVC.r3) },
  { from: "orchestrator", to: "cloud", via: trunk(SVC.cloud) },
  { from: "builder", to: "env" },
  {
    from: "env",
    to: "cloud",
    label: "snapshot, no secrets",
    labelAt: 0.62,
    dashed: true,
    via: [
      [BEND.outside, STORE.env],
      [BEND.outside, BEND.bottom],
      [575, BEND.bottom],
    ],
  },
  { from: "cloud", to: "reviewer", label: "pull request, agent/<task>", labelAt: 0.5, flow: true, packet: true },

  // Step 8: measure what is kept, gate every release.
  { from: "suites", to: "evals", dashed: true },
  {
    from: "telemetry",
    to: "evals",
    label: "retained characters",
    labelAt: 0.3,
    dashed: true,
    via: [
      [BEND.gateFoot, STORE.telemetry],
      [BEND.gateFoot, ASYNC.evals],
    ],
  },
];

const spec: DiagramSpec = {
  title: "Code assistant: a millisecond completion path and a sandboxed agent, sharing one plugin and a local index",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "A completion from the open file", covers: "F1" },
    { title: "Make it fast and affordable: gate, cancel, reuse, context", covers: "F1, N2" },
    { title: "Search the repository without shipping it", covers: "F5, F6, N6" },
    { title: "Chat over the repository", covers: "F2, N3" },
    { title: "The agent loop", covers: "F3, N4" },
    { title: "Apply edits fast and exactly", covers: "F4" },
    { title: "Sandbox, permission tiers, packages, MCP and cloud tasks", covers: "F3, F6, N7" },
    { title: "Measure what is kept, gate every release", covers: "F7, N1" },
  ],
  zones: genaiZones({ core: "Context and orchestration", services: "Models, sandboxes and tools" }),
  nodes: [
    // Clients
    card("localidx", "Local index", "grep, symbols", "search", C.clients, ROW.a, 3, { tone: GENAI_TONE.store }),
    card("sandbox", "Local sandbox", "no network", "sandbox", C.clients, ROW.b, 7, { tone: GENAI_TONE.tool }),
    card("plugin", "IDE plugin", "gate, scan, cache", "browser", C.clients, ROW.c, 1, {
      h: 52,
      tone: GENAI_TONE.user,
    }),
    card("reviewer", "Reviewer", "reads the PR", "approval", C.clients, SVC.cloud, 7, { tone: GENAI_TONE.user }),

    // Edge and gateway
    card("gateway", "Gateway", "auth, region, abort", "gateway", C.edge, ROW.c, 1, { h: 52 }),

    // Context and orchestration
    card("sync", "Sync service", "Merkle compare", "tree", C.core1, ROW.a, 3, { w: 156 }),
    card("policy", "Policy engine", "deny, ask, allow", "policy", C.core1, ROW.b, 7, {
      w: 156,
      tone: GENAI_TONE.check,
    }),
    {
      id: "assembler",
      label: "Assembler",
      sub: "context, per path",
      icon: "prompt",
      accent: true,
      x: C.core1,
      y: ROW.c,
      w: 156,
      h: 48,
      step: 2,
    },
    card("orchestrator", "Orchestrator", "agent loop, caps", "coordinator", C.core2, ROW.c, 5, { w: 146, h: 48 }),

    // Models, sandboxes and tools
    model("fim", "FIM model", `ours, ${n(COMPLETION_FLEET.gpus)} GPUs`, C.svc1, SVC.r1, 1),
    model("mid", "Mid model", "chat, agent", C.svc2, SVC.r1, 4),
    model("apply", "Apply model", "ours, speculative", C.svc1, SVC.r2, 6),
    card("small", "Small model", "hosted: explore", "model", 668, SVC.r2, 5, { h: 48, tone: GENAI_TONE.model }),
    card("mcp", "MCP servers", "allow-listed", "tool", 668, SVC.r3, 7, { tone: GENAI_TONE.tool }),
    card("cloud", "Cloud microVM", "git proxy, registry mirror", "sandbox", 575, SVC.cloud, 7, {
      w: 320,
      h: 48,
      tone: GENAI_TONE.tool,
    }),

    // Offline pipelines
    card("builder", "Snapshot builder", "clone, install, no secrets", "snapshot", C.async, ASYNC.builder, 7, {
      w: 180,
    }),
    card("evals", "Evaluation gate", "A/B, suites, rollout", "chart", 870, ASYNC.evals, 8, {
      w: 160,
      tone: GENAI_TONE.check,
    }),

    // Data and state
    store("embeddings", "Embeddings arm", "A/B only, opt-in", "vector-index", STORE.embeddings, 3),
    store("audit", "Sessions, audit", "no code", "log", STORE.audit, 5),
    store("env", "Env snapshots", "per lockfile", "snapshot", STORE.env, 7),
    store("suites", "Offline suites", `FIM, ${n(EVAL.suiteTasks)} issues`, "folder", STORE.suites, 8),
    store("telemetry", "Telemetry", "counts, no code", "chart", STORE.telemetry, 8),
  ],
  edges,
};

export default spec;
