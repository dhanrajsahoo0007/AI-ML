import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { PREFIX, PREFIX_TOTALS } from "@/components/diagrams/presets/agents-disclosure";

// The prefix cache on progressive-disclosure-and-agent-instructions (Deep dive, "Prefix-cache friendliness of static vs.
// dynamic layers"): two consecutive model calls of the coding agent (running example B), laid out in the order the
// Claude API builds its cache prefix: tools, then system, then messages. Call 6 writes the prefix; call 7 reads it and
// pays full price only for what is new. A timestamp edited into the system prompt changes the prefix at that block,
// so everything after it is written again. The same timestamp sent last leaves the prefix whole. Order and
// invalidation as in the Claude prompt caching docs (checked 2026-11-15); counts illustrative (PREFIX).
//
// Four steps, one row each: 1 call 6 writes · 2 call 7 reads 8,000 and adds 1,000 · 3 an early edit: only the tools
// are read, 7,500 written again · 4 the same edit at the end: 8,000 read again.
//
// Layout: a label column (x 20, 150 wide: the call and its cost) and one request bar per row from x 180, drawn to scale
// (0.064 units a token: tools 96, system 128, messages 288, new 64, ending at x 756); the timestamp in row 4 is drawn
// 50 wide, not to scale, and ends at x 806. Rows 100 apart from y 44; under each bar a line for the cached part and one for the part processed in full,
// and a text line that says which is which.
//
// Colour (agents legend, four tones plus neutral, red where the cache breaks): tool definitions teal, the system prompt
// neutral (instructions), messages orange, the new tool call and result blue, the edited system prompt red (the one
// highlight).

const X = 180;
const H = 40;
const SCALE = 0.064;
const ROWS = [44, 144, 244, 344] as const;
const fmt = (n: number) => n.toLocaleString("en-GB");
const messages = PREFIX.task + PREFIX.history;

type Seg = { key: string; label: string; tokens: number; tone: LayoutTone; w?: number; highlight?: boolean };

const segs = (edited: boolean, stamp: boolean): Seg[] => [
  { key: "tools", label: "Tools", tokens: PREFIX.tools, tone: AGENT_TONE.action },
  edited
    ? {
        key: "system",
        label: `System + ${PREFIX.stamp}`,
        tokens: PREFIX.system,
        tone: AGENT_TONE.failure,
        highlight: true,
      }
    : { key: "system", label: "System", tokens: PREFIX.system, tone: AGENT_TONE.infra },
  { key: "msgs", label: "Messages: task + history", tokens: messages, tone: AGENT_TONE.task },
  { key: "new", label: "New", tokens: PREFIX.added, tone: AGENT_TONE.result },
  ...(stamp ? [{ key: "stamp", label: PREFIX.stamp, tokens: 10, tone: AGENT_TONE.task, w: 50 }] : []),
];

/** One request bar: cells side by side, widths to scale unless given. Returns the shapes and each cell's right edge. */
function bar(id: string, y: number, list: Seg[], step: number) {
  let x = X;
  const edges: Record<string, number> = {};
  const shapes: LayoutShape[] = list.map((s) => {
    const w = s.w ?? Math.round(s.tokens * SCALE);
    const cell: LayoutShape = {
      id: `${id}-${s.key}`,
      type: "cell",
      x,
      y,
      w,
      h: H,
      label: s.label,
      sub: s.w ? undefined : fmt(s.tokens),
      tone: s.tone,
      fill: "pastel",
      highlight: s.highlight,
      step,
    };
    x += w;
    edges[s.key] = x;
    return cell;
  });
  return { shapes, edges };
}

/** A plain line under part of a bar, from x1 to x2. */
const span = (id: string, x1: number, x2: number, y: number, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: x1,
  y,
  w: x2 - x1,
  h: 0,
  head: false,
  step,
});

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

const r1 = bar("r1", ROWS[0], segs(false, false).slice(0, 3), 1);
const r2 = bar("r2", ROWS[1], segs(false, false), 2);
const r3 = bar("r3", ROWS[2], segs(true, false), 3);
const r4 = bar("r4", ROWS[3], segs(false, true), 4);

const under = (row: number) => ROWS[row] + H + 8;
const note = (row: number) => ROWS[row] + H + 14;

const spec: LayoutSpec = {
  kind: "layout",
  title: "A stable prefix is cached; one early edit invalidates everything after it",
  width: 840,
  height: 470,
  steps: [
    { title: `Call 6 writes its ${fmt(PREFIX_TOTALS.before)}-token prefix to the cache` },
    { title: `Call 7 reads ${fmt(PREFIX_TOTALS.before)} from the cache; ${fmt(PREFIX.added)} are new` },
    { title: `A timestamp in the system prompt: ${fmt(PREFIX_TOTALS.missWrite)} tokens written again` },
    { title: "The same timestamp sent last: the prefix still matches" },
  ],
  shapes: [
    // Step 1: call 6.
    text("l1", 20, ROWS[0], 150, H, `Call 6\n${fmt(PREFIX_TOTALS.before)} tokens`, 1),
    ...r1.shapes,
    span("u1", X, r1.edges.msgs, under(0), 1),
    text(
      "n1",
      X,
      note(0),
      r1.edges.msgs - X,
      22,
      `written to the cache: ${fmt(PREFIX_TOTALS.before)} at ${PREFIX.writeX}×`,
      1
    ),

    // Step 2: call 7 with a stable prefix.
    text("l2", 20, ROWS[1], 150, H, `Call 7\ncost ${fmt(PREFIX_TOTALS.hitCost)}`, 2),
    ...r2.shapes,
    span("u2a", X, r2.edges.msgs - 2, under(1), 2),
    span("u2b", r2.edges.msgs + 2, r2.edges.new, under(1), 2),
    text(
      "n2",
      X,
      note(1),
      640,
      22,
      `read from the cache: ${fmt(PREFIX_TOTALS.before)} at ${PREFIX.readX}× · new: ${fmt(PREFIX.added)} at ${PREFIX.writeX}×`,
      2
    ),

    // Step 3: the same call with a timestamp edited into the system prompt.
    text("l3", 20, ROWS[2], 150, H, `Call 7, time in system\ncost ${fmt(PREFIX_TOTALS.missCost)}`, 3),
    ...r3.shapes,
    span("u3a", X, r3.edges.tools - 2, under(2), 3),
    span("u3b", r3.edges.tools + 2, r3.edges.new, under(2), 3),
    text(
      "n3",
      X,
      note(2),
      640,
      22,
      `read: ${fmt(PREFIX_TOTALS.missRead)} · everything after the edit written again: ${fmt(PREFIX_TOTALS.missWrite)} at ${PREFIX.writeX}×`,
      3
    ),

    // Step 4: the timestamp moves to the end.
    text("l4", 20, ROWS[3], 150, H, `Call 7, time last\ncost about ${fmt(PREFIX_TOTALS.hitCost)}`, 4),
    ...r4.shapes,
    span("u4a", X, r4.edges.msgs - 2, under(3), 4),
    span("u4b", r4.edges.msgs + 2, r4.edges.stamp, under(3), 4),
    text(
      "n4",
      X,
      note(3),
      640,
      22,
      `read from the cache: ${fmt(PREFIX_TOTALS.before)} · new: the call, its result and the time`,
      4
    ),

    text(
      "source",
      20,
      430,
      800,
      36,
      `Costs in base-price input tokens; uncached, call 7 is ${fmt(PREFIX_TOTALS.after)}. Order tools → system → messages and\n` +
        "multipliers (Claude Opus 5.5) from the Claude prompt caching docs, Nov 2026. Token counts illustrative.",
      1
    ),
  ],
};

export default spec;
