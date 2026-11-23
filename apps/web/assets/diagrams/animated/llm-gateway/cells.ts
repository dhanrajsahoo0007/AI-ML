import type { LayoutGroup, LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, meter, meterSize } from "@/components/diagrams/presets/production";
import { AVAILABILITY, CAPACITY, RESERVE, REDACTION_EVAL } from "@/components/diagrams/presets/gcase-gateway";

// Not becoming the outage (llm-platform-gateway, design sheet §15.5 and Step 8; preset CAPACITY, FAILURE_POLICY,
// AVAILABILITY in presets/gcase-gateway.ts).
//   Step 1: three cells (support, voice, the rest), each active-active in London and Ireland; each Region carries its
//   cell alone at 1.5 × peak, 50 RPS a pod + 1 spare: CAPACITY.perRegion = 3 / 3 / 2 pods. The control plane pushes
//   signed snapshots (release order other → support → voice); revocations come from a deny-list in object storage,
//   pulled every 10 s, independent of the control plane. Both boxes serve both Regions, so they carry no arrows.
//   Step 2: fail open or closed per dependency and cell (FAILURE_POLICY, shortened to fit): the T0 ledger fails open
//   with a page (RESERVE.ledgerOpen15MinUsd ≈ 18.8 USD of support spend per 15 minutes, recovered by reconciliation);
//   a dictionary miss is a chunked full scan of REDACTION_EVAL.fullRescanChunkedMs ≈ 57 ms on the first call.
//   Step 3: T0 bad minutes a month (inputs illustrative): gateway cells 2 + A down 43.2 × P(B unusable) 0.2 = 8.64 +
//   detection 2 × 0.5 = 1 + brownouts 3 × 0.5 + 120 × 5% = 7.5 + scanner 0.1 = AVAILABILITY.badMin 19.24 ≈ 19.2
//   (99.955%) against the 99.9% budget AVAILABILITY.budget 43.2 and the 99.95% stretch 21.6. A month like December
//   2024's (262 minutes on one provider): 2 + 52.4 + 1 + 7.5 + 0.1 = 63.0 (99.85%), a miss. Segments rounded to one
//   decimal (8.64 → 8.6) so the bar adds up to the 19.2 the page states.
// Layout (880 wide): step 1 callers left, two Region groups with three cell boxes each, the control plane and the
// deny-list above with dashed pushes; step 2 a three-column table; step 3 two meter() bars on one scale to 70 minutes
// with the 99.95% line drawn over the first.
// Colours: callers orange, cells green for T0 and grey for the rest, the control plane grey, the deny-list violet (a
// store); table cells lime where the cell keeps serving, red where it closes, grey otherwise; minutes: gateway grey, A
// down green (the provider), detection grey, brownouts red, scanner lime.

const X = 12;

const text = (id: string, x: number, y: number, w: number, label: string, step: number, quiet = true): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet,
});

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
  quiet = true
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, quiet });

const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number,
  fill: LayoutShape["fill"] = "pastel"
): LayoutShape => ({ id, type: "cell", x, y, w, h: 26, label, tone, fill, step, quiet: true });

// Step 1: cells and Regions.
const REG = { y: 112, h: 182 } as const;
const LON = { x: 236, w: 300 } as const;
const IRL = { x: 560, w: 308 } as const;
const CELL_ROWS = [
  { id: "support", label: "Support cell", pods: CAPACITY.perRegion.support, caller: "Support agent", t0: true },
  { id: "voice", label: "Voice cell", pods: CAPACITY.perRegion.voice, caller: "Voice agent", t0: true },
  { id: "other", label: "Other cell", pods: CAPACITY.perRegion.other, caller: "Assistant, AP, labs", t0: false },
] as const;
const rowY = (i: number) => REG.y + 30 + i * 50;
const groups: LayoutGroup[] = [
  { id: "london", title: "London", tone: "blue", kind: "region", x: LON.x, y: REG.y, w: LON.w, h: REG.h },
  {
    id: "ireland",
    title: "Ireland, active-active",
    tone: "blue",
    kind: "region",
    x: IRL.x,
    y: REG.y,
    w: IRL.w,
    h: REG.h,
  },
];
const step1: LayoutShape[] = [
  text("h1", X, 4, 700, "Three cells, each in two Regions; the data plane runs on what it was last given", 1),
  box("control", LON.x, 34, LON.w, 46, "Control plane", "signed snapshots to both Regions", PROD_TONE.infra, 1),
  box(
    "deny",
    IRL.x,
    34,
    IRL.w,
    46,
    "Deny-list, object storage",
    "both Regions pull it every 10 s",
    GENAI_TONE.store,
    1
  ),
  ...CELL_ROWS.flatMap((c, i): LayoutShape[] => {
    const y = rowY(i);
    const tone = c.t0 ? GENAI_TONE.model : PROD_TONE.infra;
    const sub = `${c.pods} pods, carries it alone`;
    return [
      box(`caller-${c.id}`, X, y, 180, 40, c.caller, undefined, GENAI_TONE.user, 1),
      box(`lon-${c.id}`, LON.x + 16, y, LON.w - 32, 40, c.label, sub, tone, 1, i !== 0),
      box(`irl-${c.id}`, IRL.x + 16, y, IRL.w - 32, 40, c.label, sub, tone, 1),
      { id: `in-${c.id}`, type: "arrow", x: 0, y: 0, from: `caller-${c.id}`, to: `lon-${c.id}`, step: 1, quiet: true },
    ];
  }),
];

// Step 2: fail open or closed.
const T_Y = REG.y + REG.h + 26;
const C1 = 170;
const C2 = 400;
const C3 = 868 - X - C1 - C2 - 12;
const c2x = X + C1 + 6;
const c3x = c2x + C2 + 6;
type Row = [string, string, LayoutTone, string, LayoutTone];
const open = GENAI_TONE.check;
const closed = GENAI_TONE.failure;
const same = PROD_TONE.infra;
const ROWS: Row[] = [
  [
    "Counter store",
    "open: local counters ÷ replicas, ≤ 15 min, page",
    open,
    "assistant open 5 min; rest closed",
    closed,
  ],
  [
    "Budget ledger",
    `open with a page (≈ ${RESERVE.ledgerOpen15MinUsd.toFixed(1)} USD per 15 min)`,
    open,
    "closed",
    closed,
  ],
  ["Name scanner", "regex + dictionary ≤ 4 h (pre-signed), then people", open, "labs closed", closed],
  [
    "Dictionary store",
    `other Region; a miss → chunked scan ≈ ${Math.round(REDACTION_EVAL.fullRescanChunkedMs)} ms`,
    open,
    "labs closed",
    closed,
  ],
  ["Control plane", "last-known-good routes; deny-list; old keys refused", open, "same", same],
  ["Metering store", "spool to a local queue, replay", open, "same", same],
  ["Provider A", "B: voice first, support up to its quota", open, "assistant to C; labs to S or closed", same],
];
const step2: LayoutShape[] = [
  text("h2", X, T_Y, 700, "Fail open or closed, written per dependency and cell", 2, false),
  cell("th-1", X, T_Y + 24, C1, "If this is down", PROD_TONE.infra, 2, "soft"),
  cell("th-2", c2x, T_Y + 24, C2, "Support and voice cells", PROD_TONE.infra, 2, "soft"),
  cell("th-3", c3x, T_Y + 24, C3, "Other cell", PROD_TONE.infra, 2, "soft"),
  ...ROWS.flatMap(([dep, t0, t0Tone, other, otherTone], i): LayoutShape[] => {
    const y = T_Y + 24 + (i + 1) * 29;
    return [
      cell(`dep-${i}`, X, y, C1, dep, PROD_TONE.infra, 2, "soft"),
      cell(`t0-${i}`, c2x, y, C2, t0, t0Tone, 2),
      cell(`ot-${i}`, c3x, y, C3, other, otherTone, 2),
    ];
  }),
];
const TABLE_END = T_Y + 24 + (ROWS.length + 1) * 29;

// Step 3: the availability sum.
const A = AVAILABILITY;
const r1 = (v: number) => Math.round(v * 10) / 10;
const segs = (aDown: number) => [
  { value: A.gatewayMin, tone: PROD_TONE.infra, label: "cells" },
  { value: r1(aDown * A.pBGivenA), tone: GENAI_TONE.model, label: "A down × 0.2" },
  { value: A.incidents * A.detectMin, tone: PROD_TONE.infra },
  { value: A.brownoutMin, tone: GENAI_TONE.failure, label: "brownouts" },
  { value: A.scannerMin, tone: GENAI_TONE.check },
];
const sumOf = (xs: { value: number }[]) => r1(xs.reduce((s, x) => s + x.value, 0));
const normal = segs(A.aDownMin);
const bad = segs(262);
const S3 = TABLE_END + 24;
const MW = 856;
const MAX = 70;
const mSize = meterSize({ width: MW });
const stretchX = X + Math.round((A.stretch / MAX) * MW);
const step3: LayoutShape[] = [
  text(
    "h3",
    X,
    S3,
    840,
    `T0 bad minutes a month: 2 + 43.2 × 0.2 + 1 + 7.5 + 0.1 = ${r1(A.badMin)} (${(A.availability * 100).toFixed(3)}%) against ${r1(A.budget)}`,
    3,
    false
  ),
  ...meter("m-normal", X, S3 + 26, {
    label: "A normal month (inputs illustrative)",
    used: sumOf(normal),
    limit: r1(A.budget),
    max: MAX,
    unit: "minutes",
    width: MW,
    segments: normal,
    limitLabel: "99.9% budget",
    step: 3,
  }).map((s) => ({ ...s, quiet: true })),
  {
    id: "stretch",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [stretchX, S3 + 26 + 19],
      [stretchX, S3 + 26 + 24 + 28 + 5],
    ],
    dashed: true,
    tone: GENAI_TONE.check,
    step: 3,
    quiet: true,
  },
  text("stretch-l", stretchX - 60, S3 + 26 + 24 + 28 + 6, 120, `99.95%: ${r1(A.stretch)}`, 3),
  ...meter("m-bad", X, S3 + 26 + mSize.height + 12, {
    label: "A month like December 2024: 262 minutes down on A",
    used: sumOf(bad),
    limit: r1(A.budget),
    max: MAX,
    unit: "minutes",
    width: MW,
    segments: bad,
    limitLabel: "99.9% budget",
    step: 3,
  }).map((s) => ({ ...s, quiet: true })),
];
const END = S3 + 26 + 2 * mSize.height + 12;

const spec: LayoutSpec = {
  kind: "layout",
  title: `Not becoming the outage: three cells in two Regions, fail rules per dependency, ${r1(A.badMin)} bad minutes against ${r1(A.budget)}`,
  width: 880,
  height: END + 8,
  groups,
  steps: [
    { title: "Three cells, each active-active in two Regions, on last-known-good config" },
    { title: "Fail open or closed, per dependency and cell" },
    { title: `The availability sum: ${r1(A.badMin)} bad minutes against ${r1(A.budget)}` },
  ],
  shapes: [...step1, ...step2, ...step3],
};

export default spec;
