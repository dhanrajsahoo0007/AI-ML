import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { contextBar, type ContextSegment } from "@/components/diagrams/presets/agents";
import { TOOLS } from "@/components/diagrams/presets/gcase-enterprise";
import { fmt } from "@/components/diagrams/presets/rag";

// Deep dive 2 of the enterprise assistant (design sheet §15.2): three ways to give the model 106 tools over nine
// systems, as prompt prefixes on one token scale. Every number is TOOLS in presets/gcase-enterprise.ts (≈ 600 tokens a
// definition, illustrative):
//   stable part = instructions 1,200 + tool-use system prompt 286 + core tools 2,000 = TOOLS.stable 3,486.
//   All loaded: 3,486 + 106 × 600 = TOOLS.allLoaded 67,086 (cached it costs TOOLS.allLoadedCachedUsd ≈ 0.0067 USD a
//     call, so the reasons against it are tool choice past 30–50 tools, context rot and per-user lists breaking the
//     cache, not price).
//   One entitlement-class bundle (routed lookups and writes): 3,486 + 106 ÷ 9 × 600 (TOOLS.bundleTokens 7,067)
//     = TOOLS.bundlePrefix 10,553; TOOLS.variants = 31 prefixes (classes × connectors), never per user.
//   Tool search (agent only): 3,486 + the search tool 500 = TOOLS.searchPrefix 3,986, + 3 definitions (1,800) loaded per
//     search → TOOLS.searchTask 7,586 for a two-search task, TOOLS.searchSaving ≈ 89% fewer than all loaded.
//   Vendor savings (85% for tool search, 98.7% for code execution with MCP) are single reported examples (F51, F55);
//   code execution over MCP is not used here (a sandbox with private data and an outbound channel).
// Steps: 1 all 106 loaded · 2 one bundle for routed turns · 3 tool search in the agent.
// Layout (880 wide): three contextBar() rows from presets/agents.ts at x 30 on one scale, 800 px for 67,086 tokens
// (0.0119 px a token); a heading over each bar, the total and its use to the right of the two short bars, labels of
// narrow blocks below.
// Colours (the agents context legend): the stable part neutral, tool definitions teal, definitions loaded by a search
// blue (results).

const X = 30;
const W = 800;
const BAR_H = 40;
const pxPerToken = W / TOOLS.allLoaded;
const wOf = (tokens: number) => Math.round(tokens * pxPerToken);
const searchTool = TOOLS.searchPrefix - TOOLS.stable; // 500

const all: ContextSegment[] = [
  { kind: "instructions", label: "Stable", tokens: TOOLS.stable, step: 1 },
  { kind: "tools", label: `${TOOLS.count} tool definitions`, tokens: TOOLS.count * TOOLS.tokensPerTool, step: 1 },
];
const bundle: ContextSegment[] = [
  { kind: "instructions", label: "Stable", tokens: TOOLS.stable, step: 2 },
  { kind: "tools", label: "One connector", tokens: TOOLS.bundleTokens, step: 2 },
];
const search: ContextSegment[] = [
  { kind: "instructions", label: "Stable", tokens: TOOLS.stable, step: 3 },
  { kind: "tools", label: "tool_search", tokens: searchTool, step: 3 },
  { kind: "results", label: "Search 1", tokens: TOOLS.loadedPerSearch, step: 3 },
  { kind: "results", label: "Search 2", tokens: TOOLS.loadedPerSearch, step: 3 },
];

const H1 = 6;
const Y1 = H1 + 28;
const b1 = contextBar("all", X, Y1, all, { total: TOOLS.allLoaded, w: W, h: BAR_H, free: false });
const N1 = Y1 + b1.height + 8;
const H2 = N1 + 40;
const Y2 = H2 + 28;
const b2 = contextBar("bundle", X, Y2, bundle, {
  total: TOOLS.bundlePrefix,
  w: wOf(TOOLS.bundlePrefix),
  h: BAR_H,
  free: false,
});
const H3 = Y2 + b2.height + 30;
const Y3 = H3 + 28;
const b3 = contextBar("search", X, Y3, search, {
  total: TOOLS.searchTask,
  w: wOf(TOOLS.searchTask),
  h: BAR_H,
  free: false,
});
const FOOT = Y3 + b3.height + 18;

const text = (id: string, x: number, y: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label,
  tone: "neutral",
  step,
});
/** A total written to the right of a short bar, left-aligned by giving the text box its own width. */
const right = (id: string, barW: number, y: number, label: string, step: number) => {
  const w = Math.ceil(label.length * 6.6) + 8;
  return text(id, X + barW + 16, y + (BAR_H - 20) / 2, w, label, step);
};
/** One ring a step: the tool definitions of each bar (the first search's block in step 3); the rest are quiet. */
const QUIET = ["all-0", "bundle-0", "search-0", "search-1", "search-3"];
const pct = (v: number) => `${Math.round(v * 100)}%`;

const spec: LayoutSpec = {
  kind: "layout",
  title: `Tools against context bloat: ${fmt(TOOLS.allLoaded)} tokens with all ${TOOLS.count} tools, ${fmt(TOOLS.bundlePrefix)} with one bundle, ${fmt(TOOLS.searchTask)} with tool search`,
  width: 880,
  height: FOOT + 2 * 22 + 6,
  steps: [
    { title: `All ${TOOLS.count} tools loaded: ${fmt(TOOLS.allLoaded)} tokens on every call` },
    { title: `One entitlement-class bundle for routed turns: ${fmt(TOOLS.bundlePrefix)} tokens` },
    { title: `Tool search in the agent: ${fmt(TOOLS.searchTask)} tokens for a two-search task` },
  ],
  shapes: [
    text("h1", X, H1, W, `All ${TOOLS.count} tools loaded on every call: ${fmt(TOOLS.allLoaded)} tokens`, 1),
    ...b1.shapes,
    text(
      "n1",
      X,
      N1,
      W,
      `Cached it is only ≈ ${TOOLS.allLoadedCachedUsd.toFixed(4)} USD a call; the cost is tool choice past 30–50 tools and a crowded context.`,
      1
    ),
    text("h2", X, H2, W, "One entitlement-class bundle: routed lookups and writes (23% of turns)", 2),
    ...b2.shapes,
    right(
      "t2",
      wOf(TOOLS.bundlePrefix),
      Y2,
      `${fmt(TOOLS.bundlePrefix)} tokens · ${TOOLS.variants} shared prefixes · ${pct(1 - TOOLS.bundlePrefix / TOOLS.allLoaded)} fewer`,
      2
    ),
    text("h3", X, H3, W, "Tool search: the agent only (5% of turns), over the user's entitled tools", 3),
    ...b3.shapes,
    right(
      "t3",
      wOf(TOOLS.searchTask),
      Y3,
      `${fmt(TOOLS.searchPrefix)} + ${fmt(TOOLS.loadedPerSearch)} a search = ${fmt(TOOLS.searchTask)} · ${pct(TOOLS.searchSaving)} fewer`,
      3
    ),
    text(
      "f1",
      X,
      FOOT,
      W,
      "Definitions are pinned by hash and re-tested on change. Each search adds a model step, so routed turns use bundles.",
      3
    ),
    text(
      "f2",
      X,
      FOOT + 22,
      W,
      "Vendors report 85% (tool search) and 98.7% (code execution with MCP) savings, each from one example setup.",
      3
    ),
  ].map((sh): LayoutShape => (sh.type === "text" || QUIET.includes(sh.id) ? { ...sh, quiet: true } : sh)),
};

export default spec;
