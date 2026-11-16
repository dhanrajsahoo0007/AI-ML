import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { TTS, arr, bx, txt } from "@/components/diagrams/presets/production-speech";

// "From text to a voice" on the Speech: ASR & TTS page: the classic two-stage text-to-speech pipeline. Text is
// normalised (digits and symbols written out as words), an acoustic model predicts acoustic frames (for example mel
// spectrogram frames), and a vocoder turns the frames into waveform samples. A second design skips the frames: a
// language model writes discrete audio-codec tokens and a codec decoder produces the waveform (named in the footer).
// Numbers (TTS in the preset; ILLUSTRATIVE settings): 24,000 Hz output, one frame every 10 ms, so one second of speech =
// 100 frames and 24,000 samples; the vocoder makes 24,000 / 100 = 240 samples from each frame.
//
// Steps: 1 text · 2 normalise · 3 acoustic model · 4 frames · 5 vocoder · 6 waveform.
// Grid: six boxes 112 x 64 at x 16 + 146 * i, y 60; notes under each from y 140; footer at y 232.
// Colours (MODALITY_TONE): text orange, models green, audio violet, the normaliser neutral.

const X = (i: number) => 16 + 146 * i;
const Y = 60;
const W = 112;
const H = 64;
const note = (
  id: string,
  i: number,
  row: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => txt(id, X(i) - 14, 138 + row * 20, W + 28, label, step, tone);

const shapes: LayoutShape[] = [
  txt("lead", 20, 16, 300, "Brightpost's phone agent says its reply aloud", 1),
  bx("text", X(0), Y, W, H, MODALITY_TONE.text, "Text", { sub: "the reply", step: 1 }),
  note("n1a", 0, 0, "“Refund of £42 for", 1, MODALITY_TONE.text),
  note("n1b", 0, 1, "order 4471 approved”", 1, MODALITY_TONE.text),

  bx("norm", X(1), Y, W, H, PROD_TONE.infra, "Normalise", { sub: "write it out", step: 2 }),
  arr("a1", "text", "norm", 2),
  note("n2a", 1, 0, "£42 → forty-two", 2),
  note("n2b", 1, 1, "pounds; 4471 → four", 2),
  note("n2c", 1, 2, "four seven one", 2),

  bx("acou", X(2), Y, W, H, MODALITY_TONE.model, "Acoustic\nmodel", { step: 3 }),
  arr("a2", "norm", "acou", 3),
  note("n3a", 2, 0, "decides how it sounds:", 3),
  note("n3b", 2, 1, "pitch, pace, stress", 3),

  bx("frames", X(3), Y, W, H, MODALITY_TONE.audio, "Acoustic\nframes", { step: 4 }),
  arr("a3", "acou", "frames", 4),
  note("n4a", 3, 0, `one frame every ${TTS.frameMs} ms`, 4, MODALITY_TONE.audio),
  note("n4b", 3, 1, `= ${TTS.framesPerSec} frames a second`, 4, MODALITY_TONE.audio),

  bx("voc", X(4), Y, W, H, MODALITY_TONE.model, "Vocoder", { sub: "frames → samples", step: 5 }),
  arr("a4", "frames", "voc", 5),
  note("n5a", 4, 0, `each frame → ${TTS.samplesPerFrame}`, 5),
  note("n5b", 4, 1, `samples (${n(TTS.sampleRate)} ÷ ${TTS.framesPerSec})`, 5),

  bx("wave", X(5), Y, W, H, MODALITY_TONE.audio, "Waveform", { sub: "to the caller", step: 6 }),
  arr("a5", "voc", "wave", 6),
  note("n6a", 5, 0, `${n(TTS.sampleRate)} numbers`, 6, MODALITY_TONE.audio),
  note("n6b", 5, 1, "for each second", 6, MODALITY_TONE.audio),

  txt(
    "foot1",
    20,
    214,
    840,
    "Settings are illustrative. Another design skips the frames: a language model writes discrete audio-codec",
    6
  ),
  txt("foot2", 20, 232, 840, "tokens, and a codec decoder turns them into the waveform.", 6),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Text to speech: text, normaliser, acoustic model, vocoder, waveform",
  width: 880,
  height: 262,
  steps: [
    { title: "Start from the reply text" },
    { title: "Write digits and symbols out as words" },
    { title: "The acoustic model plans the sound" },
    { title: "Acoustic frames: a compact picture of the sound" },
    { title: "The vocoder draws the waveform from the frames" },
    { title: "Audio goes down the phone line" },
  ],
  shapes,
};

export default spec;
