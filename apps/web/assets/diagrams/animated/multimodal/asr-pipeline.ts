import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { WHISPER, arr, bx, txt } from "@/components/diagrams/presets/production-speech";

// "From sound to text" on the Speech: ASR & TTS page: the Whisper recipe (Radford et al., 2022, arXiv 2212.04356,
// section 2.2, checked 16 November 2026). Audio is resampled to 16,000 Hz and cut into 30 s chunks; an 80-channel
// log-magnitude Mel spectrogram is computed on 25 ms windows with a 10 ms stride; the encoder of an encoder-decoder
// Transformer starts with two convolution layers, the second with stride 2; the decoder writes text tokens.
// Arithmetic (WHISPER in the preset): 16,000 x 30 = 480,000 samples; 30,000 ms / 10 ms = 3,000 frames of 80 numbers;
// 3,000 / 2 = 1,500 encoder positions (derived from the stride, not printed in the paper).
//
// Steps: 1 the waveform · 2 the log-mel spectrogram · 3 the encoder · 4 the decoder · 5 text tokens (and the feedback).
// Grid: five boxes 130 x 70 at x 30, 200, 370, 540, 710 (pitch 170), y 70; notes under each box from y 156.
// Colours (MODALITY_TONE): audio violet (waveform, spectrogram), the model green (encoder, decoder), text orange.

const XS = [30, 200, 370, 540, 710];
const Y = 70;
const W = 130;
const H = 70;
const note = (
  id: string,
  i: number,
  row: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => txt(id, XS[i] - 18, 156 + row * 20, W + 36, label, step, tone);

const shapes: LayoutShape[] = [
  txt("lead", 30, 16, 330, "One 30-second chunk of a Brightpost call, end to end", 1),
  bx("wave", XS[0], Y, W, H, MODALITY_TONE.audio, "Waveform", { sub: "16 kHz audio", step: 1 }),
  note("n1a", 0, 0, `${n(WHISPER.sampleRate)} samples a second`, 1, MODALITY_TONE.audio),
  note("n1b", 0, 1, `× ${WHISPER.windowSec} s`, 1, MODALITY_TONE.audio),
  note("n1c", 0, 2, `= ${n(WHISPER.samples)} numbers`, 1, MODALITY_TONE.audio),

  bx("mel", XS[1], Y, W, H, MODALITY_TONE.audio, "Log-mel\nspectrogram", { step: 2 }),
  arr("a1", "wave", "mel", 2),
  note("n2a", 1, 0, `${WHISPER.winMs} ms window, ${WHISPER.strideMs} ms step`, 2, MODALITY_TONE.audio),
  note("n2b", 1, 1, `${n(WHISPER.frames)} frames × ${WHISPER.melBins} bins`, 2, MODALITY_TONE.audio),
  note("n2c", 1, 2, `= ${n(WHISPER.frames * WHISPER.melBins)} numbers`, 2, MODALITY_TONE.audio),

  bx("enc", XS[2], Y, W, H, MODALITY_TONE.model, "Encoder", { sub: "Transformer", step: 3 }),
  arr("a2", "mel", "enc", 3),
  note("n3a", 2, 0, "two convolutions;", 3),
  note("n3b", 2, 1, "the 2nd halves time:", 3),
  note("n3c", 2, 2, `${n(WHISPER.frames)} ÷ 2 = ${n(WHISPER.positions)} slots`, 3),

  bx("dec", XS[3], Y, W, H, MODALITY_TONE.model, "Decoder", { sub: "Transformer", step: 4 }),
  arr("a3", "enc", "dec", 4),
  note("n4a", 3, 0, "special tokens first", 4),
  note("n4b", 3, 1, "(language, task), then", 4),
  note("n4c", 3, 2, "one token at a time", 4),

  bx("text", XS[4], Y, W, H, MODALITY_TONE.text, "Text tokens", { sub: "the transcript", step: 5 }),
  arr("a4", "dec", "text", 5),
  {
    id: "feed",
    type: "arrow",
    x: 0,
    y: 0,
    from: "text",
    to: "dec",
    via: [
      [XS[4] + W / 2, 44],
      [XS[3] + W / 2, 44],
    ],
    dashed: true,
    label: "each new token is fed back",
    step: 5,
  },
  note("n5a", 4, 0, "“i want a refund for", 5, MODALITY_TONE.text),
  note("n5b", 4, 1, "order four four seven one”", 5, MODALITY_TONE.text),
  txt("n5c", XS[4] - 18, 176, W + 36, "", 5),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Speech recognition, the Whisper recipe: waveform to text",
  width: 880,
  height: 232,
  steps: [
    { title: "Audio is a list of samples" },
    { title: "Turn it into a log-mel spectrogram" },
    { title: "The encoder reads the whole chunk" },
    { title: "The decoder writes tokens, looking back at the encoder" },
    { title: "Text tokens come out, one at a time" },
  ],
  shapes: shapes.filter((s) => s.label !== ""),
};

export default spec;
