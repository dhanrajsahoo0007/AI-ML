import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST } from "@/components/diagrams/presets/agents";
import { CHAT, WHITE_KETTLE_PRICE, WINDOW_N, windowAt } from "@/components/diagrams/presets/agents-chat";

// Sliding window on conversation-short-term-memory (Core concepts, the hero): the Brightpost chat grows and the app
// sends the model only the last 8 messages. One row per request the model answers, as the chat grows:
// - Turn 8: messages 1–7, all inside the window.
// - Turn 10: message 1 (the customer's first message, with order 4471) falls out; message 2 still names 4471 and £42.
// - Turn 12: messages 1–3 are out: the order number, the £42 price and "email me, not text" have left the window.
// - Turn 14: messages 1–5 are out, including the "held for approval" turn. The customer asks for the confirmation, and
//   the only price the model can see is the white kettle's £44 (ringed, red): the reply goes wrong.
//
// Four build steps, one row each. Layout: a label block on the left (x 16, 124 wide); 13 message cells from x 150,
// 54 wide and touching, in fixed columns (message n always sits in the same column, so the window visibly slides
// right). Rows at y 56 | 126 | 196 | 266, 50 high. A header above names the cells; a red note under the last row.
//
// Colour (agents legend): customer messages orange, assistant messages green (pastel while inside the window); a
// message outside the window is neutral on paper, its gist still printed so the reader sees what was lost; red only
// for the £44 trap and the note (four tones counting red, plus neutral).

const X = 150;
const CW = 54;
const H = 50;
const ROWS = [56, 126, 196, 266] as const;
const TURNS = [8, 10, 12, 14] as const;

const row = (r: number): LayoutShape[] => {
  const turn = TURNS[r];
  const step = r + 1;
  const win = windowAt(turn);
  const out: LayoutShape[] = [
    {
      id: `l${r}`,
      type: "text",
      x: 16,
      y: ROWS[r],
      w: 124,
      h: H,
      label: `Turn ${turn}\nsees ${win.first}–${win.last}`,
      tone: AGENT_TONE.infra,
      step,
    },
  ];
  for (const m of CHAT.filter((c) => c.n <= win.last)) {
    const inside = m.n >= win.first;
    const trap = turn === 14 && m.n === 6;
    out.push({
      id: `r${r}-m${m.n}`,
      type: "cell",
      x: X + (m.n - 1) * CW,
      y: ROWS[r],
      w: CW,
      h: H,
      label: String(m.n),
      sub: m.gist,
      tone: trap
        ? AGENT_TONE.failure
        : !inside
          ? AGENT_TONE.infra
          : m.who === "customer"
            ? AGENT_TONE.task
            : AGENT_TONE.model,
      fill: inside ? "pastel" : "paper",
      highlight: trap || undefined,
      quiet: !trap,
      step,
    });
  }
  return out;
};

const noteY = ROWS[3] + H + 14;

const spec: LayoutSpec = {
  kind: "layout",
  title: `Sliding window: the model sees only the last ${WINDOW_N} messages`,
  width: 880,
  height: noteY + 44,
  steps: [
    { title: "Turn 8: all 7 earlier messages fit in the window" },
    { title: `Turn 10: message 1 falls out; ${BRIGHTPOST.orderId} survives in message 2` },
    { title: `Turn 12: the order number, the £${BRIGHTPOST.price} price and "email" are gone` },
    { title: `Turn 14: the only price in view is the white kettle's £${WHITE_KETTLE_PRICE}` },
  ],
  shapes: [
    {
      id: "head",
      type: "text",
      x: X,
      y: 18,
      w: CHAT.length * CW,
      h: 24,
      label: `Messages 1–${CHAT.length}: customer orange, assistant green; pale = outside the window`,
      tone: AGENT_TONE.infra,
    },
    ...row(0),
    ...row(1),
    ...row(2),
    ...row(3),
    {
      id: "note",
      type: "text",
      x: X,
      y: noteY,
      w: CHAT.length * CW,
      h: 36,
      label: `"Send me the confirmation": no order number, no £${BRIGHTPOST.price}, no "email, not text" in view.\nThe one price left is £${WHITE_KETTLE_PRICE}, for a kettle the customer never bought.`,
      tone: AGENT_TONE.failure,
      step: 4,
    },
  ],
};

export default spec;
