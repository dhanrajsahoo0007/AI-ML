import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { DISCOVERY } from "@/components/diagrams/presets/agents-disclosure";

// Tool discovery on progressive-disclosure-and-agent-instructions (Core concepts, "Dynamic tool discovery vs. loading
// 100 tool schemas"): the coding agent (running example B) connected to the five MCP servers that Anthropic measured
// (OVERLOAD via DISCOVERY: 58 tools, 55,000 tokens). Up front, every definition sits in the window on every call. Behind
// tool search, the definitions are still sent with the request but kept out of the window; the model searches with a
// regex, the API returns three tool references, and only those three definitions load. Mechanism as in the Claude tool
// search tool docs (checked 2026-11-15); the MCP page's tool-overload figure shows the same servers as token bars.
//
// Four steps: 1 every definition up front · 2 deferred: only the agent's own tools and the search tool load · 3 the
// model searches, three references come back · 4 three definitions load, with the totals.
//
// Layout: a label column (x 20, 140 wide). Row A at y 44: four boxes, the agent's own tools and the servers. Row B
// from y 140: column headings, then three columns: the window (x 172, 200 wide), the search (x 448, 172 wide: the call,
// then the references under it), the definitions sent but not loaded (x 680, 160 wide, five server boxes 32 high).
//
// Colour (agents legend, two tones plus neutral): tools and the search call teal (outlines when not in the window),
// the returned references blue (the one highlight). Text neutral.

const fmt = (n: number) => n.toLocaleString("en-GB");
const tok = (n: number) => `${fmt(n)} tokens`;
const COL = { win: { x: 172, w: 200 }, mid: { x: 448, w: 172 }, sent: { x: 680, w: 160 } } as const;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  fill: "paper" | "pastel",
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill, step, ...extra });

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: AGENT_TONE.infra,
  step,
});

const arrow = (id: string, from: string, to: string, step: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
});

const [github, slack, ...rest] = DISCOVERY.servers;
const restTools = rest.reduce((s, x) => s + x.tools, 0);
const restTokens = rest.reduce((s, x) => s + x.tokens, 0);
const upFront = DISCOVERY.own + DISCOVERY.allTokens;
const withSearch = DISCOVERY.own + DISCOVERY.foundTokens;
const SENT_Y = [168, 206, 244, 282, 320] as const;
const LOADED_Y = [224, 268, 312] as const;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Tool discovery: every definition up front against a search that loads three",
  width: 860,
  height: 428,
  steps: [
    { title: `Up front: ${DISCOVERY.allTools + 4} definitions in every call, ${tok(upFront)}` },
    { title: "Deferred: sent with the request, kept out of the window" },
    { title: `The model searches; ${DISCOVERY.found.length} references come back` },
    { title: `${DISCOVERY.found.length} definitions load: ${tok(withSearch)} in the window` },
  ],
  shapes: [
    // Step 1: row A, every definition in the window.
    text("l-a", 20, 44, 140, 48, "Up front", 1),
    box("a-own", 172, 44, 144, 48, "4 own tools", tok(DISCOVERY.own), AGENT_TONE.action, "pastel", 1),
    box(
      "a-gh",
      332,
      44,
      164,
      48,
      `${github.name} · ${github.tools} tools`,
      tok(github.tokens),
      AGENT_TONE.action,
      "pastel",
      1
    ),
    box(
      "a-sl",
      512,
      44,
      150,
      48,
      `${slack.name} · ${slack.tools} tools`,
      tok(slack.tokens),
      AGENT_TONE.action,
      "pastel",
      1
    ),
    box(
      "a-rest",
      678,
      44,
      162,
      48,
      `${rest[0].name} + ${rest.length - 1} more`,
      `${restTools} tools · ${tok(restTokens)}`,
      AGENT_TONE.action,
      "pastel",
      1
    ),
    text(
      "a-total",
      172,
      98,
      668,
      22,
      `All in the window on every call: ${tok(upFront)}. Server sizes: Anthropic, Nov 2025.`,
      1
    ),

    // Step 2: row B, the same definitions deferred.
    text("l-b", 20, 168, 140, 60, "Behind\ntool search", 2),
    text("h-win", COL.win.x, 140, COL.win.w, 22, "In the window", 2),
    text("h-mid", COL.mid.x, 140, COL.mid.w, 22, "The search", 2),
    text("h-sent", COL.sent.x, 140, COL.sent.w, 22, "Sent, not loaded", 2),
    box(
      "b-own",
      COL.win.x,
      168,
      COL.win.w,
      44,
      "4 own tools + search",
      tok(DISCOVERY.own),
      AGENT_TONE.action,
      "pastel",
      2
    ),
    ...DISCOVERY.servers.map((s, i) =>
      box(
        `b-s${i}`,
        COL.sent.x,
        SENT_Y[i],
        COL.sent.w,
        32,
        `${s.name} · ${s.tools} tools`,
        undefined,
        AGENT_TONE.action,
        "paper",
        2
      )
    ),

    // Step 3: the model writes a regex; the API searches names, descriptions and arguments.
    box(
      "m-search",
      COL.mid.x,
      168,
      COL.mid.w,
      44,
      "Regex tool search",
      DISCOVERY.pattern,
      AGENT_TONE.action,
      "pastel",
      3
    ),
    arrow("s-1", "m-search", "b-s0", 3),
    box(
      "m-refs",
      COL.mid.x,
      246,
      COL.mid.w,
      44,
      `${DISCOVERY.found.length} tool references`,
      "names only",
      AGENT_TONE.result,
      "pastel",
      3,
      { highlight: true }
    ),
    arrow("s-2", "m-search", "m-refs", 3),

    // Step 4: the API expands the references into full definitions.
    ...DISCOVERY.found.map((name, i) =>
      box(`b-f${i}`, COL.win.x, LOADED_Y[i], COL.win.w, 36, name, undefined, AGENT_TONE.action, "pastel", 4)
    ),
    arrow("s-3", "m-refs", "b-f1", 4),
    text(
      "b-total",
      20,
      372,
      820,
      40,
      `In the window: ${fmt(DISCOVERY.own)} + ${DISCOVERY.found.length} × ${fmt(DISCOVERY.perTool)} = ${tok(withSearch)}, ` +
        `against ${tok(upFront)}.\nPer-tool size is GitHub's average (illustrative); a search returns up to 5 by default.`,
      4
    ),
  ],
};

export default spec;
