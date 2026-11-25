import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { arr, bx, txt } from "@/components/diagrams/presets/production-speech";

// "Cascade or speech-to-speech" on the Real-Time Voice Agents page. Top: the cascade, three models and two text hops:
// audio in -> recogniser -> text -> language model -> text -> speech synthesis -> audio out. Bottom: a speech-to-speech
// model that takes audio and returns audio, with no text hop between (the model may still emit a transcript and calls
// tools; the OpenAI Realtime and Gemini Live docs, read 16 November 2026, both describe function calling). No numbers.
// No steps (one comparison read together).
// Grid: seven blocks 96 x 52 at x 32 + 120 * i (pitch 120), cascade row y 56, notes y 124-166; speech-to-speech row y 230,
// notes y 298-340. Colours (MODALITY_TONE): audio violet, text orange, the model green (the accent).

const X = (i: number) => 32 + 120 * i;
const W = 96;
const H = 52;

const cascade: [string, string, "audio" | "text" | "model"][] = [
  ["a1", "Audio in", "audio"],
  ["asr", "Recogniser", "model"],
  ["t1", "Text", "text"],
  ["llm", "Language\nmodel", "model"],
  ["t2", "Text", "text"],
  ["tts", "Synthesis", "model"],
  ["a2", "Audio out", "audio"],
];

const shapes: LayoutShape[] = [
  txt("h1", 32, 16, 330, "Cascade: three models, two text hops", undefined, PROD_TONE.infra),
];
cascade.forEach(([id, label, kind], i) => {
  shapes.push(
    bx(
      id,
      X(i),
      56,
      W,
      H,
      kind === "audio" ? MODALITY_TONE.audio : kind === "text" ? MODALITY_TONE.text : MODALITY_TONE.model,
      label
    )
  );
  if (i > 0) shapes.push(arr(`c-${i}`, cascade[i - 1][0], id));
});
const note = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => txt(id, x, y, w, label, undefined, tone);
shapes.push(
  note(
    "c-p1",
    32,
    126,
    800,
    "+ Every hop is text: log it, test it, run guardrails on it, swap any stage on its own.",
    PROD_TONE.check
  ),
  note(
    "c-p2",
    32,
    148,
    800,
    "+ Pick the best recogniser, model and voice separately; use any language model you like.",
    PROD_TONE.check
  ),
  note(
    "c-m1",
    32,
    170,
    800,
    "− The times add up (see the latency budget), and tone, hesitation and laughter are lost at the text hop.",
    PROD_TONE.infra
  ),

  txt("h2", 32, 220, 330, "Speech to speech: one model, audio in, audio out", undefined, PROD_TONE.infra),
  bx("s-in", X(0), 260, W, H, MODALITY_TONE.audio, "Audio in"),
  bx("s-model", X(2), 260, W * 3 + 48, H, MODALITY_TONE.model, "Speech-to-speech model", {
    sub: "hears and speaks, one step",
  }),
  bx("s-out", X(6), 260, W, H, MODALITY_TONE.audio, "Audio out"),
  arr("s-1", "s-in", "s-model"),
  arr("s-2", "s-model", "s-out"),
  note(
    "s-p1",
    32,
    330,
    800,
    "+ One hop: no wait between stages, and the model hears how something was said, not only what.",
    PROD_TONE.check
  ),
  note(
    "s-m1",
    32,
    352,
    800,
    "− Harder to inspect and to guard: you check the audio or a side transcript, not a clean text hop.",
    PROD_TONE.infra
  ),
  note(
    "s-m2",
    32,
    374,
    800,
    "− Tools still work (the model asks, you run the call), but you take the vendor's model and voices.",
    PROD_TONE.infra
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A cascaded voice agent against a speech-to-speech model",
  width: 880,
  height: 404,
  shapes,
};

export default spec;
