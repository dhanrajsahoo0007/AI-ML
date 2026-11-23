import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";
import { OVERHEAD, REDACTION_EVAL } from "@/components/diagrams/presets/gcase-gateway";

// Redaction across turns, and its latency (llm-platform-gateway, design sheet §15.4 and Step 5; preset REDACTION_EVAL
// and OVERHEAD in presets/gcase-gateway.ts). The conversation c_88d1 of the walk-through; values illustrative.
//   Step 1, turn 1: support posts the new message to /v1/scan while it loads the case; regex maps the email to
//   [EMAIL_51b2e0], the CPU name scanner maps "Sarah Collins" to [PERSON_7f3a9c] (type + HMAC of the value under the
//   conversation key, so the same text always gives the same bytes); both pairs go into the encrypted per-conversation
//   dictionary; the call leaves with placeholders only.
//   Step 2, the stream back, per output channel: user-visible text restored; a tool-call argument restored only in an
//   allow-listed field (order_lookup.email); never inside a URL or link target (an injected instruction could
//   otherwise make the model leak the value outward).
//   Step 3, turn 3: the tenant re-sends its stored reply "Hi Sarah Collins"; the dictionary pass (an exact match,
//   REDACTION_EVAL.dictionaryMs ≈ 0.1 ms over ≈ 20 KB) turns it back into the placeholder, no NER needed; the gate:
//   0 raw values from earlier turns in later calls over 500 conversations × 4 turns.
//   Step 4, latency: regex REDACTION_EVAL.regexMs 0.2 and dictionary 0.1 ms inline; the pre-scan /v1/scan hop 1 +
//   queue 2 + CPU NER 13.5 p50 = 16.5 ms (33 at the assumed 30 ms NER p95) inside support's 30 ms case-load stage:
//   hidden at p50, ≤ 3 ms exposed at p95 (OVERHEAD.prescan).
// Layout (880 wide): step 1 message → pre-scan → dictionary boxes with the outgoing text beneath; step 2 a three-row
// table (channel, what the model wrote, what the caller gets); step 3 stored reply → dictionary pass → outgoing;
// step 4 a waterfall() on one millisecond scale with the case-load end marked.
// Colours: the customer's words orange, scans lime (checks), the dictionary violet (a store), restored green, refused
// red, the case load grey.

const X = 12;

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
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  quiet = true
): LayoutShape => ({ id, type: "box", x, y, w, h: 50, label, sub, tone, fill: "pastel", step, quiet });

const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number,
  quiet = true,
  fill: LayoutShape["fill"] = "pastel"
): LayoutShape => ({ id, type: "cell", x, y, w, h: 26, label, tone, fill, step, quiet });

const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  quiet: true,
});

const PERSON = "[PERSON_7f3a9c]";
const EMAIL = "[EMAIL_51b2e0]";

// Step 1: turn 1, pre-scan and the dictionary.
const S1 = 30;
const step1: LayoutShape[] = [
  text("h1", X, 4, 640, "Turn 1: names and identifiers leave as placeholders", 1),
  box("msg", X, S1, 250, "New customer message", "“I'm Sarah Collins, sarah.c@…”", GENAI_TONE.user, 1, false),
  box("scan", 320, S1, 220, "Pre-scan, /v1/scan", "regex + CPU name scan", GENAI_TONE.check, 1),
  box("dict", 610, S1, 258, "Dictionary, c_88d1", "encrypted, per conversation", GENAI_TONE.store, 1),
  arrow("msg-scan", "msg", "scan", 1),
  arrow("scan-dict", "scan", "dict", 1),
  cell("d1", 610, S1 + 58, 258, `Sarah Collins → ${PERSON}`, GENAI_TONE.store, 1, true, "soft"),
  cell("d2", 610, S1 + 88, 258, `sarah.c@… → ${EMAIL}`, GENAI_TONE.store, 1, true, "soft"),
  text("out1", X, S1 + 62, 560, `Leaves for the provider: “I'm ${PERSON}, ${EMAIL}”`, 1),
  text("out1b", X, S1 + 82, 560, "Type + HMAC under the conversation key: the same text, the same bytes", 1),
];

// Step 2: the stream back, per output channel.
const S2 = S1 + 132;
const CH_W = 250;
const BEFORE_W = 250;
const AFTER_X = X + CH_W + BEFORE_W + 20;
const AFTER_W = 868 - AFTER_X;
const channels: [string, string, string, LayoutTone][] = [
  ["Text the customer reads", `Hi ${PERSON}`, "restored: Hi Sarah Collins", GENAI_TONE.model],
  ["order_lookup.email (allow-listed)", EMAIL, "restored: sarah.c@…", GENAI_TONE.model],
  ["A URL or link target", `…?u=${EMAIL}`, "never restored: placeholder stays", GENAI_TONE.failure],
];
const step2: LayoutShape[] = [
  text("h2", X, S2, 760, "The stream back: restored per output channel, never inside a URL", 2, false),
  ...channels.flatMap(([ch, before, after, tone], i): LayoutShape[] => {
    const y = S2 + 26 + i * 32;
    return [
      cell(`ch-${i}`, X, y, CH_W, ch, PROD_TONE.infra, 2, true, "soft"),
      cell(`before-${i}`, X + CH_W + 10, y, BEFORE_W, before, PROD_TONE.infra, 2),
      cell(`after-${i}`, AFTER_X, y, AFTER_W, after, tone, 2, i !== 2),
    ];
  }),
];

// Step 3: turn 3, the dictionary pass.
const S3 = S2 + 26 + channels.length * 32 + 16;
const step3: LayoutShape[] = [
  text("h3", X, S3, 760, "Turn 3: the tenant re-sends what the gateway restored; the dictionary catches it", 3, false),
  box("stored", X, S3 + 26, 250, "Recent turns, stored", "“Hi Sarah Collins”", GENAI_TONE.user, 3),
  box(
    "pass",
    320,
    S3 + 26,
    220,
    "Dictionary pass",
    `exact match, ≈ ${REDACTION_EVAL.dictionaryMs} ms`,
    GENAI_TONE.check,
    3
  ),
  box("leaves", 610, S3 + 26, 258, "Leaves as", `“Hi ${PERSON}”`, GENAI_TONE.model, 3),
  arrow("stored-pass", "stored", "pass", 3),
  arrow("pass-leaves", "pass", "leaves", 3),
  text(
    "gate3",
    X,
    S3 + 84,
    856,
    `Gate: 0 raw values from earlier turns in later calls, ${REDACTION_EVAL.carryOver.conversations} conversations × ${REDACTION_EVAL.carryOver.turns} turns`,
    3
  ),
];

// Step 4: the latency strip.
const S4 = S3 + 116;
const p = OVERHEAD.prescan;
const spans: WaterfallSpan[] = [
  { id: "load", label: "Support loads the case", startMs: 0, durationMs: p.overlapMs, tone: PROD_TONE.infra },
  {
    id: "scan50",
    label: "Pre-scan, p50",
    startMs: 0,
    durationMs: p.totalP50,
    tone: GENAI_TONE.check,
    note: `hop ${p.hopMs} + queue ${p.queueMs} + NER ${p.nerP50}`,
  },
  {
    id: "scan95",
    label: "Pre-scan, p95 (NER assumed)",
    startMs: 0,
    durationMs: p.totalP95,
    tone: GENAI_TONE.check,
    note: `${p.exposedP95} ms exposed`,
  },
  {
    id: "inline",
    label: "On the call: regex + dictionary",
    startMs: p.overlapMs,
    durationMs: REDACTION_EVAL.regexMs + REDACTION_EVAL.dictionaryMs,
    tone: GENAI_TONE.check,
    note: `${REDACTION_EVAL.regexMs} + ${REDACTION_EVAL.dictionaryMs} ms`,
  },
];
const wfOpts = {
  width: 856,
  labelW: 220,
  tickMs: 5,
  rowH: 26,
  barH: 18,
  total: false as const,
  marks: [{ ms: p.overlapMs, label: `case load ends, ${p.overlapMs} ms` }],
};
const wf = waterfallSize(spans, wfOpts);
const step4: LayoutShape[] = [
  text(
    "h4",
    X,
    S4,
    760,
    `The name scan runs while support loads the case: hidden at p50, ≤ ${p.exposedP95} ms at p95`,
    4,
    false
  ),
  ...waterfall("lat", X, S4 + 24, spans, { ...wfOpts, step: 4 }).map((s) => ({ ...s, quiet: true })),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Redaction across turns: placeholders out, restored per channel, caught again by the dictionary on turn 3",
  width: 880,
  height: S4 + 24 + wf.height + 8,
  steps: [
    { title: "Turn 1: pre-scan, placeholders, the conversation dictionary" },
    { title: "The stream back: restored in text and allow-listed arguments, never in URLs" },
    { title: "Turn 3: the dictionary pass catches the values the gateway restored" },
    { title: `Latency: the scan hides in support's ${p.overlapMs} ms case load` },
  ],
  shapes: [...step1, ...step2, ...step3, ...step4],
};

export default spec;
