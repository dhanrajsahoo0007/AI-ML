import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import {
  MODALITY_TONE,
  PROD_TONE,
  n,
  waterfall,
  waterfallSize,
  type WaterfallSpan,
} from "@/components/diagrams/presets/production";
import { VOICE_BUDGET as B, txt } from "@/components/diagrams/presets/production-speech";

// "The voice latency budget" on the Real-Time Voice Agents page (the Multimodal & Voice AI page reuses it by id): the
// time from the moment the caller stops talking to the first sound of the reply, as five stages in a row. Two
// waterfalls on one scale. All stage times are ILLUSTRATIVE design values except the model's 400 ms to first token (the
// Brightpost target, LATENCY.firstTokenMs). The default silence wait of 800 ms is Gemini Live's documented server
// default (about 800 ms; its page recommends 500-800 ms), read 16 November 2026.
//   Tuned:   wait 0-300, speech recognition tail 300-380 (80), language model 380-780 (400), speech synthesis 780-900
//            (120), telephony and network 900-1000 (100) = 1,000 ms.
//   Default: wait 0-800, then the same four stages = 800 + 80 + 400 + 120 + 100 = 1,500 ms.
// No steps. Canvas 860 wide; rows 30 px; both waterfalls share one scale and one 150 px label column.
// Colours (MODALITY_TONE + PROD_TONE): the wait lime (a check: the turn detector), recognition and synthesis violet
// (audio), the model green, telephony neutral; red for the over-budget total.

const X = 12;
const LABEL_W = 150;
const stages = (wait: number): WaterfallSpan[] => {
  const asr = wait + 0;
  return [
    { id: "wait", label: "Wait: end of turn", startMs: 0, durationMs: wait, tone: PROD_TONE.check },
    { id: "asr", label: "Recognition tail", startMs: asr, durationMs: B.asr, tone: MODALITY_TONE.audio },
    { id: "llm", label: "Model: first token", startMs: asr + B.asr, durationMs: B.llm, tone: MODALITY_TONE.model },
    {
      id: "tts",
      label: "Synthesis: first audio",
      startMs: asr + B.asr + B.llm,
      durationMs: B.tts,
      tone: MODALITY_TONE.audio,
    },
    {
      id: "net",
      label: "Phone and network",
      startMs: asr + B.asr + B.llm + B.tts,
      durationMs: B.network,
      tone: PROD_TONE.infra,
    },
  ];
};
const tuned = stages(B.endpoint);
const dflt = stages(B.defaultWait);

const scale = waterfallSize([...tuned, ...dflt], { width: 856, labelW: LABEL_W });
const common = { msPerPx: scale.msPerPx, labelW: LABEL_W, tickMs: 250 };
const TOP_Y = 34;
const top = waterfallSize(tuned, { ...common, total: { ms: B.total } });
const BOTTOM_HEAD_Y = TOP_Y + top.height + 18;
const BOTTOM_Y = BOTTOM_HEAD_Y + 28;
const bottom = waterfallSize(dflt, { ...common, total: { ms: B.totalWithDefault } });
const FOOT_Y = BOTTOM_Y + bottom.height + 10;

const head = (id: string, y: number, label: string, tone: LayoutTone = PROD_TONE.infra): LayoutShape =>
  txt(id, X, y, Math.ceil(label.length * 6.5) + 6, label, undefined, tone);

const shapes: LayoutShape[] = [
  head("h1", 6, "A tuned turn detector: wait 300 ms (illustrative)"),
  ...waterfall("top", X, TOP_Y, tuned, {
    ...common,
    total: { ms: B.total, label: `reply starts ${n(B.total)} ms after the caller stops` },
  }),
  head(
    "h2",
    BOTTOM_HEAD_Y,
    `The server default: wait ${B.defaultWait} ms (Gemini Live's documented default)`,
    PROD_TONE.failure
  ),
  ...waterfall("bot", X, BOTTOM_Y, dflt, {
    ...common,
    total: { ms: B.totalWithDefault, label: `reply starts ${n(B.totalWithDefault)} ms after the caller stops` },
  }),
  head(
    "foot",
    FOOT_Y,
    `${B.endpoint} + ${B.asr} + ${B.llm} + ${B.tts} + ${B.network} = ${n(B.total)} ms; changing only the wait gives ${B.defaultWait} + ${B.asr} + ${B.llm} + ${B.tts} + ${B.network} = ${n(B.totalWithDefault)} ms`
  ),
  head(
    "foot2",
    FOOT_Y + 20,
    "All stage times are illustrative except the model's 400 ms to first token, Brightpost's target."
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The voice latency budget: from the end of the caller's turn to the first sound of the reply",
  width: 880,
  height: FOOT_Y + 46,
  shapes,
};

export default spec;
