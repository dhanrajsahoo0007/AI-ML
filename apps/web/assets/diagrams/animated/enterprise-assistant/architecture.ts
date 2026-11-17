import type { DiagramEdge, DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { GENAI_TONE, HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { AGENT, MEMORY, PROPAGATION, RETRIEVAL, SOURCES, TOOLS } from "@/components/diagrams/presets/gcase-enterprise";

// Brightpost's enterprise AI assistant (genai-system-design/case-studies/conversational-assistant-design, "Design an
// Enterprise AI Assistant"), the hero. Rebuilt in place (same id) one requirement at a time, exactly as the design
// sheet §8 lists it (SYSTEM-DESIGN/plans/genai-design/design/conversational-assistant-design.md, v3):
//   1 Chat over one model behind SSO (F1): employee → API gateway → orchestrator → answer model.
//   2 Answer from an index of company documents (F1, N1, N5): connectors, search index (32.1M chunks), retrieval
//     service, rankers (160 → 50 → 8). The step-2 retrieval → index edge says the search is unfiltered (the crawler
//     reads with app rights); step 3 replaces it (`until: 2`) with the principal set inside the search.
//   3 Map identities; filter inside the search; never looser than the source (F2, N2): ACL and principal store
//     (Entra ids from the connectors), the principal set inside both searches, the 5 ms re-check, live search for
//     Slack and mail as the user.
//   4 Keep permissions fresh within each source's budget (F2, N4, N10): permission sync (events, budgeted polls,
//     drop-out) into the ACL store, which patches the index (≈ 35 s by event).
//   5 Route; look up and act as the user, inside the company (F3, F4, N7): router, tool gateway (tier, audience,
//     card), token broker (delegated tokens), connector tools (106 tools on MCP servers).
//   6 An agent for multi-step tasks, with tool search (F5): agent loop (caps 10 calls, 60 s), tool search. The agent's
//     tool calls and its `tool_search` go through the tool gateway, so it only ever finds the user's entitled tools.
//   7 Memory the user can see and correct (F6, N9): memory store, ≤ 5 items a prompt.
//   8 Guard, egress and evaluate (F7, N2, N7): guards (injection screen, rendering, egress), audit and traces,
//     evaluation (permission suite, canaries, drift audit, gold, simulator).
// Numbers (presets/gcase-enterprise.ts): SOURCES.chunks = 32.1M; RETRIEVAL.funnel 160 unique → 50 → 8;
// PROPAGATION.eventP50 = 35.1 s; TOOLS.count = 106; AGENT.caps 10 calls, 60 s; MEMORY.injectedItems = 5.
//
// Layout (1200 × 740, genaiZones() from presets/genai-case.ts). The "Search, models and tools" tab is
// 24 characters × 8.2 + 28 = 225 px wide, x 421–646 at y 316–344, so every line into the services zone passes right
// of x 660 or down a gutter: the left gutter x 394, the drops at x 668 and x 712 under the tool gateway, the right
// gutter x 756 (between the middle zones and Offline).
//   Clients x 105: employee 187. Edge x 297: API gateway 187.
//   Assistant orchestration, columns x 490 | 660, rows y 120 | 187 | 254 (48 tall):
//            x 490            x 660
//     120    Router           Guards
//     187    Orchestrator*    Retrieval
//     254    Agent loop       Tool gateway
//   The orchestrator (accent) has five core links: up, right, down and the two diagonals (they pass through the
//   20 px gap between the columns). The agent loop reaches the tool gateway level at y 254.
//   Search, models and tools, columns x 490 | 660, rows y 410 | 515 | 620:
//            x 490            x 660
//     410    Token broker     Tool search
//     515    Connector tools  Rankers
//     620    Answer model     Live search
// Routing (every long edge checked against the boxes and tabs it passes):
//   - The orchestrator's model line leaves its left side, runs down the left gutter to y 300, jogs left into the empty
//     edge column (x 340) so it keeps 75 px from the broker and the connector tools, and enters the answer model from
//     the left. The memory line shares that trunk and runs on along y 705 (under every zone) into the memory's foot.
//   - Traces go over the top: up the left gutter, along y 84 (under the zone tabs, which end at y 74; above row 1,
//     which starts at y 96), down into the top of the audit store.
//   - Retrieval has one trunk down the right gutter (x 756) with four taps: the search index (right, y 240) and the
//     ACL store (right, y 355) through Offline's gaps (evaluation ends at 140, connectors fill 272–322, permission sync
//     405–455), the rankers and live search (left, into their right sides). The trunk passes 21 px right of the tool
//     gateway and tool search.
//   - The tool gateway drops twice from its bottom: x 712 straight into tool search; x 668 to y 360, left along y 360
//     (16 px under the tab), down into the broker. Broker → connector tools is a short vertical.
//   - Ingestion lines meet the stores from the left without crossing the retrieval lines: connectors → index rises to
//     the index (stays below y 240), connectors → ACL store falls to it (stays above y 355), permission sync → ACL
//     store rises from below. ACL store → index is a bracket on the right of the store column (x 1160).
// Colours (GENAI_TONE roles): the employee orange; the answer model and agent loop green; retrieval, connectors and
// permission sync blue (data); router and rankers lime (ranking); guards, token broker and evaluation lime (check);
// tool gateway, connector tools, tool search and live search teal (tools); stores violet glyphs; the gateway neutral;
// the orchestrator the one accent. Connector tools has no icon: its full name needs the card's width. The ACL store →
// index bracket carries no label (it would sit on the index's sub); the ≈ 35 s is in the permission-sync sub.

const C = { clients: 105, edge: 297, left: 490, right: 660, async: 879, store: 1098 } as const;
const ROW = { c1: 120, c2: 187, c3: 254, s1: 410, s2: 515, s3: 620 } as const;
const GUTTER = { left: 394, edgeCol: 340, corridor: 300, right: 756, top: 84, bottom: 705, storeRight: 1160 } as const;
const DROP = { broker: 668, search: 712, jog: 360 } as const;
const W = 150;
const CH = 48;
const AW = 190;
const Y = { audit: 125, index: 240, acl: 355, memory: 595 } as const;

const card = (
  id: string,
  label: string,
  sub: string,
  icon: string | undefined,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => ({ id, label, sub, ...(icon ? { icon } : {}), x, y, w: W, h: CH, step, fill: "pastel", ...extra });

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

const [, unique, personal, cross] = RETRIEVAL.funnel;
const millions = (v: number) => `${(v / 1e6).toFixed(1)}M`;

/** The orchestrator's left trunk: down the left gutter, jog into the empty edge column. */
const leftTrunk: [number, number][] = [
  [GUTTER.left, 205],
  [GUTTER.left, GUTTER.corridor],
  [GUTTER.edgeCol, GUTTER.corridor],
];
/** Retrieval's trunk down the right gutter, tapped at `y`. */
const rTrunk = (y: number): [number, number][] => [
  [GUTTER.right, 200],
  [GUTTER.right, y],
];

const edges: DiagramEdge[] = [
  // Step 1: one model behind SSO.
  { from: "employee", to: "gateway", flow: true, packet: true, bidirectional: true },
  { from: "gateway", to: "orch", flow: true, packet: true, bidirectional: true, delay: 0.6 },
  {
    from: "orch",
    to: "model",
    flow: true,
    packet: true,
    bidirectional: true,
    delay: 1.2,
    via: [...leftTrunk, [GUTTER.edgeCol, ROW.s3]],
  },

  // Step 2: an index of company documents. The crawler reads with app rights and the search is unfiltered.
  { from: "orch", to: "retrieval", bidirectional: true },
  {
    from: "retrieval",
    to: "index",
    label: "unfiltered: app rights",
    labelAt: 0.5,
    bidirectional: true,
    via: rTrunk(Y.index),
    step: 2,
    until: 2,
  },
  { from: "retrieval", to: "rankers", bidirectional: true, via: rTrunk(ROW.s2) },
  { from: "connectors", to: "index" },

  // Step 3: identities mapped, the principal set filtered inside both searches, live search for Slack and mail.
  {
    from: "retrieval",
    to: "index",
    label: "principal set inside",
    labelAt: 0.5,
    bidirectional: true,
    via: rTrunk(Y.index),
    step: 3,
  },
  { from: "connectors", to: "acl", label: "Entra ids", labelAt: 0.45 },
  { from: "retrieval", to: "acl", label: "re-check 5 ms", labelAt: 0.5, bidirectional: true, via: rTrunk(Y.acl) },
  { from: "retrieval", to: "live", label: "as the user", labelAt: 0.82, bidirectional: true, via: rTrunk(ROW.s3) },

  // Step 4: permissions kept fresh within each source's budget.
  { from: "permsync", to: "acl" },
  {
    from: "acl",
    to: "index",
    step: 4,
    via: [
      [GUTTER.storeRight, Y.acl],
      [GUTTER.storeRight, Y.index],
    ],
  },

  // Step 5: route; look up and act as the user.
  { from: "orch", to: "router", bidirectional: true },
  { from: "orch", to: "toolgw", bidirectional: true },
  {
    from: "toolgw",
    to: "broker",
    label: "user's token",
    labelAt: 0.55,
    via: [
      [DROP.broker, ROW.c3 + CH / 2],
      [DROP.broker, DROP.jog],
      [C.left, DROP.jog],
    ],
  },
  { from: "broker", to: "tools", label: "delegated", labelAt: 0.5 },

  // Step 6: the agent, with tool search through the gateway.
  { from: "orch", to: "agent", bidirectional: true },
  { from: "agent", to: "toolgw" },
  {
    from: "toolgw",
    to: "toolsearch",
    label: "entitled only",
    labelAt: 0.5,
    bidirectional: true,
    via: [
      [DROP.search, ROW.c3 + CH / 2],
      [DROP.search, ROW.s1 - 29],
    ],
  },

  // Step 7: memory the user can see and correct, along the bottom.
  {
    from: "orch",
    to: "memory",
    label: `≤ ${MEMORY.injectedItems} items, user-saved`,
    labelAt: 0.72,
    bidirectional: true,
    via: [...leftTrunk, [GUTTER.edgeCol, GUTTER.bottom], [C.store, GUTTER.bottom]],
  },

  // Step 8: guards, audit and evaluation.
  { from: "orch", to: "guards", bidirectional: true },
  {
    from: "orch",
    to: "audit",
    label: "every turn, acl_version",
    dashed: true,
    labelAt: 0.35,
    via: [
      [GUTTER.left, 168],
      [GUTTER.left, GUTTER.top],
      [C.store, GUTTER.top],
    ],
  },
  { from: "audit", to: "eval", dashed: true },
];

const spec: DiagramSpec = {
  title:
    "Enterprise AI assistant: permission-aware retrieval, fresh within each source's budget, tools as the user, memory people correct",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "Chat over one model behind SSO", covers: "F1" },
    { title: "Answer from an index of company documents", covers: "F1, N1, N5" },
    { title: "Map identities; filter inside the search; never looser than the source", covers: "F2, N2" },
    { title: "Keep permissions fresh within each source's budget", covers: "F2, N4, N10" },
    { title: "Route; look up and act as the user, inside the company", covers: "F3, F4, N7" },
    { title: "An agent for multi-step tasks, with tool search", covers: "F5" },
    { title: "Memory the user can see and correct", covers: "F6, N9" },
    { title: "Guard, egress and evaluate", covers: "F7, N2, N7" },
  ],
  zones: genaiZones({ core: "Assistant orchestration", services: "Search, models and tools" }),
  nodes: [
    // Clients and edge
    card("employee", "Employee", "web, Slack, Teams", "users", C.clients, ROW.c2, 1, { tone: GENAI_TONE.user }),
    card("gateway", "API gateway", "SSO, status, SSE", "gateway", C.edge, ROW.c2, 1),

    // Assistant orchestration
    card("router", "Router", "path + tool bundle", "router", C.left, ROW.c1, 5, { tone: GENAI_TONE.rank }),
    {
      id: "orch",
      label: "Orchestrator",
      sub: "runs each turn",
      icon: "coordinator",
      accent: true,
      x: C.left,
      y: ROW.c2,
      w: W,
      h: CH,
      step: 1,
    },
    card("agent", "Agent loop", `${AGENT.caps.calls} calls, ${AGENT.caps.seconds} s cap`, "robot", C.left, ROW.c3, 6, {
      tone: GENAI_TONE.model,
    }),
    card("guards", "Guards", "injection, egress", "shield", C.right, ROW.c1, 8, { tone: GENAI_TONE.check }),
    card("retrieval", "Retrieval", "hybrid search", "search", C.right, ROW.c2, 2, { tone: GENAI_TONE.data }),
    card("toolgw", "Tool gateway", "audience, cards", "policy", C.right, ROW.c3, 5, { tone: GENAI_TONE.tool }),

    // Search, models and tools
    card("broker", "Token broker", "delegated tokens", "key", C.left, ROW.s1, 5, { tone: GENAI_TONE.check }),
    card("tools", "Connector tools", `${TOOLS.count} tools, MCP`, undefined, C.left, ROW.s2, 5, {
      tone: GENAI_TONE.tool,
    }),
    card("model", "Answer model", "mid-size, cited", "model", C.left, ROW.s3, 1, { tone: GENAI_TONE.model }),
    card("toolsearch", "Tool search", "agent only", "radar", C.right, ROW.s1, 6, { tone: GENAI_TONE.tool }),
    card(
      "rankers",
      "Rankers",
      `${unique.chunks} → ${personal.chunks} → ${cross.chunks}`,
      "reranker",
      C.right,
      ROW.s2,
      2,
      {
        tone: GENAI_TONE.rank,
      }
    ),
    card("live", "Live search", "Slack and mail", "chat", C.right, ROW.s3, 3, { tone: GENAI_TONE.tool }),

    // Offline pipelines
    card("eval", "Evaluation", "permission suite, canaries", "chart", C.async, 118, 8, {
      w: AW,
      h: 44,
      tone: GENAI_TONE.check,
    }),
    card("connectors", "Connectors", "5 sources, Entra ids", "pipeline", C.async, 297, 2, {
      w: AW,
      h: 50,
      tone: GENAI_TONE.data,
    }),
    card(
      "permsync",
      "Permission sync",
      `events ≈ ${Math.round(PROPAGATION.eventP50)} s, polls`,
      "webhook",
      C.async,
      430,
      4,
      {
        w: AW,
        h: 50,
        tone: GENAI_TONE.data,
      }
    ),

    // Data and state
    store("audit", "Audit, traces", "ids 365 days", "trace", Y.audit, 8),
    store("index", "Search index", `${millions(SOURCES.chunks)} chunks`, "vector-index", Y.index, 2),
    store("acl", "ACL store", "grants, principals", "lock", Y.acl, 3),
    store("memory", "Memory", "visible, editable", "history", Y.memory, 7),
  ],
  edges,
};

export default spec;
