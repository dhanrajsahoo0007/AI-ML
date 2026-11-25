import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { GATES, REFUNDS } from "@/components/diagrams/presets/gcase-support";
import { fmt } from "@/components/diagrams/presets/rag";

// "Rollout: shadow, assist, then autonomous, per intent" (customer-support-agent, design sheet §13). Each intent (order
// status, damaged item, returns, cancel, account) climbs the three stages on its own; one build step per stage. In
// each column: who writes the reply, who sends it, and the gate to the next stage. Numbers from GATES in
// presets/gcase-support.ts (thresholds illustrative):
//   Shadow, 2 weeks (GATES.shadowWeeks): the agent drafts for every ticket, nothing is sent. Gate: pass^4 ≥ 90% on
//     150 refund scenarios, each run 4 times (GATES.passHat4, refundScenarios, runsPerScenario).
//   Assist: the agent drafts, staff approve or edit before sending. Gate: 90% of drafts sent unedited
//     (GATES.assistUnedited).
//   Autonomous: the agent replies within its limits; refunds over £30 (REFUNDS.autoLimit) and hand-offs still go to a
//     person. Every release canaries at 5% of 50,000 conversations = 2,500 a day (GATES.canaryPerDay), watching
//     same-day leading metrics (hand-off rate, judge scores, refunds per conversation) with early-stop thresholds.
// Layout (860 wide): three groups 260 wide at x 20, 300, 580; inside each, the agent at y 70, the person at y 150,
// the customer at y 230, the gate at y 300; a per-intent note underneath.
// Colours (GENAI_TONE, three plus neutral): the agent green (model), staff and the customer orange (user: staff
// pastel-soft, the customer on paper), gates lime (check); group outlines neutral.

const COL = [20, 300, 580] as const;
const BOX_W = 220;
const pct = (v: number) => `${Math.round(v * 100)}%`;

type Kind = "agent" | "person" | "customer" | "gate";
const TONE: Record<Kind, LayoutShape["tone"]> = {
  agent: GENAI_TONE.model,
  person: GENAI_TONE.user,
  customer: GENAI_TONE.user,
  gate: GENAI_TONE.check,
};
const FILL: Record<Kind, LayoutShape["fill"]> = { agent: "pastel", person: "soft", customer: "paper", gate: "pastel" };

const box = (
  id: string,
  col: number,
  y: number,
  label: string,
  sub: string,
  kind: Kind,
  step: number
): LayoutShape => ({
  id,
  type: "box",
  x: COL[col] + 20,
  y,
  w: BOX_W,
  h: kind === "gate" ? 54 : 44,
  label,
  sub,
  tone: TONE[kind],
  fill: FILL[kind],
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
  title: "Rollout per intent: shadow, assist, autonomous, each stage behind a gate",
  width: 860,
  height: 410,
  steps: [
    { title: "Shadow: the agent drafts, nothing is sent" },
    { title: "Assist: staff approve every draft" },
    { title: "Autonomous: the agent replies, every release on a canary" },
  ],
  groups: [
    {
      id: "g-shadow",
      title: `1 Shadow, ${GATES.shadowWeeks} weeks`,
      tone: "neutral",
      x: COL[0],
      y: 30,
      w: 260,
      h: 340,
    },
    { id: "g-assist", title: "2 Assist", tone: "neutral", x: COL[1], y: 30, w: 260, h: 340 },
    { id: "g-auto", title: "3 Autonomous", tone: "neutral", x: COL[2], y: 30, w: 260, h: 340 },
  ],
  shapes: [
    // Shadow
    box("s-agent", 0, 70, "Agent drafts", "never sent", "agent", 1),
    box("s-person", 0, 150, "Staff reply", "as today", "person", 1),
    box("s-customer", 0, 230, "Customer", "sees the staff reply", "customer", 1),
    box(
      "s-gate",
      0,
      300,
      `Gate: pass^${GATES.runsPerScenario} ≥ ${pct(GATES.passHat4)}`,
      `${GATES.refundScenarios} refund scenarios × ${GATES.runsPerScenario} runs`,
      "gate",
      1
    ),
    arrow("s-a1", "s-agent", "s-person", 1, { dashed: true }),
    arrow("s-a2", "s-person", "s-customer", 1),

    // Assist
    box("a-agent", 1, 70, "Agent drafts", "every reply", "agent", 2),
    box("a-person", 1, 150, "Staff approve", "or edit, then send", "person", 2),
    box("a-customer", 1, 230, "Customer", "reply checked by a person", "customer", 2),
    box("a-gate", 1, 300, `Gate: ${pct(GATES.assistUnedited)} sent unedited`, "drafts staff did not change", "gate", 2),
    arrow("a-a1", "a-agent", "a-person", 2),
    arrow("a-a2", "a-person", "a-customer", 2),

    // Autonomous
    box("u-agent", 2, 70, "Agent replies", `refunds up to £${REFUNDS.autoLimit}`, "agent", 3),
    box("u-person", 2, 150, "Staff", `hand-offs, over £${REFUNDS.autoLimit}`, "person", 3),
    box("u-customer", 2, 230, "Customer", "answered in seconds", "customer", 3),
    box(
      "u-gate",
      2,
      300,
      `Canary ${pct(GATES.canaryShare)}: ${fmt(GATES.canaryPerDay)} a day`,
      "hand-offs, judge scores, refunds",
      "gate",
      3
    ),
    arrow("u-a1", "u-agent", "u-customer", 3, {
      via: [
        [COL[2] + 8, 92],
        [COL[2] + 8, 252],
      ],
    }),
    arrow("u-a2", "u-agent", "u-person", 3, { dashed: true }),
    arrow("u-a3", "u-person", "u-customer", 3),

    {
      id: "note",
      type: "text",
      x: 20,
      y: 380,
      w: 820,
      h: 20,
      label: "Each intent climbs on its own: order status can be autonomous while refunds are still in assist.",
      tone: "neutral",
      step: 3,
    },
  ],
};

export default spec;
