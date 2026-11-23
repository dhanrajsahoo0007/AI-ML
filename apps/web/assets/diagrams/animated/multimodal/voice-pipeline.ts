import type { DiagramSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";

// "The voice pipeline" on the Real-Time Voice Agents page (the Multimodal & Voice AI page reuses it by id): one turn of
// the Brightpost phone line through a cascaded agent, and what happens when the caller interrupts.
//
// Seven steps: 1 the caller speaks; audio streams in · 2 the turn detector finds speech and the end of the turn · 3 the
// recogniser turns the speech into text · 4 the model calls a tool (get_order); step 3 is the text reaching the model · 5 speech synthesis
// starts on the model's first clause · 6 audio chunks wait in the playback buffer and play to the caller · 7 the caller
// interrupts: the turn detector hears new speech, flushes the playback buffer and cancels the model's reply. Nodes never
// move; the barge-in path is two dashed edges that appear in step 7.
//
// Layout (centres): caller (80, 250) · row 1 y 110: turn detector x 240, recogniser x 430, model x 620, tools x 810 ·
// row 2 y 420: playback buffer x 240, speech synthesis x 620. Vertical edges: turn detector to playback buffer (x 240),
// model to synthesis (x 620). The cancel edge leaves the turn detector's top and runs along y 40 to the model's top.
// Colours (MODALITY_TONE): audio violet (caller, recogniser, synthesis, buffer), the turn detector lime (a check), the
// model green (the accent), tools teal, arrows neutral. Four tones plus neutral.

const COL = { caller: 80, vad: 240, asr: 430, llm: 620, tools: 810 } as const;
const ROW = { top: 110, caller: 265, bottom: 420 } as const;

const spec: DiagramSpec = {
  title: "The voice pipeline: one turn, and an interruption",
  width: 880,
  height: 490,
  steps: [
    { title: "The caller speaks; audio streams in" },
    { title: "The turn detector passes speech to the recogniser" },
    { title: "The text reaches the language model" },
    { title: "The model calls a tool for the order" },
    { title: "Speech synthesis starts on the first clause" },
    { title: "Audio chunks play to the caller" },
    { title: "The caller interrupts: stop playing, cancel the reply" },
  ],
  zones: [],
  nodes: [
    {
      id: "caller",
      label: "Caller",
      sub: `phone, order ${BRIGHTPOST.orderId}`,
      icon: "phone",
      tone: MODALITY_TONE.audio,
      variant: "glyph",
      x: COL.caller,
      y: ROW.caller,
    },
    {
      id: "vad",
      label: "Turn detector",
      sub: "speech or silence?",
      icon: "activity",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: COL.vad,
      y: ROW.top,
      w: 160,
    },
    {
      id: "asr",
      label: "Recogniser",
      sub: "audio to text",
      icon: "audio-lines",
      tone: MODALITY_TONE.audio,
      fill: "pastel",
      step: 2,
      x: COL.asr,
      y: ROW.top,
      w: 160,
    },
    {
      id: "llm",
      label: "Language model",
      sub: "text to text",
      icon: "model",
      tone: MODALITY_TONE.model,
      accent: true,
      step: 3,
      x: COL.llm,
      y: ROW.top,
      w: 176,
    },
    {
      id: "tools",
      label: "Tools",
      sub: "get_order",
      icon: "tool",
      tone: PROD_TONE.compute,
      fill: "pastel",
      step: 4,
      x: COL.tools,
      y: ROW.top,
      w: 110,
    },
    {
      id: "tts",
      label: "Speech synthesis",
      sub: "text to audio",
      icon: "mic",
      tone: MODALITY_TONE.audio,
      fill: "pastel",
      step: 5,
      x: COL.llm,
      y: ROW.bottom,
      w: 160,
    },
    {
      id: "buffer",
      label: "Playback buffer",
      sub: "audio waiting to play",
      icon: "volume-2",
      tone: MODALITY_TONE.audio,
      fill: "pastel",
      step: 6,
      x: COL.vad,
      y: ROW.bottom,
      w: 160,
    },
  ],
  edges: [
    // Step 1: the caller's audio streams to the turn detector.
    { from: "caller", to: "vad", label: "phone audio", packet: true },
    // Step 2: the detector passes on the speech once the turn has ended.
    { from: "vad", to: "asr", packet: true, step: 2 },
    // Step 3: text to the model.
    { from: "asr", to: "llm", packet: true, step: 3 },
    // Step 4: the model asks for the order and gets it back.
    { from: "llm", to: "tools", bidirectional: true, packet: true, step: 4 },
    // Step 5: the model's first clause goes to speech synthesis.
    { from: "llm", to: "tts", label: "first clause", packet: true, step: 5 },
    // Step 6: audio chunks go to the buffer and on to the caller.
    { from: "tts", to: "buffer", label: "audio chunks", packet: true, step: 6 },
    { from: "buffer", to: "caller", label: "reply", packet: true, step: 6 },
    // Step 7: barge-in. The detector hears the caller again: flush the buffer, cancel the model.
    { from: "vad", to: "buffer", label: "stop playing", dashed: true, flow: true, step: 7 },
    {
      from: "vad",
      to: "llm",
      label: "cancel the reply",
      dashed: true,
      flow: true,
      via: [
        [COL.vad, 40],
        [COL.llm, 40],
      ],
      labelAt: 0.5,
      step: 7,
    },
  ],
};

export default spec;
