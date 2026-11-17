import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { NETWORK, ORDER_CARDS, WALK } from "@/components/diagrams/presets/gcase-kghealth";

// Order cards in the EHR, delta only (kg-healthcare-case-study, Step 6; design sheet §6, §10.3, §10.14). Numbers from
// presets/gcase-kghealth.ts (ESTIMATES):
//   NETWORK.ordersPerDay 51,200 orders; NETWORK.hookCalls 122,880 hook calls (order-select ≈ 2 an order + order-sign once
//   per 2.5 orders). ORDER_CARDS: deltaShare 1.5% of orders meet a rule only through a note-derived fact → cardsPerDay
//   768 (1.5 per 100 orders), criticalPerDay ≈ 77 interruptive (0.15 per 100), explainsPerDay ≈ 154 "Explain" clicks;
//   interruptiveBudgetPerShift 3 warning-tier interruptive cards per prescriber per shift (critical allergies and
//   contraindicated pairs exempt; hitting the limit flags the types to pharmacy review and never demotes a card);
//   acceptanceFloor 30% (an interruptive type below it is downgraded after pharmacist review). The card is ready at
//   WALK.orderMs ≈ 64 ms p50 with prefetch.
//   Entitlements (R2-1): the hook authenticates the EHR, so the service takes context.userId, looks up that user's
//   entitlements in the cached table (5 ms) and filters note-derived facts by security label BEFORE the join. A card
//   never shows, quotes or relies on a restricted fact; when one would change the result the card says only "A
//   restricted record may be relevant to this order. Ask pharmacy, or open the chart with break-the-glass". Part 2
//   facts never reach a card without consent on file.
//   The example card: amoxicillin ordered; a penicillin allergy (rash, 2019) is written only in a note, so the EHR's
//   own checker, which reads coded allergies, shows nothing; the card says "found only in notes" and suggests coding the
//   allergy (a CDS Hooks suggestion the EHR applies only if the clinician accepts it).
// Steps: 1 the hook call, the user's entitlements and the label filter · 2 the same templates twice: coded facts with
// the EHR's local configuration, then with the permitted note facts · 3 only the difference becomes a card at
// order-sign, including the restricted-record card · 4 the interruption budget and feedback.
// Layout (960 wide): row 1 three boxes 260 wide at x 20 | 350 | 680 (70 apart); the two runs 400 wide at x 20 | 540;
// the difference centred under them; two cards 440 wide at x 20 | 500; the budget and feedback boxes under the cards;
// the numbers in a footer.
// Colours (GENAI_TONE): the hook neutral, entitlements and the label filter lime (checks), the runs lime, the
// difference lime (a decision), the note-only card orange, the restricted card neutral, feedback orange (people).

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, ...extra });
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
const text = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 20,
  y,
  w: 920,
  h: 18,
  label,
  tone: "neutral",
  step,
});

const C = ORDER_CARDS;
const R1 = 40;
const R2 = 160;
const R3 = 290;
const R4 = 390;
const R5 = 510;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Order cards: the same rules twice, coded facts then permitted note facts; only the difference becomes a card",
  width: 960,
  height: 652,
  steps: [
    { title: "The hook call, the ordering user's entitlements and the security-label filter" },
    { title: "The same templates on coded facts with the EHR's configuration, then with permitted note facts" },
    { title: `Only the difference becomes a card at order-sign: ${C.cardsPer100Orders} per 100 orders` },
    { title: "An interruption budget for warning-tier cards, and feedback from every card" },
  ],
  shapes: [
    // Step 1: the hook call and the filter.
    box(
      "hook",
      20,
      R1,
      260,
      56,
      "order-sign hook, draft set",
      "required prefetch: meds, allergies, labs",
      "neutral",
      1
    ),
    box("entitle", 350, R1, 260, 56, "context.userId → entitlements", "cached table, 5 ms", GENAI_TONE.check, 1),
    box(
      "filter",
      680,
      R1,
      260,
      56,
      "Note facts, label-filtered",
      "before the join; Part 2 needs consent",
      GENAI_TONE.check,
      1
    ),
    arrow("a-hook", "hook", "entitle", 1),
    arrow("a-ent", "entitle", "filter", 1),

    // Step 2: the same templates twice.
    box(
      "runA",
      20,
      R2,
      400,
      70,
      "Run A: 7 templates on coded facts",
      "+ the EHR's local configuration = what the EHR already shows",
      GENAI_TONE.check,
      2
    ),
    box(
      "runB",
      540,
      R2,
      400,
      70,
      "Run B: the same templates, + permitted note facts",
      "the allergy written only in a note joins the facts",
      GENAI_TONE.check,
      2
    ),
    arrow("a-runA", "hook", "runA", 2),
    arrow("a-runB", "filter", "runB", 2),

    // Step 3: only the difference becomes a card.
    box("diff", 300, R3, 360, 50, "Card only for B minus A", "no second copy of an EHR alert", GENAI_TONE.rank, 3),
    arrow("a-diffA", "runA", "diff", 3),
    arrow("a-diffB", "runB", "diff", 3),
    box(
      "card1",
      20,
      R4,
      440,
      84,
      "Amoxicillin: penicillin allergy (rash, 2019)\nfound only in notes",
      "suggestion: add to the coded allergy list (clinician accepts)",
      "orange",
      3,
      { highlight: true }
    ),
    box(
      "card2",
      500,
      R4,
      440,
      84,
      "A restricted record may be relevant to this order.\nAsk pharmacy, or open the chart with break-the-glass.",
      "no drug, diagnosis, note or quote on the card",
      "neutral",
      3
    ),
    arrow("a-c1", "diff", "card1", 3),
    arrow("a-c2", "diff", "card2", 3),

    // Step 4: the interruption budget and feedback.
    box(
      "budget",
      20,
      R5,
      440,
      70,
      `≤ ${C.interruptiveBudgetPerShift} interruptive warning-tier cards a shift`,
      "critical allergies, contraindicated pairs exempt; the limit flags, never demotes",
      GENAI_TONE.check,
      4
    ),
    box(
      "feedback",
      500,
      R5,
      440,
      70,
      "Feedback: accepted, or overridden with a reason",
      `ignored from display logs; a type under ${Math.round(C.acceptanceFloor * 100)}% acceptance is reviewed`,
      GENAI_TONE.user,
      4
    ),
    arrow("a-fb", "card1", "feedback", 4, { dashed: true }),
    text(
      "foot-1",
      598,
      `${n(Math.round(C.cardsPerDay))} cards a day of ${n(NETWORK.ordersPerDay)} orders (${C.cardsPer100Orders} per 100), ${Math.round(C.criticalPerDay)} interruptive (${C.criticalPer100Orders.toFixed(2)} per 100), ${Math.round(C.explainsPerDay)} "Explain" clicks; ${n(NETWORK.hookCalls)} hook calls.`,
      4
    ),
    text(
      "foot-2",
      620,
      `Card ready ≈ ${Math.round(WALK.orderMs)} ms p50; order-select warms the cache and shows only critical cards. Rates are estimates.`,
      4
    ),
  ],
};

export default spec;
