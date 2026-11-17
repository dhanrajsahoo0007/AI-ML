import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import {
  MODALITY_TONE,
  PROD_TONE,
  n,
  waterfall,
  waterfallSize,
  type WaterfallSpan,
} from "@/components/diagrams/presets/production";
import { BUDGET as B, TARGETS } from "@/components/diagrams/presets/gcase-voice";

// The voice agent's latency budget at p50 (design sheet §12): three turns on one millisecond scale, from the end of
// the caller's speech to audio at the caller's ear. Every value is BUDGET in presets/gcase-voice.ts (stage times
// illustrative except the model's first token, LATENCY.firstTokenMs = 400; commit 200 is the design point inside the
// sourced 150–300 ms range; synthesis 200 ms is measured first audible sound).
//   Sequential: leg 100 + wait 300 + first token 400 + first clause 100 + synthesis 200 + leg 100 = 1,200 ms; the
//               recognition commit (100 → 300) happens inside the wait.
//   Preemptive: leg 100 + max(wait 300, commit 200 + first token 400 + clause 100 + synthesis 200 = 900) + leg 100 =
//               1,100 ms; the wait runs in parallel and only gates playback.
//   Tool turn:  the filler starts when the tool call starts (700) and is heard at 100 + 200 + 400 + 50 (clip start) +
//               100 = 850 ms; the reply: 100 + 200 + 400 + tool call 300 (30 tokens at 100 a second) + get_tracking 300
//               + second first token 400 + clause 100 + synthesis 200 + leg 100 = 2,100 ms.
// Marks: the N2 target, p50 TARGETS.p50NoToolMs = 1,200 ms, and the concept page's 1,000 ms (BUDGET.conceptPage,
// VOICE_BUDGET.total on /ai-system-design/genai-system-design/real-time-voice-agents) for comparison.
// Steps: 1 sequential · 2 with preemptive generation · 3 a tool turn.
// Layout (880 wide): waterfall() from presets/production.ts three times with one shared msPerPx fitted to the tool turn
// (2,100 ms), a 150 px label column, rows 22 px; a heading over each; the working at the foot.
// Colours: phone legs neutral, the end-of-turn wait lime (a check), recognition, synthesis and the filler violet
// (audio, MODALITY_TONE), the model green, the tool teal.

const X = 12;
const LABEL_W = 150;
const clipStart = B.fillerHeard - B.leg - B.commit - B.firstToken - B.leg; // 50 ms to the clip's first sound

const s = (
  id: string,
  label: string,
  startMs: number,
  durationMs: number,
  tone: LayoutTone,
  step: number,
  note?: string
): WaterfallSpan => ({ id, label, startMs, durationMs, tone, step, note });

/** Sequential: the model starts only once the end of turn is confirmed. */
const seqModel = B.leg + B.wait;
const sequential: WaterfallSpan[] = [
  s("in", "Inbound phone leg", 0, B.leg, PROD_TONE.infra, 1),
  s("wait", "End of turn (wait)", B.leg, B.wait, GENAI_TONE.check, 1),
  s("commit", "Recognition commit", B.leg, B.commit, MODALITY_TONE.audio, 1, "inside the wait"),
  s("first", "Model: first token", seqModel, B.firstToken, GENAI_TONE.model, 1),
  s("clause", "First clause", seqModel + B.firstToken, B.clause, GENAI_TONE.model, 1),
  s("tts", "Synthesis: first sound", seqModel + B.firstToken + B.clause, B.synthesis, MODALITY_TONE.audio, 1),
  s("out", "Outbound phone leg", B.sequential - B.leg, B.leg, PROD_TONE.infra, 1),
];

/** Preemptive: the model starts on the final transcript; the wait only gates playback. */
const preModel = B.leg + B.commit;
const preemptive: WaterfallSpan[] = [
  s("in", "Inbound phone leg", 0, B.leg, PROD_TONE.infra, 2),
  s("wait", "End of turn (wait)", B.leg, B.wait, GENAI_TONE.check, 2, "in parallel"),
  s("commit", "Recognition commit", B.leg, B.commit, MODALITY_TONE.audio, 2),
  s("first", "Model: first token", preModel, B.firstToken, GENAI_TONE.model, 2),
  s("clause", "First clause", preModel + B.firstToken, B.clause, GENAI_TONE.model, 2),
  s("tts", "Synthesis: first sound", preModel + B.firstToken + B.clause, B.synthesis, MODALITY_TONE.audio, 2),
  s("out", "Outbound phone leg", B.preemptive - B.leg, B.leg, PROD_TONE.infra, 2),
];

/** A tool turn (preemptive): the filler covers the tool, the reply follows the second model call. */
const tCall = preModel + B.firstToken; // 700
const tTool = tCall + B.toolCall; // 1,000
const tSecond = tTool + B.tool; // 1,300
const tClause = tSecond + B.firstToken; // 1,700
const tTts = tClause + B.clause; // 1,800
const tool: WaterfallSpan[] = [
  s("in", "Inbound phone leg", 0, B.leg, PROD_TONE.infra, 3),
  s("wait", "End of turn (wait)", B.leg, B.wait, GENAI_TONE.check, 3, "in parallel"),
  s("commit", "Recognition commit", B.leg, B.commit, MODALITY_TONE.audio, 3),
  s("first", "Model: first token", preModel, B.firstToken, GENAI_TONE.model, 3),
  s("filler", "Filler clip starts", tCall, clipStart, MODALITY_TONE.audio, 3),
  s("call", "Model: tool call", tCall, B.toolCall, GENAI_TONE.model, 3, "30 tokens"),
  s("get", "get_tracking", tTool, B.tool, GENAI_TONE.tool, 3),
  s("second", "Model: first token", tSecond, B.firstToken, GENAI_TONE.model, 3),
  s("clause", "First clause", tClause, B.clause, GENAI_TONE.model, 3),
  s("tts", "Synthesis: first sound", tTts, B.synthesis, MODALITY_TONE.audio, 3),
  s("out", "Outbound phone leg", B.toolReply - B.leg, B.leg, PROD_TONE.infra, 3),
];

const scale = waterfallSize(tool, { width: 856, labelW: LABEL_W, total: { ms: B.toolReply } });
const common = { msPerPx: scale.msPerPx, labelW: LABEL_W, tickMs: 250, rowH: 22, barH: 16 };
const LABEL_ROW = 20; // room above each waterfall for the marker labels
/** x of a time on the shared scale (waterfall(): axis starts labelW + 10 to the right of x). */
const toX = (ms: number) => Math.round((X + LABEL_W + 10 + ms / scale.msPerPx) * 10) / 10;

/**
 * A dashed vertical marker through a waterfall drawn at `top` with `rows` rows, labelled above it: the label ends at
 * the line (`side: "left"`) or starts at it (`side: "right"`), so two marks 200 ms apart do not collide.
 */
function marker(
  id: string,
  ms: number,
  top: number,
  rows: number,
  label: string,
  side: "left" | "right",
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape[] {
  const x = toX(ms);
  const axisY = top + LABEL_ROW + 4 + rows * common.rowH + 4;
  const w = Math.ceil(label.length * 6.5) + 6;
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x, top + 18],
        [x, axisY],
      ],
      dashed: true,
      tone,
      step,
    },
    { id: `${id}-label`, type: "text", x: side === "left" ? x - w - 2 : x + 2, y: top, w, h: 18, label, tone, step },
  ];
}

const head = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});
const foot = (id: string, y: number, label: string, step: number): LayoutShape => ({
  ...head(id, y, label, step),
  w: 856,
});

const H1 = 4;
const W1 = H1 + 26;
const s1 = waterfallSize(sequential, { ...common, total: false });
const H2 = W1 + LABEL_ROW + s1.height + 14;
const W2 = H2 + 26;
const s2 = waterfallSize(preemptive, { ...common, total: false });
const H3 = W2 + LABEL_ROW + s2.height + 14;
const W3 = H3 + 26;
const s3 = waterfallSize(tool, { ...common, total: false });
const FOOT_Y = W3 + LABEL_ROW + s3.height + 10;

const shapes: LayoutShape[] = [
  head("h1", H1, `1 · Sequential: the model waits for the end of turn: ${n(B.sequential)} ms`, 1),
  ...waterfall("seq", X, W1 + LABEL_ROW, sequential, { ...common, step: 1, total: false }),
  ...marker("mark-seq-concept", B.conceptPage, W1, sequential.length, `concept page ${n(B.conceptPage)}`, "left", 1),
  ...marker(
    "mark-seq-heard",
    B.sequential,
    W1,
    sequential.length,
    `heard ${n(B.sequential)} = p50 target`,
    "right",
    1,
    GENAI_TONE.check
  ),
  head("h2", H2, `2 · With preemptive generation: the wait runs beside the model: ${n(B.preemptive)} ms`, 2),
  ...waterfall("pre", X, W2 + LABEL_ROW, preemptive, { ...common, step: 2, total: false }),
  ...marker("mark-pre-concept", B.conceptPage, W2, preemptive.length, `concept page ${n(B.conceptPage)}`, "left", 2),
  ...marker("mark-pre-heard", B.preemptive, W2 - 18, preemptive.length, n(B.preemptive), "left", 2),
  ...marker(
    "mark-pre-target",
    TARGETS.p50NoToolMs,
    W2 - 18,
    preemptive.length,
    `p50 target ${n(TARGETS.p50NoToolMs)}`,
    "right",
    2,
    GENAI_TONE.check
  ),
  head("h3", H3, `3 · A tool turn: filler heard at ${n(B.fillerHeard)} ms, reply at ${n(B.toolReply)} ms`, 3),
  ...waterfall("tool", X, W3 + LABEL_ROW, tool, { ...common, step: 3, total: false }),
  ...marker(
    "mark-filler",
    B.fillerHeard,
    W3,
    tool.length,
    `filler heard ${n(B.fillerHeard)}`,
    "right",
    3,
    MODALITY_TONE.audio
  ),
  ...marker("mark-tool-heard", B.toolReply, W3, tool.length, `reply heard ${n(B.toolReply)}`, "left", 3),
  foot(
    "f1",
    FOOT_Y,
    `Sequential ${B.leg} + ${B.wait} + ${B.firstToken} + ${B.clause} + ${B.synthesis} + ${B.leg} = ${n(B.sequential)}; preemptive ${B.leg} + max(${B.wait}, ${B.commit} + ${B.firstToken} + ${B.clause} + ${B.synthesis}) + ${B.leg} = ${n(B.preemptive)} ms`,
    2
  ),
  foot(
    "f2",
    FOOT_Y + 20,
    `Tool turn ${B.leg} + ${B.commit} + ${B.firstToken} + ${B.toolCall} + ${B.tool} + ${B.firstToken} + ${B.clause} + ${B.synthesis} + ${B.leg} = ${n(B.toolReply)} ms`,
    3
  ),
  foot(
    "f3",
    FOOT_Y + 40,
    "p50, illustrative stage times except the model's 400 ms first token; commit 150–300 ms in sources.",
    1
  ),
];

/** One announcement per step: the heading carries the NEW ring; bars, ticks, markers and sums are quiet. */
const quieted = shapes.map((sh) => (/^h\d$/.test(sh.id) ? sh : { ...sh, quiet: true }));

const spec: LayoutSpec = {
  kind: "layout",
  title:
    "The voice agent's latency budget: 1,200 ms sequential, 1,100 ms with preemptive generation, 2,100 ms with a tool",
  width: 880,
  height: FOOT_Y + 66,
  steps: [
    { title: `Sequential: ${n(B.sequential)} ms` },
    { title: `Preemptive generation: ${n(B.preemptive)} ms` },
    { title: `A tool turn: filler ${n(B.fillerHeard)} ms, reply ${n(B.toolReply)} ms` },
  ],
  shapes: quieted,
};

export default spec;
