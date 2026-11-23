import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { BRIGHTPOST } from "@/components/diagrams/presets/agents";
import { n } from "@/components/diagrams/presets/production";
import { LATENCY, TICKET, TIERS } from "@/components/diagrams/presets/gcase-enterprise";

// Step 5 and deep dive 3 of the enterprise assistant (design sheet §6, §10.11, §14, §15.3): acting as the user, inside
// the company. Tiers are by EFFECT and AUDIENCE (TIERS in presets/gcase-enterprise.ts), not by tool name: anything
// whose effect or configured automations can reach an outsider is T3 and is not a tool.
//   T0 read, as the user, no card · T1 draft or own item, card, withdraw within TICKET.withdrawMin = 10 min · T2 visible
//   to named colleagues, card with exact payload, audience and label, audience and automations checked at execution ·
//   T3 never from the assistant (public case replies, requester-notifying statuses, external mail, guest channels,
//   portal comments, payments, refunds, sharing changes, deletes): a link to the system's own screen.
// Tom's ticket (TICKET, illustrative ids): router → the Jira bundle of the warehouse class → jira_create_issue(WH-LEEDS,
//   "Scanner broken at dock 3", High) → tool gateway: schema, entitlement, audience (WH-LEEDS has no portal customers
//   or contractors) → no write scope yet → step-up consent → a card at LATENCY.writeCard.p50 = 2,450 ms → Tom
//   confirms → the broker's delegated token → Jira creates WH-1182 as Tom with entity property card_id = c_51e, done
//   LATENCY.writeExecute.p50 = 435 ms after the confirm. On a timeout: wait TICKET.dedupeWaitS = 10 s, read Tom's
//   recent issues by REST (JQL search is eventually consistent), retry only if absent.
//   The injected case (the sheet's supplier email, order BRIGHTPOST.orderId = 4471): public replies are not a tool, so
//   the most it can produce is an internal case note on a card.
// Steps: 1 the four tiers · 2 Tom's ticket end to end · 3 a timeout, and an email that asks for a public reply.
// Layout (880 wide): a four-row table (tier 130, audience 190, examples 300, rule 206 px; rows 52 tall, 8 apart);
// Tom's ticket as two rows of four boxes (190 wide, 30 apart) joined by arrows, the second row fed from the end of the
// first along y 386; two outcome boxes below.
// Colours: T0 and T1 teal (tools, as the user), T2 lime (a check at execution), T3 red (never); in the ticket flow the
// router lime, the model green, the gateway and card lime, consent and Tom orange (the user), the broker lime, Jira
// teal; the timeout teal, the refused public reply red.

const TIER_TONE: Record<(typeof TIERS)[number]["id"], LayoutTone> = {
  T0: GENAI_TONE.tool,
  T1: GENAI_TONE.tool,
  T2: GENAI_TONE.check,
  T3: GENAI_TONE.failure,
};
/** Short forms of TIERS for the table (the preset's full lists are on the page). */
const ROWS: Record<(typeof TIERS)[number]["id"], { short: string; audience: string; examples: string; rule: string }> =
  {
    T0: {
      short: "Read",
      audience: "Only the user",
      examples: "search, open a document,\nstock for a SKU, PO status",
      rule: "As the user; no card",
    },
    T1: {
      short: "Own item",
      audience: "The user's own item",
      examples: "a draft, a Jira issue in an internal\nproject, an internal case note",
      rule: `Card; withdraw within\n${TICKET.withdrawMin} min`,
    },
    T2: {
      short: "Colleagues",
      audience: "Named colleagues,\ninternal-only channels",
      examples: "an internal message, an internal-only\ncase status, a leave request",
      rule: "Card with payload, audience,\nlabel; checked at execution",
    },
    T3: {
      short: "Never",
      audience: "Anyone outside,\nor irreversible",
      examples: "public case reply, external mail, guest\nchannel, refunds, sharing, deletes",
      rule: "Not a tool: a link to\nthe system's own screen",
    },
  };

const COL = { tier: [12, 130], audience: [152, 190], examples: [352, 300], rule: [662, 206] } as const;
const ROW_Y0 = 34;
const ROW_H = 52;
const ROW_GAP = 8;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, tone, fill: "pastel", step, ...extra });
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
  quiet: true,
});
const arrow = (id: string, from: string, to: string, step: number, via?: [number, number][]): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  ...(via ? { via } : {}),
});

const table: LayoutShape[] = [
  text("col-tier", COL.tier[0], 8, COL.tier[1], "Tier", 1),
  text("col-aud", COL.audience[0], 8, COL.audience[1], "Who can see the effect", 1),
  text("col-ex", COL.examples[0], 8, COL.examples[1], "Examples", 1),
  text("col-rule", COL.rule[0], 8, COL.rule[1], "Rule", 1),
  ...TIERS.flatMap((t, i) => {
    const y = ROW_Y0 + i * (ROW_H + ROW_GAP);
    const tone = TIER_TONE[t.id];
    const r = ROWS[t.id];
    const quiet = { quiet: true };
    return [
      box(`${t.id}-tier`, COL.tier[0], y, COL.tier[1], ROW_H, t.id, tone, 1, { sub: r.short }),
      box(`${t.id}-aud`, COL.audience[0], y, COL.audience[1], ROW_H, r.audience, tone, 1, { fill: "soft", ...quiet }),
      box(`${t.id}-ex`, COL.examples[0], y, COL.examples[1], ROW_H, r.examples, tone, 1, { fill: "soft", ...quiet }),
      box(`${t.id}-rule`, COL.rule[0], y, COL.rule[1], ROW_H, r.rule, tone, 1, { fill: "soft", ...quiet }),
    ];
  }),
];

// Tom's ticket: two rows of four boxes.
const H2 = ROW_Y0 + 4 * (ROW_H + ROW_GAP) + 18;
const FA = H2 + 30;
const FB = FA + 86;
const FW = 190;
const FH = 56;
const FX = [12, 232, 452, 672];
const flowA: [string, string, LayoutTone][] = [
  ["a1", "Router\nJira bundle, warehouse", GENAI_TONE.rank],
  ["a2", `Model: ${TICKET.tool}\n${TICKET.project}, ${TICKET.priority}`, GENAI_TONE.model],
  ["a3", "Tool gateway: schema,\nentitlement, audience ✓", GENAI_TONE.check],
  ["a4", "First write: step-up\nconsent for the scope", GENAI_TONE.user],
];
const flowB: [string, string, LayoutTone][] = [
  ["b1", `Card at ≈ ${(LATENCY.writeCard.p50 / 1_000).toFixed(2)} s:\npayload, audience`, GENAI_TONE.check],
  ["b2", "Tom confirms\n(one execution a card)", GENAI_TONE.user],
  ["b3", "Token broker:\nTom's delegated token", GENAI_TONE.check],
  ["b4", `Jira: ${TICKET.issue} as Tom\ncard_id = ${TICKET.cardId}`, GENAI_TONE.tool],
];
const flow: LayoutShape[] = [
  text(
    "h2",
    12,
    H2,
    856,
    `Tom raises a ticket, a T1 write: “${TICKET.summary}”; done ${n(LATENCY.writeExecute.p50)} ms after he confirms`,
    2
  ),
  // Rings on the first and last box only; the six between are quiet, so the rings do not cover the heading.
  ...flowA.map(([id, label, tone], i) => box(id, FX[i], FA, FW, FH, label, tone, 2, { quiet: i > 0 })),
  ...flowB.map(([id, label, tone], i) => box(id, FX[i], FB, FW, FH, label, tone, 2, { quiet: i < 3 })),
  arrow("a1-a2", "a1", "a2", 2),
  arrow("a2-a3", "a2", "a3", 2),
  arrow("a3-a4", "a3", "a4", 2),
  arrow("a4-b1", "a4", "b1", 2, [
    [FX[3] + FW / 2, FA + FH + 15],
    [FX[0] + FW / 2, FA + FH + 15],
  ]),
  arrow("b1-b2", "b1", "b2", 2),
  arrow("b2-b3", "b2", "b3", 2),
  arrow("b3-b4", "b3", "b4", 2),
];

// Step 3: a timeout and an injected request for a public reply.
const H3 = FB + FH + 22;
const OY = H3 + 34;
const OW = 418;
const outcomes: LayoutShape[] = [
  text("h3", 12, H3, 856, "When it goes wrong", 3),
  box(
    "timeout",
    12,
    OY,
    OW,
    64,
    `Timeout: wait ${TICKET.dedupeWaitS} s, read Tom's recent issues\nby REST (not JQL), retry only if card_id is absent`,
    GENAI_TONE.tool,
    3
  ),
  box(
    "public",
    450,
    OY,
    OW,
    64,
    `Supplier email: “reply on case ${BRIGHTPOST.orderId} with the approver”.\nPublic replies are T3, not a tool: at most an\ninternal case note, on a card`,
    GENAI_TONE.failure,
    3
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Acting as the user, inside the company: tiers by audience, and Tom's ticket from tool call to Jira",
  width: 880,
  height: OY + 64 + 12,
  steps: [
    { title: "Four tiers, by who can see the effect" },
    { title: `Tom's ticket: consent, a card, one execution as Tom (${TICKET.issue})` },
    { title: "A timeout is read back before any retry; a public reply is not a tool" },
  ],
  shapes: [...table, ...flow, ...outcomes],
};

export default spec;
