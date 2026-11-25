import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, meter, meterSize } from "@/components/diagrams/presets/production";
import { AVAILABILITY, FAILOVER } from "@/components/diagrams/presets/gcase-gateway";

// Fallback and what it breaks (llm-platform-gateway, design sheet §15.2 and Step 3; preset FAILOVER, AVAILABILITY in
// presets/gcase-gateway.ts).
//   Step 1, the matrix (sheet §15.2 table): A → B (same model on Bedrock EU), A → C (another family), A → S
//   (self-hosted, labs), any → another geography, against prompt cache, schema and tool format, thinking and stateful
//   features, refusals and safety, residency, quota. Red: it breaks; lime: it holds once verified; grey: not relevant
//   or our own.
//   Step 2, B must carry T0 cold (Bedrock: input + cache writes + output × burndown 10, F56): mid FAILOVER.midNeed ≈
//   9.23M TPM (FAILOVER.midNeedLow ≈ 8.65M at 5×) against the requested FAILOVER.midRequest = 1.2 × need ≈ 11.1M;
//   small FAILOVER.smallNeed ≈ 7.56M against ≈ 9.1M. The grant is a precondition of the T0 availability target.
//   Step 3, the error classifier (sheet §10.5): 529, 5xx, timeouts and T0 calls slower than AVAILABILITY.slowMs 800 ms
//   count toward the provider breaker (10 of 20, or slow-or-failed > 10% of a rolling minute; open 30 s, 3 probes);
//   a workspace 429 moves only that tenant; a ramp 429 slows that tenant; a spend-cap 429 stops and pages; a refusal is
//   a success. None is retried after the first byte.
// Layout (880 wide): a 7-column table (moves 130 wide, six columns 120 wide, cells 2 lines); two meter() bars from
// presets/production.ts on one scale to 12M TPM; five classifier rows, error cell → arrow → action cell.

const X = 12;
const MOVE_W = 130;
const COL_W = 120;
const GAP = 3;
const CELL_H = 42;
const colX = (i: number) => X + MOVE_W + GAP + i * (COL_W + GAP);

type Mark = "breaks" | "holds" | "n/a";
const TONE: Record<Mark, LayoutTone> = { breaks: GENAI_TONE.failure, holds: GENAI_TONE.check, "n/a": PROD_TONE.infra };

const COLUMNS = ["Prompt cache", "Schema, tools", "Thinking, state", "Refusals, safety", "Residency", "Quota"];
const ROWS: { move: string; cells: [string, Mark][] }[] = [
  {
    move: "A → B\nsame model",
    cells: [
      ["miss: per\nplatform, machine", "breaks"],
      ["same model;\nverify features", "holds"],
      ["verify signatures;\nstate blocked", "holds"],
      ["no server-side\nrefusal fallback", "breaks"],
      ["EU profile;\nAWS processes", "holds"],
      ["sized for T0\ncold (step 2)", "holds"],
    ],
  },
  {
    move: "A → C\nother family",
    cells: [
      ["miss", "breaks"],
      ["other dialect,\nids, arguments", "breaks"],
      ["thinking blocks\ninvalid", "breaks"],
      ["other classifiers;\n400 → refusal", "breaks"],
      ["per provider", "holds"],
      ["its own", "n/a"],
    ],
  },
  {
    move: "A → S\nlabs only",
    cells: [
      ["miss, then\nprefix-aware", "breaks"],
      ["no constrained\ndecoding", "breaks"],
      ["—", "n/a"],
      ["our own", "n/a"],
      ["London, ours", "holds"],
      ["our 2 GPUs", "n/a"],
    ],
  },
  {
    move: "Any → other\ngeography",
    cells: [
      ["miss: caches\nstay in region", "breaks"],
      ["—", "n/a"],
      ["—", "n/a"],
      ["—", "n/a"],
      ["not allowed for\nUK-or-EU aliases", "breaks"],
      ["A's pool shared\nacross geos", "n/a"],
    ],
  },
];

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

const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  fill: LayoutShape["fill"] = "pastel",
  quiet = true
): LayoutShape => ({ id, type: "cell", x, y, w, h, label, tone, fill, step, quiet });

// Step 1: the matrix.
const T_Y = 34;
const matrix: LayoutShape[] = [
  text("h-matrix", X, 4, 600, "What each move breaks: red breaks, lime holds once verified, grey not relevant", 1),
  ...COLUMNS.map((c, i) => cell(`col-${i}`, colX(i), T_Y, COL_W, 24, c, PROD_TONE.infra, 1, "soft")),
  ...ROWS.flatMap((r, ri) => {
    const y = T_Y + 27 + ri * (CELL_H + GAP);
    return [
      cell(`move-${ri}`, X, y, MOVE_W, CELL_H, r.move, GENAI_TONE.model, 1, "soft", ri !== 0),
      ...r.cells.map(([label, mark], ci) => cell(`m-${ri}-${ci}`, colX(ci), y, COL_W, CELL_H, label, TONE[mark], 1)),
    ];
  }),
];
const MATRIX_END = T_Y + 27 + ROWS.length * (CELL_H + GAP);

// Step 2: B's quota for T0 cold.
const M = 1e6;
const r2 = (v: number) => Math.round((v / M) * 100) / 100;
const r1 = (v: number) => Math.round((v / M) * 10) / 10;
const Q_Y = MATRIX_END + 22;
const QW = 856;
const qSize = meterSize({ width: QW });
const quota: LayoutShape[] = [
  text(
    "h-quota",
    X,
    Q_Y,
    760,
    "B must carry support and voice with no cache: input + writes + output × 10 (Bedrock's burndown)",
    2,
    false
  ),
  ...meter("q-mid", X, Q_Y + 26, {
    label: `Mid on B, T0 cold (${r2(FAILOVER.midNeedLow)}M at 5×)`,
    used: r2(FAILOVER.midNeed),
    limit: r1(FAILOVER.midRequest),
    max: 12,
    unit: "M tokens a minute",
    width: QW,
    tone: GENAI_TONE.model,
    limitLabel: `requested 1.2 × need`,
    step: 2,
  }).map((s) => ({ ...s, quiet: true })),
  ...meter("q-small", X, Q_Y + 26 + qSize.height + 8, {
    label: "Small on B, T0 cold",
    used: r2(FAILOVER.smallNeed),
    limit: r1(FAILOVER.smallRequest),
    max: 12,
    unit: "M tokens a minute",
    width: QW,
    tone: GENAI_TONE.model,
    limitLabel: "requested",
    step: 2,
  }).map((s) => ({ ...s, quiet: true })),
];
const QUOTA_END = Q_Y + 26 + 2 * qSize.height + 8;

// Step 3: the error classifier.
const E_Y = QUOTA_END + 22;
const ROW = 30;
const ERR_W = 300;
const ACT_X = X + ERR_W + 60;
const ACT_W = 856 - ERR_W - 60;
const slow = AVAILABILITY.slowMs;
const br = FAILOVER.breaker;
const CLASSES: [string, string, LayoutTone][] = [
  [
    `529, 5xx, timeout; T0 first token > ${slow} ms`,
    `provider breaker: ${br.trips} of ${br.window}, or > 10% slow a minute; ${br.openS} s, ${br.probes} probes`,
    GENAI_TONE.failure,
  ],
  ["429 from a team's workspace limit", "that tenant falls back alone; A stays closed", GENAI_TONE.check],
  ["429 ramp_limit_exceeded", "slow that tenant's ramp", GENAI_TONE.check],
  ["429 spend cap reached", "stop and page; never retried", GENAI_TONE.failure],
  ["refusal (HTTP 200)", "a success: recorded, never retried", GENAI_TONE.model],
];
const errors: LayoutShape[] = [
  text("h-errors", X, E_Y, 760, "The error classifier decides what counts against a provider, and for whom", 3, false),
  ...CLASSES.flatMap(([err, act, tone], i): LayoutShape[] => {
    const y = E_Y + 24 + i * ROW;
    return [
      cell(`e-${i}`, X, y, ERR_W, 24, err, PROD_TONE.infra, 3, "soft"),
      cell(`a-${i}`, ACT_X, y, ACT_W, 24, act, tone, 3),
      { id: `ea-${i}`, type: "arrow", x: 0, y: 0, from: `e-${i}`, to: `a-${i}`, step: 3, quiet: true },
    ];
  }),
];
const END = E_Y + 24 + CLASSES.length * ROW;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Fallback and what it breaks: only the same model on B keeps schemas and safety, if its quota covers T0 cold",
  width: 880,
  height: END + 8,
  steps: [
    { title: "Every move loses the cache; only A → B keeps schemas and safety" },
    {
      title: `B's quota for T0 cold: ${r2(FAILOVER.midNeed)}M mid and ${r2(FAILOVER.smallNeed)}M small tokens a minute`,
    },
    { title: "The error classifier: what opens the breaker, and what moves one tenant" },
  ],
  shapes: [...matrix, ...quota, ...errors],
};

export default spec;
