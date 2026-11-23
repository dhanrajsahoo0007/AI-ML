import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { PRICES } from "@/components/diagrams/presets/gcase-answer";
import { STICKY, SUPPORT, REQUEST_LAYOUT } from "@/components/diagrams/presets/gcase-gateway";

// Prompt-cache-aware sticky routing (llm-platform-gateway, design sheet §15.3 and Step 4; preset STICKY, SUPPORT,
// REQUEST_LAYOUT in presets/gcase-gateway.ts; prices PRICES.mid from gcase-answer, as of November 2026).
//   Step 1: the sticky key team + alias + conversation (support-agent:c_88d1) holds provider, workspace and Region for
//   the cache's lifetime (STICKY.idleMinutes.fiveMinuteTtl = 5 min for support); the first call writes the changing
//   2,300 tokens, its follow-ups read; after 5 idle minutes the key lapses. It drops when the target's breaker opens or
//   its canaries fail. The prefix registry records (provider, workspace, model, hash to the breakpoint) → last seen: it
//   forecasts and alerts, it never admits. On C (the assistant only) prompt_cache_key spreads a hot prefix over
//   STICKY.assistantBuckets = ⌈60.4 ÷ 15⌉ = 5 buckets.
//   Step 2: the determinism check: the same input through two replicas on one version gives the same bytes (reads);
//   the tracing build on half the replicas puts the request id into the system prompt, so the same input gives
//   different bytes and every call writes. Hash prefixes are illustrative.
//   Step 3: what a broken prefix costs support a day: SUPPORT.cachedPerMessage = 6,085 cached tokens a message;
//   caching switched off 6,085 × (2.00 − 0.10) less the write premiums no longer paid = STICKY.offPerDay ≈ 2,193 USD;
//   every call writing at 2.50 instead of reading at 0.10: 6,085 × 2.40 = 0.0146 a message × 200,000 =
//   STICKY.writesPerDay ≈ 2,921 USD, against support's whole model bill SUPPORT.spendPerDay ≈ 1,801 (× 1.6).
// Layout (880 wide): step 1 key → target boxes with a row of four call cells beneath; step 2 an input box fanning to
// three replica rows (replica, bytes, outcome); step 3 three bars on one scale to 3,000 USD a day.
// Colours: the key lime (a routing decision), provider A green, writes violet (a cache write), reads blue, a lapse
// grey; matching bytes lime, different bytes red; cost bars grey (the bill) and red (the loss).

const X = 12;
const usd = (v: number) => `${n(Math.round(v))} USD`;
/** Three significant figures, as the sheet rounds: 2,920.8 → 2,920; 2,192.8 → 2,190. */
const usd3 = (v: number) => `≈ ${n(Math.round(v / 10) * 10)} USD`;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  quiet = true,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet });

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
  quiet = true,
  h = 26
): LayoutShape => ({ id, type: "cell", x, y, w, h, label, tone, fill: "pastel", step, quiet });

const arrow = (id: string, from: string, to: string, step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  quiet: true,
  ...extra,
});

// Step 1: the sticky key and one conversation's calls.
const S1 = 30;
const ttl = STICKY.idleMinutes.fiveMinuteTtl;
const CALL_W = 206;
const calls: [string, LayoutTone][] = [
  [`call 1: writes ${n(REQUEST_LAYOUT.changing)}`, GENAI_TONE.store],
  [`call 2: reads ${n(REQUEST_LAYOUT.total)}`, GENAI_TONE.data],
  [`turn 2: reads ${n(REQUEST_LAYOUT.stable)}+`, GENAI_TONE.data],
  [`idle > ${ttl} min: key lapses`, PROD_TONE.infra],
];
const step1: LayoutShape[] = [
  text("h1", X, 4, 640, "One conversation sticks to the provider, workspace and Region that hold its cache", 1),
  box("key", X, S1, 250, 50, "support-agent:c_88d1", "team + alias + conversation", GENAI_TONE.rank, 1, false),
  box(
    "target",
    330,
    S1,
    260,
    50,
    "Provider A, ws-support",
    `same Region, ${ttl} min (the cache's life)`,
    GENAI_TONE.model,
    1
  ),
  arrow("key-target", "key", "target", 1),
  box("drop", 670, S1, 198, 50, "Drops the key", "breaker opens, canaries fail", PROD_TONE.infra, 1),
  arrow("target-drop", "target", "drop", 1, { dashed: true }),
  ...calls.map(([label, tone], i) => cell(`call-${i}`, X + i * (CALL_W + 10), S1 + 64, CALL_W, label, tone, 1)),
  text(
    "registry",
    X,
    S1 + 100,
    856,
    "Prefix registry: (provider, workspace, model, hash to the breakpoint) → last seen. It forecasts and alerts; it never admits.",
    1
  ),
  text(
    "buckets",
    X,
    S1 + 120,
    856,
    `On C (the assistant only): prompt_cache_key = alias:prefix-hash:bucket, over ${STICKY.assistantBuckets} buckets (${STICKY.assistantRpm.toFixed(1)} calls a minute ÷ ${STICKY.rpmPerKey})`,
    1
  ),
];

// Step 2: the determinism check across replicas.
const S2 = S1 + 160;
const ROWS: [string, string, string, LayoutTone][] = [
  ["Replica 1, v412", "bytes 4be1…", "same bytes: cache read", GENAI_TONE.check],
  ["Replica 2, v412", "bytes 4be1…", "same bytes: cache read", GENAI_TONE.check],
  ["Replica 2, v413 (tracing)", "bytes 9c07…", "request id in the prompt: write", GENAI_TONE.failure],
];
const R_PITCH = 34;
const step2: LayoutShape[] = [
  text("h2", X, S2, 760, "The determinism check: the same input through every replica and both versions", 2, false),
  box("input", X, S2 + 30, 170, 92, "Same input", "40 golden requests", PROD_TONE.infra, 2),
  ...ROWS.flatMap(([rep, bytes, outcome, tone], i): LayoutShape[] => {
    const y = S2 + 30 + i * R_PITCH;
    return [
      cell(`rep-${i}`, 250, y, 210, rep, PROD_TONE.infra, 2),
      cell(`bytes-${i}`, 470, y, 120, bytes, tone, 2),
      cell(`out-${i}`, 600, y, 268, outcome, tone, 2, i !== 2),
      arrow(`in-${i}`, "input", `rep-${i}`, 2, { via: [[224, y + 13]] }),
    ];
  }),
];

// Step 3: what a broken prefix costs support a day.
const S3 = S2 + 30 + ROWS.length * R_PITCH + 20;
const X0 = 270;
const BAR_W = 520;
const MAX = 3_000;
const bx = (v: number) => Math.round((v / MAX) * BAR_W);
const bars: [string, number, LayoutTone, string][] = [
  ["Support's whole model bill", SUPPORT.spendPerDay, PROD_TONE.infra, ""],
  ["Caching switched off", STICKY.offPerDay, GENAI_TONE.failure, ""],
  [
    "Every call writing its prefix",
    STICKY.writesPerDay,
    GENAI_TONE.failure,
    `${(STICKY.writesPerDay / SUPPORT.spendPerDay).toFixed(1)} × the bill`,
  ],
];
const step3: LayoutShape[] = [
  text("h3", X, S3, 760, "What a broken prefix costs support, a day", 3, false),
  ...bars.flatMap(([label, v, tone, note], i): LayoutShape[] => {
    const y = S3 + 26 + i * 32;
    return [
      text(`bl-${i}`, X, y + 4, 250, label, 3),
      cell(`bar-${i}`, X0, y, bx(v), i === 0 ? usd(v) : usd3(v), tone, 3),
      ...(note ? [text(`bn-${i}`, X0 + bx(v) + 8, y + 4, 90, note, 3)] : []),
    ];
  }),
  text(
    "working",
    X,
    S3 + 26 + bars.length * 32 + 4,
    856,
    `${n(SUPPORT.cachedPerMessage)} cached tokens a message × (${PRICES.mid.cacheWrite.toFixed(2)} − ${PRICES.mid.cached.toFixed(2)}) = ${STICKY.writesPerMessage.toFixed(4)} USD × 200,000 messages a day`,
    3
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `Cache-aware stickiness: one conversation, one cache; a non-deterministic byte costs ${usd3(STICKY.writesPerDay)} a day`,
  width: 880,
  height: S3 + 26 + bars.length * 32 + 30,
  steps: [
    { title: `A sticky key holds provider, workspace and Region for the cache's ${ttl} minutes` },
    { title: "The determinism check: the same input, the same bytes, on every replica" },
    { title: `What a broken prefix costs: ${usd3(STICKY.offPerDay)} to ${usd3(STICKY.writesPerDay)} a day` },
  ],
  shapes: [...step1, ...step2, ...step3],
};

export default spec;
