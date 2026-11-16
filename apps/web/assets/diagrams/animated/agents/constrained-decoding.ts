import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import {
  CUSTOMER_WORDS,
  EXTRACTION,
  ISSUES,
  ORDER_PATTERN,
  WANTS,
} from "@/components/diagrams/presets/agents-structured";

// Constrained decoding on the Brightpost extraction (structured-output-generation, Technical mechanics). The schema
// {order_id, item, issue, wants} is compiled into a grammar; at each position the grammar engine keeps only the tokens
// that can still lead to a valid object and sets the logit of every other token to −∞ before sampling. One row per
// decision point (a row compresses several real tokens: keys, quotes and colons are forced, because the mask leaves
// one choice):
//   Step 1 nothing written yet: only "{" is allowed, so a preamble ("Sure, …") or a ```json fence cannot start.
//   Step 2 order_id: the pattern ^[0-9]{4}$ allows digits only; the model writes 4471.
//   Step 3 item: a free string; the mask removes almost nothing, so it cannot make the value right.
//   Step 4 issue: the enum removes "cracked", the customer's own word (the model's likely pick without a mask), and
//          the model writes "damaged" (the highlight).
//   Step 5 wants: the enum removes "money back"; the model writes "refund" and the object closes; the finished
//          record appears under the rows, valid by construction but not yet checked against the order system.
// The masked candidates are illustrative, not measured logits (llm/decode-grammar-mask shows the arithmetic of one
// masked softmax step; this figure shows a whole object).
//
// Layout: a table, header row y 14; five rows from y 64, 64 apart, 52 high. Columns: written so far (x 20, w 200),
// mask keeps (x 232, w 220), mask removes (x 464, w 170), model writes (x 646, w 174). Result box and note below.
//
// Colour (agents legend, three tones plus neutral): the schema position neutral, the allowed tokens lime (the check),
// the removed tokens red (blocked), the model's choice green. The red cell in row 4 carries the one highlight.

const COL = {
  so: { x: 20, w: 200 },
  keep: { x: 232, w: 220 },
  drop: { x: 464, w: 170 },
  pick: { x: 646, w: 174 },
} as const;
const ROW_Y0 = 64;
const ROW_DY = 64;
const ROW_H = 52;
const rowY = (i: number) => ROW_Y0 + i * ROW_DY;

const q = (s: string) => `"${s}"`;

interface Row {
  so: string;
  rule: string;
  keep: string;
  keepSub?: string;
  drop: string;
  dropSub?: string;
  /** Free strings: almost nothing is removed, so the cell is not red. */
  dropQuiet?: boolean;
  pick: string;
  highlight?: boolean;
}

const ROWS: Row[] = [
  {
    so: "(nothing yet)",
    rule: "schema: an object",
    keep: "{",
    keepSub: "an opening brace only",
    drop: "Sure,   ```json",
    dropSub: "no preamble, no fence",
    pick: "{",
  },
  {
    so: '{"order_id": "',
    rule: `pattern ${ORDER_PATTERN}`,
    keep: "0 1 2 3 … 9",
    keepSub: "digits only",
    drop: '#   order   "',
    dropSub: "not a digit",
    pick: `${EXTRACTION.order_id}"`,
  },
  {
    so: '"item": "',
    rule: "type: string",
    keep: "any text",
    keepSub: "until the closing quote",
    drop: "almost nothing",
    dropSub: "few limits on free text",
    dropQuiet: true,
    pick: `${EXTRACTION.item}"`,
  },
  {
    so: '"issue": ',
    rule: `enum, ${ISSUES.length} values`,
    keep: `${q(ISSUES[0])} ${q(ISSUES[1])}\n${q(ISSUES[2])} ${q(ISSUES[3])}`,
    drop: q(CUSTOMER_WORDS.issue),
    dropSub: "top pick without a mask",
    pick: q(EXTRACTION.issue),
    highlight: true,
  },
  {
    so: '"wants": ',
    rule: `enum, ${WANTS.length} values`,
    keep: `${q(WANTS[0])} ${q(WANTS[1])}\n${q(WANTS[2])}`,
    drop: q(CUSTOMER_WORDS.wants),
    dropSub: "the customer's words",
    pick: `${q(EXTRACTION.wants)} }`,
  },
];

const headers: LayoutShape[] = (
  [
    ["h-so", COL.so, "Written so far"],
    ["h-keep", COL.keep, "Mask keeps"],
    ["h-drop", COL.drop, "Mask removes (−∞)"],
    ["h-pick", COL.pick, "Model writes"],
  ] as const
).map(([id, c, label]) => ({ id, type: "text", x: c.x, y: 14, w: c.w, h: 36, label, tone: AGENT_TONE.infra }));

const rows: LayoutShape[] = ROWS.flatMap((r, i) => {
  const step = i + 1;
  const y = rowY(i);
  return [
    {
      id: `so${i}`,
      type: "cell" as const,
      x: COL.so.x,
      y,
      w: COL.so.w,
      h: ROW_H,
      label: r.so,
      sub: r.rule,
      tone: AGENT_TONE.infra,
      fill: "pastel" as const,
      step,
    },
    {
      id: `keep${i}`,
      type: "cell" as const,
      x: COL.keep.x,
      y,
      w: COL.keep.w,
      h: ROW_H,
      label: r.keep,
      sub: r.keepSub,
      tone: AGENT_TONE.check,
      fill: "pastel" as const,
      step,
      quiet: true,
    },
    {
      id: `drop${i}`,
      type: "cell" as const,
      x: COL.drop.x,
      y,
      w: COL.drop.w,
      h: ROW_H,
      label: r.drop,
      sub: r.dropSub,
      tone: r.dropQuiet ? AGENT_TONE.infra : AGENT_TONE.failure,
      fill: r.dropQuiet ? ("paper" as const) : ("soft" as const),
      step,
      quiet: r.highlight ? undefined : true,
      highlight: r.highlight,
    },
    {
      id: `pick${i}`,
      type: "cell" as const,
      x: COL.pick.x,
      y,
      w: COL.pick.w,
      h: ROW_H,
      label: r.pick,
      tone: AGENT_TONE.model,
      fill: "pastel" as const,
      step,
      quiet: true,
    },
  ];
});

const RESULT_Y = rowY(ROWS.length - 1) + ROW_H + 24;
const result = `{"order_id": "${EXTRACTION.order_id}", "item": "${EXTRACTION.item}", "issue": "${EXTRACTION.issue}", "wants": "${EXTRACTION.wants}"}`;

const footer: LayoutShape[] = [
  {
    id: "result",
    type: "box",
    x: COL.so.x,
    y: RESULT_Y,
    w: COL.pick.x + COL.pick.w - COL.so.x,
    h: 44,
    label: result,
    tone: AGENT_TONE.model,
    fill: "pastel",
    step: ROWS.length,
  },
  {
    id: "note",
    type: "text",
    x: COL.so.x,
    y: RESULT_Y + 52,
    w: COL.pick.x + COL.pick.w - COL.so.x,
    h: 20,
    label: `Valid by construction. Whether order ${EXTRACTION.order_id} exists, and is this customer's, is still your code's job.`,
    tone: AGENT_TONE.infra,
    step: ROWS.length,
    quiet: true,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Constrained decoding: the schema masks the next token",
  width: 840,
  height: RESULT_Y + 52 + 20 + 16,
  steps: [
    { title: "Before the first token: only { is allowed" },
    { title: "order_id: digits only" },
    { title: "item: free text, few limits" },
    { title: "issue: the enum removes the customer's word" },
    { title: "wants: the last value closes the object" },
  ],
  shapes: [...headers, ...rows, ...footer],
};

export default spec;
