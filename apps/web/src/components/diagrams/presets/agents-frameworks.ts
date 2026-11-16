// Constants and builders used only by the agent-frameworks-compared figures (assets/diagrams/animated/agents/
// framework-styles and what-a-framework-gives). Shared names and numbers (the Brightpost task, the tools, the legend,
// TILE_NODE) come from ./agents; this file adds the three framework-style tiles and the parts a framework gives you.
//
// Framework facts behind the tiles were checked against each project's documentation on 2026-11-16: graph-based
// (LangGraph, Microsoft Agent Framework workflows, Google ADK 2.0 graph workflows), role-based (CrewAI crews: agents
// with a role and a goal, a hierarchical process with a manager model, `human_input` on a task reviews its final
// answer), loop-based (OpenAI Agents SDK, Claude Agent SDK, ADK LLM agents: the model picks each step and a tool can be
// marked as needing approval).

import type { LayoutShape, LayoutTone } from "../types";
import { AGENT_TONE, BRIGHTPOST, TILE_NODE, TOOLS } from "./agents";

type Point = [number, number];

// ── Framework styles: three tiles in the pattern-tile look ───────────────────────────────────────────────────────

export type FrameworkStyle = "graph" | "role" | "loop";

/** What a node is: the task, a model call, an agent, a check, plain code, a tool, a person or the output. */
type NodeKind = "in" | "llm" | "agent" | "check" | "code" | "tool" | "human" | "out";

const NODE_STYLE: Record<NodeKind, { tone: LayoutTone; fill: LayoutShape["fill"] }> = {
  in: { tone: AGENT_TONE.task, fill: "pastel" },
  llm: { tone: AGENT_TONE.model, fill: "pastel" },
  agent: { tone: AGENT_TONE.model, fill: "soft" },
  check: { tone: AGENT_TONE.check, fill: "pastel" },
  code: { tone: AGENT_TONE.infra, fill: "soft" },
  tool: { tone: AGENT_TONE.action, fill: "pastel" },
  human: { tone: AGENT_TONE.task, fill: "paper" },
  out: { tone: AGENT_TONE.model, fill: "paper" },
};

interface StyleNode {
  key: string;
  kind: NodeKind;
  label: string;
  sub?: string;
  col: number;
  /** Row offset from the middle row, in rows (−0.5 above, +1 below). */
  row?: number;
}

interface StyleEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** No arrowhead: the two boxes wait on each other. */
  plain?: boolean;
  /** Route under the row (a branch that skips a node) or over it (a loop back). */
  route?: "under" | "over";
}

interface StyleTile {
  title: string;
  /** Example frameworks, as of November 2026. */
  examples: string;
  nodes: StyleNode[];
  edges: StyleEdge[];
  /** Gap after each column (the last entry repeats). */
  gaps: number[];
  /** What you write, in one line under the diagram. */
  note: string;
}

const LIMIT = BRIGHTPOST.approvalLimit;

/** The Brightpost refund, built three ways. */
const STYLES: Record<FrameworkStyle, StyleTile> = {
  graph: {
    title: "Graph-based",
    examples: "LangGraph,\nAgent Framework,\nADK graph workflows",
    nodes: [
      { key: "in", kind: "in", label: "Customer\nmessage", col: 0 },
      { key: "read", kind: "llm", label: "Read the\nrequest", col: 1 },
      { key: "check", kind: "check", label: `Over £${LIMIT}?`, col: 2 },
      { key: "approve", kind: "human", label: "Approve\nnode", col: 3 },
      { key: "refund", kind: "code", label: `${TOOLS.createRefund.name}\nnode`, col: 4 },
    ],
    edges: [
      { from: "in", to: "read" },
      { from: "read", to: "check" },
      { from: "check", to: "approve", label: "yes" },
      { from: "approve", to: "refund" },
      { from: "check", to: "refund", label: "no", route: "under" },
    ],
    gaps: [40],
    note: `You write every node and edge. The £${LIMIT} rule is an edge in code.`,
  },
  role: {
    title: "Role-based",
    examples: "CrewAI crews",
    nodes: [
      { key: "in", kind: "in", label: `Refund for\norder ${BRIGHTPOST.orderId}`, col: 0 },
      { key: "manager", kind: "llm", label: "Manager\nagent", col: 1 },
      { key: "orders", kind: "agent", label: "Orders agent", sub: "role, goal", col: 2, row: -0.55 },
      { key: "refunds", kind: "agent", label: "Refunds agent", sub: "role, goal", col: 2, row: 0.55 },
      { key: "review", kind: "human", label: "Review the\nanswer", col: 3 },
      { key: "out", kind: "out", label: "Crew\nresult", col: 4 },
    ],
    edges: [
      { from: "in", to: "manager" },
      { from: "manager", to: "orders" },
      { from: "manager", to: "refunds" },
      { from: "orders", to: "review" },
      { from: "refunds", to: "review" },
      { from: "review", to: "out" },
    ],
    gaps: [40],
    note: "You write roles, goals and tasks. A manager model hands out the work.",
  },
  loop: {
    title: "Loop-based",
    examples: "OpenAI Agents SDK,\nClaude Agent SDK,\nADK LLM agents",
    nodes: [
      { key: "in", kind: "in", label: "Customer\nmessage", col: 0 },
      { key: "model", kind: "llm", label: "Model", sub: "picks each step", col: 1 },
      { key: "tools", kind: "tool", label: "Run the tool", sub: "4 tools", col: 2 },
      { key: "approve", kind: "human", label: "Approve", sub: `refund > £${LIMIT}`, col: 3 },
      { key: "reply", kind: "out", label: "Reply", col: 1, row: 1.45 },
    ],
    edges: [
      { from: "in", to: "model" },
      { from: "model", to: "tools", label: "tool call" },
      { from: "tools", to: "model", label: "result", dashed: true, route: "over" },
      { from: "tools", to: "approve", label: "waits", dashed: true, plain: true },
      { from: "model", to: "reply", label: "no call" },
    ],
    gaps: [40, 96, 96],
    note: "You write tools and settings. The model decides the path at run time.",
  },
};

/** Left column of each tile: the style's name and example frameworks. */
export const STYLE_LABEL_W = 144;
/** Where the diagram part of a tile starts. */
const DIAGRAM_X = STYLE_LABEL_W + 10;
const ROW_STEP = TILE_NODE.h + 18;
const ROUTE = 22;

const round = (n: number) => Math.round(n);

/**
 * One framework style as a strip, top-left at (x, y): the style's name and example frameworks on the left, then the
 * Brightpost refund drawn in that style with TILE_NODE boxes (the pattern tiles' size), then one line saying what you
 * write. Ids `<id>-<node key>`, `<id>-e<i>`, `<id>-title`, `<id>-examples`, `<id>-note`. Returns the shapes and the
 * strip's height.
 */
export function frameworkStyleTile(
  id: string,
  kind: FrameworkStyle,
  x = 0,
  y = 0,
  opts: { step?: number } = {}
): { shapes: LayoutShape[]; height: number } {
  const t = STYLES[kind];
  const { w, h } = TILE_NODE;
  const step = opts.step;
  const cols = Math.max(...t.nodes.map((n) => n.col)) + 1;
  const gapAt = (c: number) => t.gaps[Math.min(c, t.gaps.length - 1)];
  const colX = Array.from({ length: cols }, (_, c) =>
    Array.from({ length: c }, (_, i) => w + gapAt(i)).reduce((s, v) => s + v, x + DIAGRAM_X)
  );
  const hasOver = t.edges.some((e) => e.route === "over");
  const hasUnder = t.edges.some((e) => e.route === "under");
  const above = Math.max(0, ...t.nodes.map((n) => -(n.row ?? 0)));
  const midY = y + 8 + (hasOver ? ROUTE + 12 : 0) + above * ROW_STEP;
  const pos = (n: StyleNode): Point => [colX[n.col], round(midY + (n.row ?? 0) * ROW_STEP)];
  const byKey = new Map(t.nodes.map((n) => [n.key, n]));

  const shapes: LayoutShape[] = [];
  for (const n of t.nodes) {
    const [nx, ny] = pos(n);
    shapes.push({
      id: `${id}-${n.key}`,
      type: "box",
      x: nx,
      y: ny,
      w,
      h,
      label: n.label,
      sub: n.sub,
      tone: NODE_STYLE[n.kind].tone,
      fill: NODE_STYLE[n.kind].fill,
      step,
    });
  }
  t.edges.forEach((e, i) => {
    let via: Point[] | undefined;
    if (e.route) {
      const [fx, fy] = pos(byKey.get(e.from)!);
      const [tx] = pos(byKey.get(e.to)!);
      const yy = e.route === "under" ? fy + h + ROUTE : fy - ROUTE;
      via = [
        [fx + w / 2, yy],
        [tx + w / 2, yy],
      ];
    }
    shapes.push({
      id: `${id}-e${i}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `${id}-${e.from}`,
      to: `${id}-${e.to}`,
      label: e.label,
      dashed: e.dashed,
      head: e.plain ? false : undefined,
      via,
      step,
    });
  });

  const below = Math.max(0, ...t.nodes.map((n) => n.row ?? 0));
  let bottom = midY + below * ROW_STEP + h + (hasUnder ? ROUTE + 12 : 0);
  const top = y + 8;
  const labelH = 78;
  const labelY = round((top + bottom) / 2 - labelH / 2);
  shapes.push(
    {
      id: `${id}-title`,
      type: "text",
      x,
      y: labelY,
      w: STYLE_LABEL_W,
      h: 22,
      label: t.title,
      tone: AGENT_TONE.infra,
      step,
    },
    {
      id: `${id}-examples`,
      type: "text",
      x,
      y: labelY + 24,
      w: STYLE_LABEL_W,
      h: 54,
      label: t.examples,
      tone: AGENT_TONE.infra,
      step,
    }
  );
  const nw = Math.ceil(t.note.length * 6.8) + 8;
  shapes.push({
    id: `${id}-note`,
    type: "text",
    x: x + DIAGRAM_X,
    y: bottom + 8,
    w: nw,
    h: 18,
    label: t.note,
    tone: AGENT_TONE.infra,
    step,
  });
  bottom += 8 + 18;
  return { shapes, height: Math.ceil(bottom + 8 - y) };
}
