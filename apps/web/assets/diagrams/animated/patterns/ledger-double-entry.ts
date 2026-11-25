import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Order 4471 in a double-entry ledger (ledgers-and-reconciliation, Core concepts): a payment and its refund as four
// immutable entries, with every total computed below.
// Four steps: 1 a balance column alone: one number, no history · 2 the payment: debit the provider receivable £42,
// credit order revenue £42 · 3 the refund: two more entries that reverse it, nothing edited · 4 the totals: debits
// equal credits, and each account nets to zero.
// Layout: a table of boxes (entry 70, account 230, debit 110, credit 110), one row per entry, totals underneath.
// Colours (PATTERN_TONE): entries blue (data: money movements), the balance-column box violet (a store), the totals lime
// (a check that must hold).

const P = ORDER.price;
type Row = { id: string; account: string; debit: number; credit: number; step: number };
const ROWS: Row[] = [
  { id: "1", account: "Provider receivable", debit: P, credit: 0, step: 2 },
  { id: "2", account: `Order ${ORDER.orderId} revenue`, debit: 0, credit: P, step: 2 },
  { id: "3", account: `Order ${ORDER.orderId} revenue`, debit: P, credit: 0, step: 3 },
  { id: "4", account: "Provider receivable", debit: 0, credit: P, step: 3 },
];
const debits = ROWS.reduce((a, r) => a + r.debit, 0);
const credits = ROWS.reduce((a, r) => a + r.credit, 0);
const net = (account: string) => ROWS.filter((r) => r.account === account).reduce((a, r) => a + r.debit - r.credit, 0);
const money = (v: number) => (v === 0 ? "" : `£${v}`);

const COLS = [
  { key: "id", x: 20, w: 70, head: "Entry" },
  { key: "account", x: 94, w: 230, head: "Account" },
  { key: "debit", x: 328, w: 110, head: "Debit" },
  { key: "credit", x: 442, w: 110, head: "Credit" },
] as const;
const Y0 = 90;
const RH = 38;

const shapes: LayoutShape[] = [
  {
    id: "bal",
    type: "box",
    x: 600,
    y: 20,
    w: 220,
    h: 50,
    label: "balance = £0",
    sub: "one number, no history",
    tone: PATTERN_TONE.store,
    fill: "pastel",
    step: 1,
  },
];
COLS.forEach((c) =>
  shapes.push({
    id: `h-${c.key}`,
    type: "text",
    x: c.x,
    y: Y0 - 26,
    w: c.w,
    h: 18,
    label: c.head,
    tone: PATTERN_TONE.infra,
    step: 2,
  })
);
ROWS.forEach((r, i) => {
  const y = Y0 + i * (RH + 6);
  const vals: Record<string, string> = { id: r.id, account: r.account, debit: money(r.debit), credit: money(r.credit) };
  COLS.forEach((c) =>
    shapes.push({
      id: `r${r.id}-${c.key}`,
      type: "box",
      x: c.x,
      y,
      w: c.w,
      h: RH,
      label: vals[c.key],
      tone: PATTERN_TONE.data,
      fill: c.key === "id" || c.key === "account" ? "soft" : "pastel",
      step: r.step,
    })
  );
});
const yT = Y0 + ROWS.length * (RH + 6) + 8;
shapes.push({
  id: "t-label",
  type: "box",
  x: 94,
  y: yT,
  w: 230,
  h: RH,
  label: "Totals",
  tone: PATTERN_TONE.check,
  fill: "soft",
  step: 4,
});
shapes.push({
  id: "t-debit",
  type: "box",
  x: 328,
  y: yT,
  w: 110,
  h: RH,
  label: `£${debits}`,
  tone: PATTERN_TONE.check,
  fill: "pastel",
  step: 4,
});
shapes.push({
  id: "t-credit",
  type: "box",
  x: 442,
  y: yT,
  w: 110,
  h: RH,
  label: `£${credits}`,
  tone: PATTERN_TONE.check,
  fill: "pastel",
  step: 4,
});
shapes.push({
  id: "t-note",
  type: "text",
  x: 570,
  y: yT + 10,
  w: 270,
  h: 18,
  label: `Each account nets to £${net("Provider receivable") + net(`Order ${ORDER.orderId} revenue`)}`,
  tone: PATTERN_TONE.check,
  step: 4,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A payment and a refund in double entry",
  width: 860,
  height: yT + RH + 20,
  shapes,
  steps: [
    { title: "A balance column: one number, no history" },
    { title: "The payment: a debit and a credit" },
    { title: "The refund: two new entries, nothing edited" },
    { title: "Debits equal credits; every account nets to zero" },
  ],
};

export default spec;
