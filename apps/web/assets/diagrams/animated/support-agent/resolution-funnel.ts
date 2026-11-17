import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { FUNNEL as F } from "@/components/diagrams/presets/gcase-support";
import { fmt, funnel } from "@/components/diagrams/presets/rag";

// "What counts as resolved" (customer-support-agent, deep dive 2; design sheet §15.2). One day of Brightpost
// conversations through the 7-day, any-channel rule. Every number is FUNNEL in presets/gcase-support.ts
// (illustrative):
//   50,000 conversations (VOLUME.conversationsPerDay)
//   → 34,000 ended without a hand-off; 50,000 − 34,000 = 16,000 handed off (32%), shown aside
//   → 31,500 with no repeat contact about the same order or issue, on any channel, within 7 days (2,500 came back)
//   → 30,000 with the end state confirmed (refund settled, order found): 30,000 ÷ 50,000 = 60% resolved
//   reported in two buckets: 30,000 − 700 = 29,300 by the agent alone, 700 with an approval.
//   A "closed" metric would count every conversation without a hand-off: 34,000 ÷ 50,000 = 68%.
// Four steps: 1 all conversations and the hand-offs; 2 no hand-off ("closed" would stop here); 3 no repeat contact;
// 4 end state confirmed and the two buckets.
// Layout (880 wide): funnel() from presets/rag.ts centred at x 260 (box width linear in the count), the hand-off box
// and the notes in a right column from x 520, the two buckets under the last stage.
// Colours (GENAI_TONE, four plus neutral): conversations blue (data), the confirmed stage lime (check), resolved by the
// agent alone green (model), with an approval and handed off orange (a person).

const STAGE = { y: 30, h: 50, gap: 30 } as const;
const stageY = (i: number) => STAGE.y + i * (STAGE.h + STAGE.gap);
const pct = (v: number) => `${Math.round((v / F.conversations) * 100)}%`;
const CX = 260;
const RIGHT = 520;

const note = (i: number, label: string): LayoutShape => ({
  id: `note-${i}`,
  type: "text",
  x: RIGHT,
  y: stageY(i) + 5,
  w: 340,
  h: 40,
  label,
  tone: "neutral",
  step: i + 1,
});

const BUCKET_Y = stageY(4) + 10;
const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  step: number
): LayoutShape => ({ id, type: "box", x, y, w, h: 50, label, sub, tone, fill: "pastel", step });

const spec: LayoutSpec = {
  kind: "layout",
  title: "What counts as resolved: 50,000 conversations, 60% resolved by the 7-day rule, not 68% closed",
  width: 880,
  height: BUCKET_Y + 50 + 40,
  steps: [
    { title: `${fmt(F.conversations)} conversations; ${fmt(F.handedOff)} handed off` },
    { title: `${fmt(F.noHandoff)} without a hand-off: "closed" would say ${pct(F.noHandoff)}` },
    { title: `${fmt(F.noRepeat)} with no repeat contact in 7 days` },
    { title: `${fmt(F.confirmed)} with the end state confirmed: ${pct(F.confirmed)}` },
  ],
  shapes: [
    ...funnel(
      "f",
      CX,
      STAGE.y,
      [
        {
          label: "Conversations",
          count: F.conversations,
          sub: `${fmt(F.conversations)} a day`,
          tone: GENAI_TONE.data,
          step: 1,
        },
        {
          label: "No hand-off",
          count: F.noHandoff,
          sub: `${fmt(F.noHandoff)} (${pct(F.noHandoff)})`,
          tone: GENAI_TONE.data,
          step: 2,
        },
        {
          label: "No repeat contact, 7 days",
          count: F.noRepeat,
          sub: `${fmt(F.noRepeat)} (${pct(F.noRepeat)})`,
          tone: GENAI_TONE.data,
          step: 3,
        },
        {
          label: "End state confirmed",
          count: F.confirmed,
          sub: `${fmt(F.confirmed)} (${pct(F.confirmed)}): resolved`,
          tone: GENAI_TONE.check,
          step: 4,
        },
      ],
      { maxW: 440, minW: 280, h: STAGE.h, gap: STAGE.gap }
    ),

    // Step 1: the hand-offs leave the funnel to the right.
    box(
      "handoff",
      RIGHT + 60,
      stageY(0),
      240,
      "Handed off to a person",
      `${fmt(F.handedOff)} (${pct(F.handedOff)})`,
      GENAI_TONE.user,
      1
    ),
    { id: "handoff-a", type: "arrow", x: 0, y: 0, from: "f-0", to: "handoff", dashed: true, step: 1 },

    note(1, `"Closed" would stop here and report\n${fmt(F.noHandoff)} ÷ ${fmt(F.conversations)} = ${pct(F.noHandoff)}`),
    note(2, `${fmt(F.noHandoff - F.noRepeat)} came back about the same order\nor issue, on any channel`),
    note(
      3,
      `${fmt(F.noRepeat - F.confirmed)} more had no settled refund or found order;\n${fmt(F.confirmed)} ÷ ${fmt(F.conversations)} = ${pct(F.confirmed)}`
    ),

    // Step 4: the two buckets under the last stage.
    box(
      "alone",
      CX - 220,
      BUCKET_Y,
      250,
      "By the agent alone",
      `${fmt(F.byAgentAlone)} (${pct(F.byAgentAlone)})`,
      GENAI_TONE.model,
      4
    ),
    box(
      "approval",
      CX + 50,
      BUCKET_Y,
      170,
      "With an approval",
      `${fmt(F.withApproval)} (${Math.round((F.withApproval / F.conversations) * 1000) / 10}%)`,
      GENAI_TONE.user,
      4
    ),
    { id: "alone-a", type: "arrow", x: 0, y: 0, from: "f-3", to: "alone", step: 4 },
    { id: "approval-a", type: "arrow", x: 0, y: 0, from: "f-3", to: "approval", step: 4 },
    {
      id: "bucket-note",
      type: "text",
      x: RIGHT,
      y: BUCKET_Y + 5,
      w: 340,
      h: 40,
      label: `${fmt(F.confirmed)} − ${fmt(F.withApproval)} = ${fmt(F.byAgentAlone)};\nthree buckets: alone, with an approval, handed off`,
      tone: "neutral",
      step: 4,
    },
  ],
};

export default spec;
