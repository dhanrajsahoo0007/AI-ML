import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { TOY, txt } from "@/components/diagrams/presets/production-speech";
import { matrix } from "@/components/diagrams/presets/transformer";

// "From a waveform to a spectrogram" on the Speech: ASR & TTS page. A toy signal built in the preset (TOY): 0.2 s at
// 8,000 Hz, a 500 Hz tone for 0.1 s and then a 2,000 Hz tone for 0.1 s. It is cut into 25 ms windows (200 samples) every
// 10 ms (80 samples): floor((1,600 - 200) / 80) + 1 = 18 windows. Each window goes through a DFT; power is summed in 8
// bands spaced evenly on the mel scale, logged and scaled to 0-1. Whisper does the same at 16,000 Hz with 80 bands.
//
// Steps: 1 the waveform · 2 the overlapping windows · 3 the matrix (rows = bands, high at the top; columns = windows).
// Grid: waveform y 40-120 (x 90-558, 468 wide = 1,600 samples), windows y 146-202, matrix y 236-444 (cell 26).
// Colours (MODALITY_TONE): audio violet throughout, the matrix cells violet by weight; windows violet pastel.

const X0 = 90;
const W = 18 * 26; // 468
const pxOf = (sample: number) => X0 + (sample / TOY.n) * W;

const step = 1;
const wave: [number, number][] = [];
for (let i = 0; i < TOY.n; i += step)
  wave.push([Math.round(pxOf(i) * 10) / 10, Math.round((80 - TOY.signal[i] * 34) * 10) / 10]);

const windows: LayoutShape[] = [0, 1, 2].map((t) => ({
  id: `win-${t}`,
  type: "box",
  x: Math.round(pxOf(t * TOY.hop)),
  y: 146 + t * 20,
  w: Math.round((TOY.win / TOY.n) * W),
  h: 16,
  label: t === 0 ? "25 ms" : undefined,
  tone: MODALITY_TONE.audio,
  fill: "pastel",
  step: 2,
}));

const rows = [...TOY.values].reverse();
const bandLabel = (b: number) => `from ${(TOY.edges[b] / 1000).toFixed(1)} kHz`;

const shapes: LayoutShape[] = [
  txt("t-wave", X0, 8, 300, "Waveform: 1,600 samples (0.2 s at 8,000 Hz)", 1, MODALITY_TONE.audio),
  { id: "wave", type: "path", x: 0, y: 0, points: wave, tone: MODALITY_TONE.audio, step: 1 },
  {
    id: "wave-axis",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [X0, 80],
      [X0 + W, 80],
    ],
    dashed: true,
    step: 1,
  },
  txt("t-low", X0, 120, 200, "500 Hz tone", 1, MODALITY_TONE.audio),
  txt("t-high", X0 + W - 140, 120, 140, "2,000 Hz tone", 1, MODALITY_TONE.audio),
  ...windows,
  txt("t-hop", X0 + 150, 146, 260, "next window starts 10 ms later (80 samples)", 2),
  txt("t-win", X0 + 150, 166, 260, "18 windows in all; three shown", 2),
  txt("t-mat", X0, 214, 420, "Log-power spectrogram: 8 bands × 18 windows", 3, MODALITY_TONE.audio),
  ...matrix("spec", X0, 236, rows, MODALITY_TONE.audio, { cell: 26, step: 3 }),
  ...Array.from({ length: 8 }, (_, r) => txt(`band-${r}`, 8, 236 + r * 26 + 4, 76, bandLabel(7 - r), 3)),
  txt("t-time", X0, 236 + 8 * 26 + 6, W, "time, one column per 10 ms step →", 3),
  txt("t-note", X0 + W + 14, 236, 230, "Stronger colour = more energy.", 3),
  txt("t-note2", X0 + W + 14, 258, 230, "The tone jumps up a few bands", 3),
  txt("t-note3", X0 + W + 14, 276, 230, "half way through.", 3),
  txt("t-note4", X0 + W + 14, 330, 230, "Toy: 8 kHz, 8 bands.", 3, PROD_TONE.infra),
  txt("t-note5", X0 + W + 14, 348, 230, "Whisper: 16 kHz, 80 bands.", 3, PROD_TONE.infra),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "From a waveform to a spectrogram",
  width: 812,
  height: 482,
  steps: [
    { title: "A waveform is a list of samples" },
    { title: "Cut it into overlapping 25 ms windows" },
    { title: "Each window becomes one column of band energies" },
  ],
  shapes,
};

export default spec;
