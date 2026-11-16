import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, contextBar } from "@/components/diagrams/presets/agents";
import { CHAT, POLICY, POLICY_TOTALS, RECENT_N, WINDOW_N } from "@/components/diagrams/presets/agents-chat";

// Buffer against summary on conversation-short-term-memory (Deep dive): the history the model is sent at turn 14 of
// the Brightpost chat under three policies, drawn to one illustrative scale of 1,800 tokens (POLICY):
// - Full history: messages 1–13 = 1,690 tokens, 1,200 of them the help passages search_help returned in message 4.
// - Last 8 messages (the sliding window): messages 6–13 = 180 tokens. The facts column turns red: no 4471, no £42, no
//   "email".
// - Summary + last 4: a 120-token summary of messages 1–9 (ringed) + messages 10–13 verbatim (90) = 210 tokens. The
//   summary's text is printed under the bars; it keeps all three facts.
// Each label also gives the whole request: + instructions 2,000 + tool definitions 696 = 2,696 in every request.
//
// Three build steps, one bar each (the summary box arrives with the third). Layout: labels on the left (x 16, 176
// wide), bars from x 204, 500 wide (3.6 tokens per unit), a facts column from x 724. Rows at y 56 | 136 | 216.
//
// Colour (agents legend, four tones plus neutral): messages orange (history), the help passages blue (tool result),
// the summary violet (state), red only for the facts the window lost.

const X = 204;
const W = 500;
const TOTAL = 1_800;
const ROWS = [56, 136, 216] as const;
const FX = 724;
const fmt = (n: number) => n.toLocaleString("en-GB");

const m4 = CHAT[3];
const before = CHAT.filter((m) => m.n < 4).reduce((s, m) => s + m.tokens, 0) + m4.tokens - (m4.resultTokens ?? 0);
const after = CHAT.filter((m) => m.n > 4).reduce((s, m) => s + m.tokens, 0);

const bar1 = contextBar(
  "full",
  X,
  ROWS[0],
  [
    { kind: "history", tokens: before, label: "1–4" },
    { kind: "results", tokens: POLICY.helpResult, label: "Help passages (msg 4)" },
    { kind: "history", tokens: after, label: `5–${POLICY.full.last}` },
  ],
  { total: TOTAL, w: W, free: false, step: 1 }
);
const bar2 = contextBar(
  "win",
  X,
  ROWS[1],
  [{ kind: "history", tokens: POLICY.window.tokens, label: `${POLICY.window.first}–${POLICY.window.last}` }],
  { total: TOTAL, w: W, free: false, step: 2 }
);
const s = POLICY.summary;
const bar3 = contextBar(
  "sum",
  X,
  ROWS[2],
  [
    { kind: "memory", tokens: s.tokens, label: "Summary", highlight: true },
    { kind: "history", tokens: s.recent.tokens, label: `${s.recent.first}–${s.recent.last}` },
  ],
  { total: TOTAL, w: W, free: false, step: 3 }
);

const label = (id: string, y: number, text: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 16,
  y,
  w: 176,
  h: 44,
  label: text,
  tone: AGENT_TONE.infra,
  step,
});

const facts = (id: string, y: number, text: string, lost: boolean, step: number): LayoutShape => ({
  id,
  type: "text",
  x: FX,
  y,
  w: 140,
  h: 44,
  label: text,
  tone: lost ? AGENT_TONE.failure : AGENT_TONE.infra,
  step,
});

const kept = `${BRIGHTPOST.orderId} · £${BRIGHTPOST.price} · email`;
const boxY = ROWS[2] + bar3.height + 22;
const scaleY = boxY + 90;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Last N messages against a summary plus recent messages, at turn 14",
  width: 880,
  height: scaleY + 30,
  steps: [
    { title: `Full history: ${fmt(POLICY.full.tokens)} tokens, every fact in view` },
    { title: `Last ${WINDOW_N}: ${fmt(POLICY.window.tokens)} tokens, the order facts gone` },
    { title: `Summary + last ${RECENT_N}: ${fmt(s.tokens + s.recent.tokens)} tokens, the facts kept` },
  ],
  shapes: [
    {
      id: "h-bars",
      type: "text",
      x: X,
      y: 18,
      w: W,
      h: 24,
      label: "History sent with the request at turn 14",
      tone: AGENT_TONE.infra,
    },
    { id: "h-facts", type: "text", x: FX, y: 18, w: 140, h: 24, label: "Facts in view", tone: AGENT_TONE.infra },
    label("l1", ROWS[0], `Full history\n${fmt(POLICY.full.tokens)} · request ${fmt(POLICY_TOTALS.full)}`, 1),
    ...bar1.shapes,
    facts("f1", ROWS[0], kept, false, 1),
    label(
      "l2",
      ROWS[1],
      `Last ${WINDOW_N} messages\n${fmt(POLICY.window.tokens)} · request ${fmt(POLICY_TOTALS.window)}`,
      2
    ),
    ...bar2.shapes,
    facts("f2", ROWS[1], `no ${BRIGHTPOST.orderId}, £${BRIGHTPOST.price},\nor email`, true, 2),
    label(
      "l3",
      ROWS[2],
      `Summary + last ${RECENT_N}\n${fmt(s.tokens + s.recent.tokens)} · request ${fmt(POLICY_TOTALS.summary)}`,
      3
    ),
    ...bar3.shapes,
    facts("f3", ROWS[2], kept, false, 3),
    {
      id: "summary",
      type: "box",
      x: X,
      y: boxY,
      w: 660,
      h: 60,
      label: `Order ${BRIGHTPOST.orderId}: kettle, £${BRIGHTPOST.price}, arrived cracked. Wants email, not text.\n£${BRIGHTPOST.price} refund held for approval. Asked about white kettle, delivery, price match.`,
      sub: `summary of messages ${s.covers.first}–${s.covers.last}, ${s.tokens} tokens`,
      tone: AGENT_TONE.memory,
      fill: "soft",
      step: 3,
    },
    {
      id: "scale",
      type: "arrow",
      x: X,
      y: scaleY,
      w: W,
      h: 0,
      head: false,
      label: `scale ${fmt(TOTAL)} tokens; every request adds ${fmt(POLICY_TOTALS.prefix)} of instructions and tools (illustrative)`,
    },
  ],
};

export default spec;
