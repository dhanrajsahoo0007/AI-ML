import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The life of one payment intent (kindle-payments, Step 3 and Deep dive 2): every state the intent can be in, and the
// only moves allowed between them.
// Two steps: 1 the happy path and a decline: created (intent and key saved) → authorising (sent with the key) →
// authorised (funds held) → captured (money moves); a decline goes to failed · 2 what goes wrong: a timeout leaves
// the intent unknown, and only the provider's answer (asked by the worker, or a webhook) moves it to authorised or
// failed; an authorisation whose grant fails is voided; a refund on a captured intent moves it to refunded.
// Working: no numbers are drawn here; the page computes the unknown rate (0.1 % of 10,000,000 a day = 10,000).
// Layout (880 × 306): two rows of 150 × 56 boxes, columns at x 30, 260, 490, 720 (230 apart, 80 px gaps). Top row
// y 50: the forward path; bottom row y 220: failed, unknown, voided, refunded, each under the state it leaves from.
// Colours (PATTERN_TONE): created, failed, voided and refunded neutral (at rest); authorising and authorised blue (data
// in flight); captured green (the outcome the design is for); unknown red (the failure case).

const W = 150;
const H = 56;
const TOP = 50;
const BOTTOM = 220;
const x = (i: number) => 30 + i * 230;

type State = { id: string; label: string; sub: string; tone: string; col: number; row: number; step: number };
const states: State[] = [
  { id: "created", label: "Created", sub: "intent + key saved", tone: PATTERN_TONE.infra, col: 0, row: TOP, step: 1 },
  {
    id: "authorising",
    label: "Authorising",
    sub: "sent with the key",
    tone: PATTERN_TONE.data,
    col: 1,
    row: TOP,
    step: 1,
  },
  { id: "authorised", label: "Authorised", sub: "funds held", tone: PATTERN_TONE.data, col: 2, row: TOP, step: 1 },
  { id: "captured", label: "Captured", sub: "money moves", tone: PATTERN_TONE.pattern, col: 3, row: TOP, step: 1 },
  { id: "failed", label: "Failed", sub: "no money moved", tone: PATTERN_TONE.infra, col: 0, row: BOTTOM, step: 1 },
  { id: "unknown", label: "Unknown", sub: "timed out: ask", tone: PATTERN_TONE.fail, col: 1, row: BOTTOM, step: 2 },
  { id: "voided", label: "Voided", sub: "hold released", tone: PATTERN_TONE.infra, col: 2, row: BOTTOM, step: 2 },
  {
    id: "refunded",
    label: "Refunded",
    sub: "new ledger entries",
    tone: PATTERN_TONE.infra,
    col: 3,
    row: BOTTOM,
    step: 2,
  },
];

const shapes: LayoutShape[] = states.map((s) => ({
  id: s.id,
  type: "box",
  x: x(s.col),
  y: s.row,
  w: W,
  h: H,
  label: s.label,
  sub: s.sub,
  tone: s.tone as LayoutShape["tone"],
  fill: "pastel",
  step: s.step,
}));

const arrow = (id: string, from: string, to: string, label: string, step: number, extra: Partial<LayoutShape> = {}) =>
  shapes.push({ id, type: "arrow", x: 0, y: 0, from, to, label, step, ...extra });

arrow("send", "created", "authorising", "send", 1);
arrow("approve", "authorising", "authorised", "approved", 1);
arrow("capture", "authorised", "captured", "capture", 1);
arrow("decline", "authorising", "failed", "declined", 1);
arrow("timeout", "authorising", "unknown", "timeout", 2, { dashed: true, tone: PATTERN_TONE.fail });
arrow("found", "unknown", "authorised", "approved", 2, { dashed: true });
arrow("notfound", "unknown", "failed", "none", 2, { dashed: true });
arrow("void", "authorised", "voided", "grant failed", 2);
arrow("refund", "captured", "refunded", "refund", 2);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The life of one payment intent",
  width: x(3) + W + 10,
  height: BOTTOM + H + 30,
  steps: [{ title: "Forward, or declined" }, { title: "Unknown, voided, refunded" }],
  shapes,
};

export default spec;
