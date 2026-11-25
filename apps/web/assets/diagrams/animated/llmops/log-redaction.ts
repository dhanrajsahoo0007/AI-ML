import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";

// Personal data is removed before anything is stored (tracing-logging, Deep dive "Redact before you store"). No steps:
// a flow along the top and a worked table under it.
//   Flow: the raw prompt and answer (orange, held in memory only) → a redactor (lime, a check) → the trace store
//   (violet). The arrow into the store is labelled "placeholders", so the only text that reaches storage is redacted.
//   Table: one Brightpost ticket with four findings. Email and card number are found by patterns (the card also needs a
//   Luhn check digit test, so a random 16-digit order reference is not mistaken for a card); a name needs a trained
//   name finder; the order number is on an allow list because an engineer needs it to find the case
//   (REFUND_CASE.orderId, order 4471).
//   The values are made up; 4242 4242 4242 4242 is a published payment-provider test card number.
// Layout (880 x 372): flow boxes at y 16 (h 60) x 20 / 340 / 660 (w 200); table header text at y 112, rows from y 142
// with a 44 pitch (cells h 34): columns x 20 (w 140) / 170 (w 270) / 450 (w 200) / 660 (w 200); a footer line at y 330.
// Colours (PROD_TONE): raw text orange (the customer's words are traffic), the redactor lime, the store violet, kind
// column neutral. Three tones plus neutral; the redactor is the one highlight.

const box = (
  id: string,
  x: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  highlight = false
): LayoutShape => ({
  id,
  type: "box",
  x,
  y: 16,
  w: 200,
  h: 60,
  label,
  sub,
  tone,
  fill: "pastel",
  highlight: highlight || undefined,
});

const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone,
});

const COLS = [
  { x: 20, w: 140 },
  { x: 170, w: 270 },
  { x: 450, w: 200 },
  { x: 660, w: 200 },
] as const;

const rows = [
  ["Email address", "sam@example.com", "[EMAIL_1]", "pattern"],
  ["Card number", "4242 4242 4242 4242", "[CARD_1]", "pattern + check digit"],
  ["Customer name", "Sam Jones", "[NAME_1]", "name-finder model"],
  ["Order number", `order ${REFUND_CASE.orderId}`, `order ${REFUND_CASE.orderId}  (kept)`, "allow list"],
] as const;

const TOP = 142;
const PITCH = 44;

const shapes: LayoutShape[] = [
  box("raw", 20, "Prompt and answer", "raw text, in memory only", PROD_TONE.traffic),
  box("redactor", 340, "Redactor", "finds, then replaces", PROD_TONE.check, true),
  box("store", 660, "Trace store", "30-day retention, role-gated", PROD_TONE.store),
  { id: "a-raw-red", type: "arrow", x: 0, y: 0, from: "raw", to: "redactor", label: "raw text", tone: PROD_TONE.infra },
  {
    id: "a-red-store",
    type: "arrow",
    x: 0,
    y: 0,
    from: "redactor",
    to: "store",
    label: "placeholders",
    tone: PROD_TONE.infra,
  },
  text("head", 20, 108, "What the redactor does to one ticket (made-up values)"),
  text("h-kind", COLS[0].x, TOP - 8 - 4, ""),
];
// Column headings sit on the first row's top edge, so drop the empty placeholder and write real ones.
shapes.pop();
["Found", "In the ticket", "Stored as", "How it is found"].forEach((h, i) =>
  shapes.push({ ...text(`h-${i}`, COLS[i].x, TOP - 2, h), y: TOP - 2 })
);
rows.forEach((r, i) => {
  const y = TOP + 20 + i * PITCH;
  const tones = [PROD_TONE.infra, PROD_TONE.traffic, PROD_TONE.store, PROD_TONE.infra] as const;
  r.forEach((label, c) =>
    shapes.push({
      id: `c-${i}-${c}`,
      type: "cell",
      x: COLS[c].x,
      y,
      w: COLS[c].w,
      h: 34,
      label,
      tone: tones[c],
      fill: "pastel",
    })
  );
});
shapes.push(
  text(
    "foot",
    20,
    TOP + 20 + rows.length * PITCH + 4,
    "Also stored: token counts, timings, model and prompt version, a hash of the question. Never stored: the raw text."
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Personal data is removed before storage: the redactor sits between the request and the trace store",
  width: 880,
  height: TOP + 20 + rows.length * PITCH + 34,
  shapes,
};

export default spec;
