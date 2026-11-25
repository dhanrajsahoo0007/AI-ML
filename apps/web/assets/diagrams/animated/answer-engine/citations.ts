import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { COPYRIGHT, VERIFIER } from "@/components/diagrams/presets/gcase-answer";

// Deep dive 2 of the answer-engine case study (design sheet §15.2, §13, §14): cite while writing, check every sentence
// before it is shown, restart on a drop. The answer engine's own example, the HTTP/3 question.
// The spans paraphrase their sources (checked): [1] RFC 9114: HTTP/3 maps HTTP semantics onto QUIC; [2] RFC 9000:
// QUIC is a UDP-based, multiplexed transport; [3] head-of-line blocking on TCP (the motivation RFC 9114 gives), shown
// from a generic CDN blog; [4] RFC 9001: QUIC's handshake uses TLS 1.3. Sentence 4 ("always twice as fast") is the
// kind of claim no span supports.
// Numbers from presets/gcase-answer.ts:
//   checks: rules (numbers, dates, names must appear in a cited span, ≈ 1 ms); a 0.8B checker on every sentence
//   (VERIFIER.msPerSentence = 60 ms p50); a 7B checker on the uncertain VERIFIER.bandTo7B = 20%; copy and harm checks.
//   drop rate VERIFIER.dropRate = 5% unsupported × 95% caught + 95% × 5% false rejects × 50% not rescued = 7.1% a
//   sentence; VERIFIER.expectedRestarts ≈ 0.80 an answer; VERIFIER.pLow ≈ 4.9% of quick answers end low-confidence.
//   copy state per origin across the whole answer (COPYRIGHT): running verbatim run ≤ 25 words, total ≤ 50 words,
//   ≤ 2 copied sentences in a row; four copied sentences of 19 words fail at the 2nd (run 38 > 25).
// Steps: 1 spans numbered · 2 sentences stream with [n] · 3 each sentence checked: shown, re-cited, dropped ·
//   4 restart from the last shown sentence; the copy state per origin.
// Layout (880 wide): spans x 20 (262 wide), sentences x 328 (304 wide), outcomes x 680 (180 wide), rows 62 apart from
// y 44; the check cascade as four boxes in a row at y 318; the restart and copy-state boxes at y 404; a footer line.
// Tones (GENAI_TONE): spans blue (retrieved text), sentences green (the model), shown green, re-cited lime (a check
// that fixed a pointer), dropped red, the cascade lime, the restart neutral, the copy state lime.

const ROW = (i: number) => 44 + i * 62;
const H = 50;
const SPAN = { x: 20, w: 262 } as const;
const SENT = { x: 328, w: 304 } as const;
const OUT = { x: 680, w: 180 } as const;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  step: number,
  h = H,
  highlight?: boolean
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, highlight });
const arrow = (id: string, from: string, to: string, step: number, dashed?: boolean): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  dashed,
});
const text = (id: string, x: number, y: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: "neutral",
  step,
});

const spans: [string, string][] = [
  ["[1] HTTP/3 maps HTTP onto QUIC", "rfc-editor.org · RFC 9114"],
  ["[2] QUIC runs on UDP, stream by stream", "rfc-editor.org · RFC 9000"],
  ["[3] On TCP, one lost packet stalls all", "a CDN engineering blog"],
  ["[4] QUIC's handshake uses TLS 1.3", "rfc-editor.org · RFC 9001"],
];
const sentences = [
  "HTTP/3 carries HTTP over QUIC, not TCP. [1]",
  "A lost packet stalls one stream only. [2][3]",
  "Encryption is built in: QUIC uses TLS 1.3. [2]",
  "HTTP/3 is always twice as fast. [3]",
];
const outcomes: [string, string, LayoutTone][] = [
  ["Shown", "support ✓ harm ✓ copy ✓", GENAI_TONE.model],
  ["Shown", "both cited spans needed", GENAI_TONE.model],
  ["Re-cited to [4]", "[2] does not say it; [4] does", GENAI_TONE.check],
  ["Dropped", "no span supports it", GENAI_TONE.failure],
];

const CASCADE_Y = ROW(4) + 26;
const cascade: [string, string][] = [
  ["Rules", "numbers, names in span · 1 ms"],
  ["0.8B checker", `every sentence · ${VERIFIER.msPerSentence} ms`],
  ["7B checker", `the uncertain ${Math.round(VERIFIER.bandTo7B * 100)}% only`],
  ["Copy and harm", "per origin · per sentence"],
];
const CW = 196;
const CG = (840 - 4 * CW) / 3;
const LAST_Y = CASCADE_Y + 86;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Citations are checked, not trusted: every sentence is shown, re-cited or dropped before the reader sees it",
  width: 880,
  height: LAST_Y + 56 + 34,
  steps: [
    { title: "The ranked spans are numbered" },
    { title: "Each sentence ends with the spans it rests on" },
    { title: "Each sentence is checked: shown, re-cited or dropped" },
    { title: "A drop restarts generation; copying is counted across the answer" },
  ],
  shapes: [
    text("h-spans", SPAN.x, 16, SPAN.w, "Ranked spans, numbered", 1),
    ...spans.map(([label, sub], i) => box(`span-${i}`, SPAN.x, ROW(i), SPAN.w, label, sub, GENAI_TONE.data, 1)),
    text("h-sent", SENT.x, 16, SENT.w, "Sentences as the model writes them", 2),
    ...sentences.map((label, i) => box(`sent-${i}`, SENT.x, ROW(i), SENT.w, label, undefined, GENAI_TONE.model, 2)),
    arrow("c-0", "sent-0", "span-0", 2),
    arrow("c-1a", "sent-1", "span-1", 2),
    arrow("c-1b", "sent-1", "span-2", 2),
    text("h-out", OUT.x, 16, OUT.w, "Checked, then", 3),
    ...outcomes.map(([label, sub, tone], i) => box(`out-${i}`, OUT.x, ROW(i), OUT.w, label, sub, tone, 3, H, i === 3)),
    ...outcomes.map((_, i) => arrow(`o-${i}`, `sent-${i}`, `out-${i}`, 3)),
    arrow("c-2", "sent-2", "span-3", 3, true),
    ...cascade.map(([label, sub], i) =>
      box(`cas-${i}`, 20 + i * (CW + CG), CASCADE_Y, CW, label, sub, GENAI_TONE.check, 3, 46)
    ),
    ...cascade.slice(1).map((_, i) => arrow(`cas-a${i}`, `cas-${i}`, `cas-${i + 1}`, 3)),
    box(
      "restart",
      20,
      LAST_Y,
      410,
      "Restart after sentence 3, claim excluded",
      "cached prompt: next token ≈ 300 ms; never retracted",
      "neutral",
      4,
      56
    ),
    box(
      "copy",
      450,
      LAST_Y,
      410,
      "Copy state per origin, across sentences",
      `run ≤ ${COPYRIGHT.runCapWords} words · total ≤ ${COPYRIGHT.totalCapWords} · ≤ ${COPYRIGHT.consecutiveCopiedCap} copied in a row`,
      GENAI_TONE.check,
      4,
      56
    ),
    text(
      "foot",
      20,
      LAST_Y + 68,
      840,
      `Drops ${pct(VERIFIER.dropRate)} a sentence → ${VERIFIER.expectedRestarts.toFixed(2)} restarts an answer; ${pct(VERIFIER.pLow)} end low-confidence. Four copied ${COPYRIGHT.sentenceWords}-word sentences fail at the 2nd.`,
      4
    ),
  ],
};

export default spec;
