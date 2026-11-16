// Constants and builders used only by the multi-agent figures (multi-agent-systems.mdx and, for context-isolation,
// context-engineering later). Shared names and numbers (the Brightpost task, the tools, the legend, TILE_NODE) come
// from ./agents; this file adds the team version of the Brightpost refund, a research question for the
// orchestrator-workers figure, the token counts for context isolation, Anthropic's measured token multipliers and the
// four topology tiles.

import type { LayoutShape } from "../types";
import { AGENT_TONE, TILE_NODE, TOOLS } from "./agents";

type Point = [number, number];

// ── Orchestrator-workers: a research question inside Brightpost ─────────────────────────────────────────────────

/**
 * The research task the lead agent splits: a question from Brightpost's support manager that needs three sources
 * read at once. Labels only, no numbers. The help-centre worker uses search_help, the same tool as the refund agent.
 */
export const RESEARCH = {
  asker: "Support manager",
  question: "Why are kettle refunds up this month?",
  workers: [
    { id: "w1", label: "Refund records", sub: "orders and refunds" },
    { id: "w2", label: "Help centre", sub: TOOLS.searchHelp.name },
    { id: "w3", label: "Customer reviews", sub: "review text" },
  ],
  /** What the reviewer sends back on the first draft. */
  gap: "1 claim unsourced",
} as const;

// ── Hand-offs: the Brightpost refund handled by a team ──────────────────────────────────────────────────────────────

/**
 * The team version of running example A. Triage reads the message and hands off to the orders agent, which checks
 * the order and hands off to the refunds agent, which owns the refund rule, the refund and the email. A hand-off is a
 * tool call the harness intercepts (OpenAI Agents SDK names them `transfer_to_<agent>`).
 */
export const TEAM = {
  triage: { label: "Triage agent", tools: [] as readonly string[] },
  orders: { label: "Orders agent", tools: [TOOLS.getOrder.name] },
  refunds: {
    label: "Refunds agent",
    tools: [TOOLS.searchHelp.name, TOOLS.createRefund.name, TOOLS.sendEmail.name],
  },
  handoffToOrders: "transfer_to_orders_agent",
  handoffToRefunds: "transfer_to_refunds_agent",
  intent: "damaged-item refund",
} as const;

// Model calls for the team refund (the worked example's table): triage 1 (reads the message, calls
// transfer_to_orders_agent); orders 2 (get_order, transfer_to_refunds_agent); refunds 4 (search_help, create_refund with
// the approval pause, send_email, the reply). Team 1 + 2 + 4 = 7 model calls and 6 tool calls (2 of them hand-offs),
// against HAPPY_PATH's 5 calls and 4 tool calls for one agent: 7 / 5 = 1.4 times the calls.

// ── Context isolation: illustrative token counts ────────────────────────────────────────────────────────────────

/**
 * Three sub-agents each fill their own 200,000-token window, then return a 1,500-token summary. Illustrative counts.
 * Sub-agent windows: 2,000 + 1,000 + results + 12,000 history, with results 60,000 / 48,000 / 70,000, so 75,000,
 * 63,000 and 85,000 tokens: 223,000 together, more than one 200,000-token window could hold. The lead reads
 * 3,000 + 500 + 3 × 1,500 = 8,000 tokens.
 */
export const ISOLATION = {
  window: 200_000,
  sub: { instructions: 2_000, task: 1_000, history: 12_000 },
  results: [60_000, 48_000, 70_000],
  summary: 1_500,
  lead: { instructions: 3_000, task: 500 },
} as const;

/** Tokens in sub-agent i's window. */
const subTokens = (i: number) =>
  ISOLATION.sub.instructions + ISOLATION.sub.task + ISOLATION.sub.history + ISOLATION.results[i];

/** 223,000: what one agent doing all three jobs would have had to hold. */
export const ISOLATION_TOTAL = ISOLATION.results.reduce((s, _, i) => s + subTokens(i), 0);

/** 8,000: what the lead reads. */
export const LEAD_TOKENS =
  ISOLATION.lead.instructions + ISOLATION.lead.task + ISOLATION.results.length * ISOLATION.summary;

// ── Token multipliers (measured) ────────────────────────────────────────────────────────────────────────────────

/**
 * Anthropic, "How we built our multi-agent research system" (13 June 2025): "agents typically use about 4× more
 * tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats". The same post: a
 * multi-agent system (Claude Opus 4 lead, Claude Sonnet 4 subagents) "outperformed single-agent Claude Opus 4 by
 * 90.2%" on Anthropic's internal research eval, and token usage alone explained 80 % of the variance on BrowseComp.
 */
export const TOKEN_MULTIPLIER = {
  chat: 1,
  agent: 4,
  multiAgent: 15,
  gainPct: 90.2,
  tokenVariancePct: 80,
  source: "Anthropic, June 2025",
} as const;

// ── Topology tiles ───────────────────────────────────────────────────────────────────────────────────────────────

/** The four ways to wire agents together on this page. */
type Topology = "supervisor" | "pipeline" | "peers" | "hierarchy";

interface TopoNode {
  key: string;
  label: string;
  /** Centre x, as an offset from the tile's centre line. */
  dx: number;
  /** Row 0, 1 or 2. */
  row: number;
  /** A coordinating agent: pastel. Workers and peers are soft. */
  lead?: boolean;
}

interface TopoEdge {
  from: string;
  to: string;
  /** Two-way talk: a plain line with no arrowhead. */
  both?: boolean;
}

const TOPOLOGIES: Record<Topology, { title: string; note: string; nodes: TopoNode[]; edges: TopoEdge[] }> = {
  supervisor: {
    title: "Supervisor",
    note: "one agent delegates and merges",
    nodes: [
      { key: "sup", label: "Supervisor", dx: 0, row: 0, lead: true },
      { key: "a", label: "Orders\nagent", dx: -136, row: 2 },
      { key: "b", label: "Refunds\nagent", dx: 0, row: 2 },
      { key: "c", label: "Email\nagent", dx: 136, row: 2 },
    ],
    edges: [
      { from: "sup", to: "a" },
      { from: "sup", to: "b" },
      { from: "sup", to: "c" },
    ],
  },
  pipeline: {
    title: "Pipeline",
    note: "a fixed order; each hands on",
    nodes: [
      { key: "a", label: "Triage\nagent", dx: -142, row: 1 },
      { key: "b", label: "Orders\nagent", dx: 0, row: 1 },
      { key: "c", label: "Refunds\nagent", dx: 142, row: 1 },
    ],
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ],
  },
  peers: {
    title: "Peers",
    note: "agents talk directly; no boss",
    nodes: [
      { key: "a", label: "Drafter", dx: 0, row: 0 },
      { key: "b", label: "Critic", dx: -120, row: 2 },
      { key: "c", label: "Fact-checker", dx: 120, row: 2 },
    ],
    edges: [
      { from: "a", to: "b", both: true },
      { from: "a", to: "c", both: true },
      { from: "b", to: "c", both: true },
    ],
  },
  hierarchy: {
    title: "Hierarchy",
    note: "supervisors of supervisors",
    nodes: [
      { key: "top", label: "Lead", dx: 0, row: 0, lead: true },
      { key: "l1", label: "Research\nlead", dx: -86, row: 1, lead: true },
      { key: "l2", label: "Writing\nlead", dx: 86, row: 1, lead: true },
      { key: "w1", label: "Searcher", dx: -136, row: 2 },
      { key: "w2", label: "Searcher", dx: 0, row: 2 },
      { key: "w3", label: "Writer", dx: 136, row: 2 },
    ],
    edges: [
      { from: "top", to: "l1" },
      { from: "top", to: "l2" },
      { from: "l1", to: "w1" },
      { from: "l1", to: "w2" },
      { from: "l2", to: "w3" },
    ],
  },
};

/** Width and height of every topology tile. */
export const TOPO_TILE = { w: 430, h: 276 } as const;
const ROW_Y = [40, 118, 196] as const;

/**
 * One topology as a small diagram, top-left at (x, y), in a TOPO_TILE box: a title at the top, agents as TILE_NODE
 * boxes (the pattern tiles' size) on three rows, and a one-line note at the bottom. Coordinating agents are pastel
 * green, workers and peers soft green; one-way arrows delegate, plain lines are two-way talk. Ids `<id>-<key>`,
 * `<id>-e<i>`, `<id>-title`, `<id>-note`.
 */
export function topologyTile(id: string, kind: Topology, x = 0, y = 0): LayoutShape[] {
  const t = TOPOLOGIES[kind];
  const { w, h } = TILE_NODE;
  const cx = x + TOPO_TILE.w / 2;
  const out: LayoutShape[] = [
    {
      id: `${id}-title`,
      type: "text",
      x: cx - 90,
      y: y + 8,
      w: 180,
      h: 22,
      label: t.title,
      tone: AGENT_TONE.infra,
    },
  ];
  const centre = new Map<string, Point>();
  for (const n of t.nodes) {
    const nx = cx + n.dx - w / 2;
    const ny = y + ROW_Y[n.row];
    centre.set(n.key, [nx + w / 2, ny + h / 2]);
    out.push({
      id: `${id}-${n.key}`,
      type: "box",
      x: nx,
      y: ny,
      w,
      h,
      label: n.label,
      tone: AGENT_TONE.model,
      fill: n.lead ? "pastel" : "soft",
    });
  }
  t.edges.forEach((e, i) => {
    out.push({
      id: `${id}-e${i}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `${id}-${e.from}`,
      to: `${id}-${e.to}`,
      head: e.both ? false : undefined,
    });
  });
  const nw = Math.ceil(t.note.length * 6.8) + 8;
  out.push({
    id: `${id}-note`,
    type: "text",
    x: Math.round(cx - nw / 2),
    y: y + ROW_Y[2] + h + 10,
    w: nw,
    h: 18,
    label: t.note,
    tone: AGENT_TONE.infra,
  });
  return out;
}
