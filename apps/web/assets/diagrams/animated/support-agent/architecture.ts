import type { DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { GENAI_TONE, HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { REFUNDS, RETRIEVAL } from "@/components/diagrams/presets/gcase-support";
import { fmt } from "@/components/diagrams/presets/rag";

// Brightpost's customer support agent (genai-system-design/case-studies/customer-support-agent), the hero. Built one
// requirement at a time, exactly as the design sheet §8 lists it (SYSTEM-DESIGN/plans/genai-design/design/
// customer-support-agent.md):
//   1 One model call (F1): customer → chat gateway → orchestrator → LLM gateway → agent model.
//   2 Ground answers in the help centre (F1): retriever and reranker (top 40 of 3,600 chunks), help index, help-centre
//     sync.
//   3 Route each message to a procedure (F2): intent router.
//   4 Verify, then read orders as the customer (F3): order tools, the shop's external orders and payments APIs (the
//     "Orders and payments" node of the sheet, labelled "Shop APIs" so it fits its card).
//   5 Refunds through a policy service (F4): policy service (auto up to £30), refund ledger, refund workflow, risk
//     signals; the policy pays once along the bottom.
//   6 Check actions and words (F1, F4): checks (bad-actor gate on writes, supervisor on replies).
//   7 Hand over with a summary; one case across channels (F5, F6): helpdesk, support staff, case store.
//   8 Measure resolution and learn (F7): trace store, simulator and evals, outcomes and content gaps.
// Numbers: RETRIEVAL.candidates = 40, RETRIEVAL.chunks = 3,600 (CORPUS.chunks), REFUNDS.autoLimit = £30
// (BRIGHTPOST.approvalLimit), all from presets/gcase-support.ts.
//
// Layout (1200 × 740, genaiZones() from presets/genai-case.ts, the case-study grid):
//   Clients x 105: customer 250 (the main line), support staff 380, shop APIs (orders and payments, external) 605.
//   Edge x 297: chat gateway 250, LLM gateway 495.
//   Orchestration: intent router (490, 135), checks (660, 135), orchestrator (575, 250) 320 wide, the accent.
//   Models, tools and policy: two columns x 490 | 660, rows 380 | 495 | 605:
//            x 490          x 660
//     380    Helpdesk       Retriever
//     495    Agent model    Risk signals
//     605    Order tools    Policy service
//   Offline x 879: simulator 132, outcomes 200 (both 50 tall), help-centre sync 320, refund workflow 455.
//   Data and state x 1098 (glyphs): trace store 135, case store 250, help index 380, refund ledger 605.
// Routing (every long edge checked against the boxes and zone tabs it passes):
//   - The services zone tab spans x 419–625 at y 318–342, so the orchestrator reaches services only through the
//     window right of it: a short shoulder to (660, 300), then down into the retriever.
//   - The orchestrator reaches the LLM gateway through the corridor between the zones (y 300, above the services
//     tab), then down x 297; the gateway feeds the model level at y 495. The model, in the middle row, reaches every
//     tool it asks for: order tools below, helpdesk above, the policy service on the diagonal through the empty
//     middle. (The orchestrator runs each tool call and adds the verified customer id; the page says so.)
//   - Traces go over the top: up between the router and the checks (x 575), along y 88 under the zone tabs, down into
//     the top of the trace store. The case store sits level with the orchestrator (y 250), between the offline nodes.
//   - The payment runs along the bottom (y 705, under every zone) into the foot of the shop APIs.
//   - One crossing is left on purpose: the staff ↔ helpdesk link (dashed, y 380) crosses the LLM gateway's vertical
//     at x 297. Every other placement of the six services nodes loses an edge instead (see NOTES.md).
// Colours: GENAI_TONE roles. Customer and staff orange (user), the agent model green, router and retriever lime
// (ranking), checks, policy, risk, simulator and outcomes lime (check), order tools, helpdesk and the refund workflow
// teal (tool), help-centre sync blue (data), stores violet glyphs; gateways and the orchestrator neutral.

const C = { clients: 105, edge: 297, left: 490, right: 660, async: 879, store: 1098 } as const;
const ROW = { core1: 135, core2: 250, s1: 380, s2: 495, s3: 605 } as const;
const W = 150;
const AW = 190;

const card = (
  id: string,
  label: string,
  sub: string,
  icon: string,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => ({ id, label, sub, icon, x, y, w: W, step, fill: "pastel", ...extra });

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

const spec: DiagramSpec = {
  title: "Customer support agent: procedures, grounded answers, a policy service in code and a way to people",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "One model call", covers: "F1" },
    { title: "Ground answers in the help centre", covers: "F1" },
    { title: "Route each message to a procedure", covers: "F2" },
    { title: "Verify, then read orders as the customer", covers: "F3" },
    { title: "Refunds through a policy service", covers: "F4" },
    { title: "Check actions and words", covers: "F1, F4" },
    { title: "Hand over with a summary; one case across channels", covers: "F5, F6" },
    { title: "Measure resolution and learn", covers: "F7" },
  ],
  zones: genaiZones({ services: "Models, tools and policy" }),
  nodes: [
    // Clients
    card("customer", "Customer", "chat, email", "users", C.clients, ROW.core2, 1, { tone: GENAI_TONE.user }),
    card("staff", "Support staff", "approve, take over", "users", C.clients, ROW.s1, 7, {
      w: 158,
      tone: GENAI_TONE.user,
    }),
    card("orders", "Shop APIs", "orders, payments", "card", C.clients, ROW.s3, 4),

    // Edge and gateway
    card("chatgw", "Chat gateway", "verify, limits, SSE", "gateway", C.edge, ROW.core2, 1),
    card("llmgw", "LLM gateway", "budgets, fallback", "proxy", C.edge, ROW.s2, 1),

    // Orchestration
    card("router", "Intent router", "small model", "router", C.left, ROW.core1, 3, { tone: GENAI_TONE.rank }),
    card("checks", "Checks", "gate, supervisor", "shield", C.right, ROW.core1, 6, { tone: GENAI_TONE.check }),
    {
      id: "orch",
      label: "Orchestrator",
      sub: "procedures, case lease, runs tools",
      icon: "coordinator",
      accent: true,
      x: 575,
      y: ROW.core2,
      w: 320,
      step: 1,
    },

    // Models, tools and policy
    card("helpdesk", "Helpdesk", "staff queue", "ticket", C.left, ROW.s1, 7, { tone: GENAI_TONE.tool }),
    card("model", "Agent model", "mid-size, tool use", "model", C.left, ROW.s2, 1, { w: 154, tone: GENAI_TONE.model }),
    card("tools", "Order tools", "own orders only", "tool", C.left, ROW.s3, 4, { tone: GENAI_TONE.tool }),
    card("retriever", "Retriever", `top ${RETRIEVAL.candidates}, rerank`, "reranker", C.right, ROW.s1, 2, {
      tone: GENAI_TONE.rank,
    }),
    card("risk", "Risk signals", "fraud score", "radar", C.right, ROW.s2, 5, { tone: GENAI_TONE.check }),
    card("policy", "Policy service", `auto up to £${REFUNDS.autoLimit}`, "policy", C.right, ROW.s3, 5, {
      tone: GENAI_TONE.check,
    }),

    // Offline pipelines
    card("sim", "Simulator and evals", "pass^4 gates", "sandbox", C.async, 132, 8, {
      w: AW,
      h: 50,
      tone: GENAI_TONE.check,
    }),
    card("outcomes", "Outcomes", "resolution, content gaps", "chart", C.async, 200, 8, {
      w: AW,
      h: 50,
      tone: GENAI_TONE.check,
    }),
    card("sync", "Help-centre sync", "re-index on edit", "pipeline", C.async, 320, 2, {
      w: AW,
      tone: GENAI_TONE.data,
    }),
    card("workflow", "Refund workflow", "approvals, retries", "timer", C.async, 455, 5, {
      w: AW,
      tone: GENAI_TONE.tool,
    }),

    // Data and state
    store("traces", "Trace store", "every turn", "trace", 135, 8),
    store("cases", "Case store", "case state, lease", "database", ROW.core2, 7),
    store("index", "Help index", `${fmt(RETRIEVAL.chunks)} chunks`, "vector-index", ROW.s1, 2),
    store("ledger", "Refund ledger", "one row per attempt", "ledger", ROW.s3, 5),
  ],
  edges: [
    // Step 1: the main line, packet by packet.
    { from: "customer", to: "chatgw", flow: true, packet: true, bidirectional: true },
    { from: "chatgw", to: "orch", flow: true, packet: true, delay: 0.6 },
    {
      from: "orch",
      to: "llmgw",
      label: "prompt",
      flow: true,
      packet: true,
      delay: 1.2,
      labelAt: 0.35,
      via: [
        [520, 300],
        [C.edge, 300],
      ],
    },
    { from: "llmgw", to: "model", flow: true, packet: true, delay: 1.8, bidirectional: true },

    // Step 2: evidence before the model runs.
    { from: "orch", to: "retriever", bidirectional: true, via: [[C.right, 300]] },
    { from: "index", to: "retriever", label: `top ${RETRIEVAL.candidates}` },
    { from: "sync", to: "index", label: "edits", dashed: true },

    // Step 3: route.
    { from: "orch", to: "router", bidirectional: true },

    // Step 4: read as the verified customer.
    { from: "model", to: "tools", label: "get_order" },
    { from: "tools", to: "orders", label: "orders API", bidirectional: true },

    // Step 5: the model asks; the policy decides and pays once.
    { from: "model", to: "policy", label: "request_refund", labelAt: 0.62 },
    { from: "risk", to: "policy" },
    { from: "policy", to: "ledger", label: "lock, sum, record" },
    { from: "policy", to: "workflow", label: `over £${REFUNDS.autoLimit}`, dashed: true },
    {
      from: "policy",
      to: "orders",
      label: "pay once (ledger key)",
      via: [
        [C.right, 705],
        [C.clients, 705],
      ],
    },

    // Step 6: checks.
    { from: "orch", to: "checks", bidirectional: true },

    // Step 7: people and one case.
    { from: "model", to: "helpdesk", label: "hand-off" },
    { from: "helpdesk", to: "staff", dashed: true, bidirectional: true },
    { from: "orch", to: "cases", label: "case state", bidirectional: true },

    // Step 8: measure and learn.
    {
      from: "orch",
      to: "traces",
      label: "trace every turn",
      dashed: true,
      labelAt: 0.6,
      via: [
        [575, 88],
        [C.store, 88],
      ],
    },
    { from: "traces", to: "sim", label: "failures", dashed: true },
    { from: "traces", to: "outcomes", dashed: true },
  ],
};

export default spec;
