import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "Rollout: shadow, assist, then autonomous" (customer-support-agent case study). Three stages, one column each, and
// one build step per stage. In each column: who writes the reply, who sends it, and the gate that must pass before
// the next stage. Illustrative values, local to this figure (the page states them as illustrative):
// - Shadow: the agent drafts for every ticket but nothing is sent; graders compare drafts with the person's reply on
//   500 tickets; gate: drafts rated as good or better on 85%.
// - Assist: the agent drafts, a person approves or edits before sending; gate: 90% sent without edits for two weeks,
//   no wrong refunds.
// - Autonomous: the agent replies on its own for the intents that passed (order status and password reset, 45% + 20%
//   = 65% of tickets); every other intent still goes to a person. Watched: reopen rate and CSAT against people.
//
// Tones (three plus neutral): the agent green (the LLM), the gates lime (scores), people and the customer neutral.
// Layout: three groups 260 wide at x 20, 300, 580; inside each, the agent at y 70, the person at y 150, the customer
// at y 230, the gate at y 300.

const COL = [20, 300, 580] as const;
const BOX_W = 220;

const box = (
  id: string,
  col: number,
  y: number,
  label: string,
  sub: string,
  kind: "agent" | "person" | "customer" | "gate",
  step: number
): LayoutShape => ({
  id,
  type: "box",
  x: COL[col] + 20,
  y,
  w: BOX_W,
  h: kind === "gate" ? 50 : 44,
  label,
  sub,
  tone: kind === "agent" ? RAG_TONE.answer : kind === "gate" ? RAG_TONE.rank : RAG_TONE.infra,
  fill: kind === "agent" || kind === "gate" ? "pastel" : kind === "person" ? "soft" : "paper",
  step,
});

const arrow = (id: string, from: string, to: string, step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  ...extra,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Rollout in three stages: shadow, assist, autonomous",
  width: 860,
  height: 380,
  steps: [
    { title: "Shadow: the agent drafts, nothing is sent" },
    { title: "Assist: a person approves every reply" },
    { title: "Autonomous: the agent replies for the intents that passed" },
  ],
  groups: [
    { id: "g-shadow", title: "1 Shadow", tone: RAG_TONE.infra, x: COL[0], y: 30, w: 260, h: 335 },
    { id: "g-assist", title: "2 Assist", tone: RAG_TONE.infra, x: COL[1], y: 30, w: 260, h: 335 },
    { id: "g-auto", title: "3 Autonomous", tone: RAG_TONE.infra, x: COL[2], y: 30, w: 260, h: 335 },
  ],
  shapes: [
    // Shadow
    box("s-agent", 0, 70, "Agent drafts", "never sent", "agent", 1),
    box("s-person", 0, 150, "Person replies", "as today", "person", 1),
    box("s-customer", 0, 230, "Customer", "sees the person's reply", "customer", 1),
    box("s-gate", 0, 300, "Gate: 85% as good", "graded on 500 tickets", "gate", 1),
    arrow("s-a1", "s-agent", "s-person", 1, { dashed: true }),
    arrow("s-a2", "s-person", "s-customer", 1),

    // Assist
    box("a-agent", 1, 70, "Agent drafts", "every reply", "agent", 2),
    box("a-person", 1, 150, "Person approves", "or edits, then sends", "person", 2),
    box("a-customer", 1, 230, "Customer", "reply checked by a person", "customer", 2),
    box("a-gate", 1, 300, "Gate: 90% unedited", "two weeks, no wrong refunds", "gate", 2),
    arrow("a-a1", "a-agent", "a-person", 2),
    arrow("a-a2", "a-person", "a-customer", 2),

    // Autonomous
    box("u-agent", 2, 70, "Agent replies", "2 intents, 65% of tickets", "agent", 3),
    box("u-person", 2, 150, "Person", "every other intent", "person", 3),
    box("u-customer", 2, 230, "Customer", "answered in seconds", "customer", 3),
    box("u-gate", 2, 300, "Watch: reopens, CSAT", "against people's tickets", "gate", 3),
    arrow("u-a1", "u-agent", "u-customer", 3, {
      via: [
        [COL[2] + 8, 92],
        [COL[2] + 8, 252],
      ],
    }),
    arrow("u-a2", "u-agent", "u-person", 3, { dashed: true }),
    arrow("u-a3", "u-person", "u-customer", 3),
  ],
};

export default spec;
