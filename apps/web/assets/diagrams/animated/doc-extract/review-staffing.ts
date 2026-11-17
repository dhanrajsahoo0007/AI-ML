import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { REVIEW, VOLUME } from "@/components/diagrams/presets/gcase-docextract";
import { PROD_TONE, meter, meterSize, n } from "@/components/diagrams/presets/production";

// Deep dive 2 of the document-extraction case study (design sheet §15.2, §5): the review queue in staff hours, and what
// it costs on the roster. Numbers from REVIEW in presets/gcase-docextract.ts (review times illustrative, measured in
// the review app):
//   A day's hours = its invoices × the per-invoice review seconds (field review, route C, value review, lines,
//   exceptions, failures, holds, coding) + the flat hours (audits, label samples, receipts, other mail, statements) ÷ 21.
//   Steady: normal day (1,625 invoices) REVIEW.steady.normalDayHours ≈ 29.8 h → 6 clerks (capacity 6 × 6 h × 0.85 =
//   30.6; 83%); month-end day (2,800) ≈ 46.4 h → 10 clerks (51.0; 77%; one off sick → 86%).
//   Launch: ≈ 37.5 h → 8 clerks; ≈ 59.8 h → 12 clerks.
//   Month (steady) REVIEW.steady.totalHours ≈ 709 h of work ≈ 21,300 USD at 30 USD an hour; the roster is 6 permanent
//   + 4 flex for the 5 month-end days = 6 × 21 × 8 + 4 × 5 × 8 = 1,168 paid hours ≈ 35,040 USD a month.
//   One STP point ≈ 5.6 h of work; a permanent clerk carries 21 × 5.1 = 107 h, so savings come in steps of ≈ 19 points
//   (≈ 5,040 USD a month). Canary audits (REVIEW.apOps.canaryAuditHours ≈ 25 h a month) belong to the AP-ops owner, so
//   the last footer line names them outside the roster.
// Steps: 1 steady state, the two day types against their capacity lines · 2 launch · 3 the month and the roster.
// Layout (880 wide): meter() from presets/production.ts per day type, 700 wide on one scale (0–65 h), stacked by
// reason; the limit line is the team's capacity at 85%; a colour key above; three footer lines.
// Colours: field review blue (reading the document), route C and value review orange (a person decides by design),
// business exceptions neutral (waiting on buyers, not extraction), lines, failures, holds and coding red (extraction
// or policy trouble), audits, label samples, receipts, mail and statements lime (checks and the rest).

const X = 90;
const W = 700;
const MAX_H = 65;

type Make = typeof REVIEW.steady;
const GROUPS: {
  id: string;
  label: string;
  tone: LayoutTone;
  perInvoice: (h: Make["hours"]) => number;
  flat: (h: Make["hours"]) => number;
}[] = [
  { id: "fields", label: "Field review", tone: GENAI_TONE.data, perInvoice: (h) => h.fields, flat: () => 0 },
  {
    id: "c",
    label: "Route C, value review",
    tone: GENAI_TONE.user,
    perInvoice: (h) => h.routeC + h.valueReview,
    flat: () => 0,
  },
  { id: "exc", label: "Exceptions", tone: PROD_TONE.infra, perInvoice: (h) => h.exceptions, flat: () => 0 },
  {
    id: "other",
    label: "Lines, failures, holds",
    tone: GENAI_TONE.failure,
    perInvoice: (h) => h.lines + h.failures + h.holds + h.coding,
    flat: () => 0,
  },
  {
    id: "flat",
    label: "Audits, receipts, mail",
    tone: GENAI_TONE.check,
    perInvoice: () => 0,
    flat: (h) => h.audit + h.calibration + h.receipts + h.other + h.statements,
  },
];

/** A day's hours by group, to 0.1 h: invoice-driven hours scale with the day's invoices; flat hours are spread over 21
 * days. */
const day = (m: Make, invoices: number) => {
  const raw = GROUPS.map(
    (g) => (g.perInvoice(m.hours) * invoices) / VOLUME.invoices + g.flat(m.hours) / VOLUME.workingDays
  );
  // Largest-remainder rounding to tenths, so the parts add up to the day's total rounded to 0.1 h.
  const tenths = raw.map((v) => Math.floor(v * 10));
  const short = Math.round(raw.reduce((a, v) => a + v, 0) * 10) - tenths.reduce((a, v) => a + v, 0);
  raw
    .map((v, i) => ({ i, rem: v * 10 - tenths[i] }))
    .sort((a, b) => b.rem - a.rem)
    .slice(0, short)
    .forEach(({ i }) => tenths[i]++);
  return GROUPS.map((g, i) => ({ ...g, hours: tenths[i] / 10 }));
};

const h1 = (v: number) => v.toFixed(1);
const rows = [
  {
    id: "n",
    title: "Normal day",
    m: REVIEW.steady,
    invoices: VOLUME.normalDayInvoices,
    staff: REVIEW.steady.normalDayStaff,
    step: 1,
  },
  {
    id: "e",
    title: "Month-end day",
    m: REVIEW.steady,
    invoices: VOLUME.monthEndDayInvoices,
    staff: REVIEW.steady.monthEndDayStaff,
    step: 1,
  },
  {
    id: "ln",
    title: "Launch, normal day",
    m: REVIEW.launch,
    invoices: VOLUME.normalDayInvoices,
    staff: REVIEW.launch.normalDayStaff,
    step: 2,
  },
  {
    id: "le",
    title: "Launch, month end",
    m: REVIEW.launch,
    invoices: VOLUME.monthEndDayInvoices,
    staff: REVIEW.launch.monthEndDayStaff,
    step: 2,
  },
];

const KEY_Y = 8;
const TOP = 40;
const PITCH = meterSize({ width: W }).height + 16;
const FOOT_Y = TOP + rows.length * PITCH + 4;

const keyItems: LayoutShape[] = (() => {
  let x = 12;
  return GROUPS.map((g) => {
    const w = Math.ceil(g.label.length * 6.6) + 22;
    const shape: LayoutShape = {
      id: `key-${g.id}`,
      type: "cell",
      x,
      y: KEY_Y,
      w,
      h: 22,
      label: g.label,
      tone: g.tone,
      fill: "pastel",
      step: 1,
      quiet: true,
    };
    x += w + 8;
    return shape;
  });
})();

const meters: LayoutShape[] = rows.flatMap((r, i) => {
  const parts = day(r.m, r.invoices);
  const used = Math.round(parts.reduce((a, p) => a + p.hours, 0) * 10) / 10;
  const capacity = r.staff * REVIEW.capacityPerClerk;
  const y = TOP + i * PITCH;
  return [
    {
      id: `${r.id}-name`,
      type: "text" as const,
      x: 0,
      y: y + 26,
      w: X - 8,
      h: 18,
      label: `${n(r.invoices)} inv.`,
      tone: PROD_TONE.infra,
      step: r.step,
      quiet: true,
    },
    ...meter(r.id, X, y, {
      label: `${r.title}: ${h1(used)} h of work, ${r.staff} clerks (${Math.round((used / (r.staff * 6)) * 100)}%)`,
      used,
      limit: capacity,
      max: MAX_H,
      unit: "h",
      width: W,
      segments: parts.map((p) => ({ value: p.hours, tone: p.tone, label: h1(p.hours) })),
      limitLabel: `${r.staff} × 6 h × 85% = ${h1(capacity)} h`,
      step: r.step,
    }).map((sh) => (sh.id === `${r.id}-title` ? sh : { ...sh, quiet: true })),
  ];
});

const text = (id: string, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x: 12,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step: 3,
});
const s = REVIEW.steady;

const spec: LayoutSpec = {
  kind: "layout",
  title: "The review queue in staff hours: 6 clerks on a normal day, 10 at month end, sized at 85% utilisation",
  width: 880,
  height: FOOT_Y + 70,
  steps: [
    { title: `Steady state: ${s.normalDayStaff} clerks on a normal day, ${s.monthEndDayStaff} at month end` },
    { title: `At launch: ${REVIEW.launch.normalDayStaff} and ${REVIEW.launch.monthEndDayStaff} clerks` },
    { title: `The month: ≈ ${n(Math.round(s.totalHours))} h of work, ${n(s.paidHours)} paid hours on the roster` },
  ],
  shapes: [
    ...keyItems,
    ...meters,
    text(
      "foot-1",
      FOOT_Y,
      `Month: ≈ ${n(Math.round(s.totalHours))} h of work ≈ ${n(Math.round(s.demandUsd / 100) * 100)} USD; roster ${s.permanent} permanent + ${s.flex} flex for ${VOLUME.monthEndDays} days = ${n(s.paidHours)} paid h ≈ ${n(s.monthlyUsd)} USD.`
    ),
    {
      ...text(
        "foot-2",
        FOOT_Y + 22,
        `One STP point ≈ ${h1(REVIEW.stpPointHours)} h of work, but money moves in steps of one clerk: ≈ ${Math.round(REVIEW.stpPointsPerClerk)} points ≈ ${n(REVIEW.clerkMonthUsd)} USD a month.`
      ),
      quiet: true,
    },
    {
      ...text(
        "foot-3",
        FOOT_Y + 44,
        `Not on the roster: canary audits, ≈ ${Math.round(REVIEW.apOps.canaryAuditHours)} h a month, done by the AP-ops owner. Review times are illustrative.`
      ),
      quiet: true,
    },
  ],
};

export default spec;
