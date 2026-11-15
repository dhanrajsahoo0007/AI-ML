// Constants and arithmetic for the Speech (ASR & TTS) and Real-Time Voice Agents pages (specs in
// assets/diagrams/animated/multimodal/). Brightpost names and numbers come from presets/production.ts.
//
// Sources (checked 16 November 2026):
//   Whisper (Radford et al., 2022, arXiv 2212.04356), section 2.2: audio resampled to 16,000 Hz; an 80-channel
//     log-magnitude Mel spectrogram on 25 ms windows with a 10 ms stride; encoder-decoder Transformer; the encoder
//     starts with a stem of two convolution layers (filter width 3, GELU), the second with stride 2; 30-second chunks;
//     680,000 hours of labelled audio. The 1,500 encoder positions are derived: 30 s ÷ 10 ms = 3,000 frames, ÷ 2.
//   OpenAI Realtime guides (developers.openai.com/api/docs/guides/realtime-vad and realtime-conversations), Gemini Live
//     API capabilities page (aistudio.google.com/docs/live-api/capabilities), all read 16 November 2026.

import { LATENCY, PROD_TONE } from "./production";
import type { LayoutShape, LayoutTone } from "../types";

// ── Whisper's front end ────────────────────────────────────────────────────────────────────────────────────────────

export const WHISPER = (() => {
  const sampleRate = 16_000;
  const windowSec = 30;
  const melBins = 80;
  const winMs = 25;
  const strideMs = 10;
  const samples = sampleRate * windowSec; // 16,000 × 30 = 480,000
  const frames = (windowSec * 1000) / strideMs; // 30,000 ÷ 10 = 3,000
  const positions = frames / 2; // the stem's second convolution has stride 2: 3,000 ÷ 2 = 1,500
  return {
    sampleRate,
    windowSec,
    melBins,
    winMs,
    strideMs,
    samples,
    frames,
    positions,
    hours: 680_000,
    winSamples: (sampleRate * winMs) / 1000, // 400 samples
    strideSamples: (sampleRate * strideMs) / 1000, // 160 samples
  };
})();

// ── A toy spectrogram, computed ────────────────────────────────────────────────────────────────────────────────────

/**
 * A synthetic signal: 0.2 s at 8,000 Hz (1,600 samples). The first 0.1 s is a 500 Hz tone, the second 0.1 s a 2,000 Hz
 * tone, plus a little seeded noise. Frames are 25 ms (200 samples) with a 10 ms hop (80 samples):
 * floor((1,600 − 200) ÷ 80) + 1 = 18 frames. Each frame is windowed (Hann), transformed with a direct DFT (bins at
 * 40 Hz steps up to 4,000 Hz), and its power is summed into 8 bands with edges spaced evenly on the mel scale
 * (m = 2595 · log10(1 + f ÷ 700)). Values are log10(power + ε), scaled to 0–1 across the whole matrix.
 */
export const TOY = (() => {
  const rate = 8_000;
  const n = 1_600;
  const win = 200;
  const hop = 80;
  const bands = 8;
  let seed = 11;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296 - 0.5;
  };
  const signal = Array.from({ length: n }, (_, i) => {
    const f = i < n / 2 ? 500 : 2000;
    return Math.sin((2 * Math.PI * f * i) / rate) + 0.05 * rnd();
  });
  const frames = Math.floor((n - win) / hop) + 1;
  const mel = (f: number) => 2595 * Math.log10(1 + f / 700);
  const invMel = (m: number) => 700 * (10 ** (m / 2595) - 1);
  const edges = Array.from({ length: bands + 1 }, (_, b) => invMel((mel(rate / 2) * b) / bands));
  const power: number[][] = []; // [band][frame]
  for (let b = 0; b < bands; b++) power.push([]);
  for (let t = 0; t < frames; t++) {
    const seg = signal
      .slice(t * hop, t * hop + win)
      .map((v, i) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1))));
    const bandPower = new Array<number>(bands).fill(0);
    for (let k = 0; k <= win / 2; k++) {
      let re = 0;
      let im = 0;
      for (let i = 0; i < win; i++) {
        re += seg[i] * Math.cos((2 * Math.PI * k * i) / win);
        im -= seg[i] * Math.sin((2 * Math.PI * k * i) / win);
      }
      const f = (k * rate) / win;
      const b = Math.min(
        bands - 1,
        edges.findIndex((e, j) => f >= e && f < edges[j + 1])
      );
      bandPower[Math.max(0, b)] += re * re + im * im;
    }
    bandPower.forEach((p, b) => power[b].push(Math.log10(p + 1e-3)));
  }
  const flat = power.flat();
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);
  const values = power.map((row) => row.map((v) => (v - lo) / (hi - lo)));
  return { rate, n, win, hop, bands, frames, signal, edges, values, lo, hi };
})();

// ── Word error rate ────────────────────────────────────────────────────────────────────────────────────────────────

/** What the caller said, and what the recogniser wrote. Brightpost's order 4471 read digit by digit. */
export const WER_REF = "i want a refund for order four four seven one".split(" ");
export const WER_HYP = "i want refund for order for four seven one please".split(" ");

export type WerOp = "ok" | "S" | "D" | "I";
/** The alignment, column by column: [reference word or "", heard word or "", verdict]. */
export const WER_ALIGN: [string, string, WerOp][] = [
  ["i", "i", "ok"],
  ["want", "want", "ok"],
  ["a", "", "D"],
  ["refund", "refund", "ok"],
  ["for", "for", "ok"],
  ["order", "order", "ok"],
  ["four", "for", "S"],
  ["four", "four", "ok"],
  ["seven", "seven", "ok"],
  ["one", "one", "ok"],
  ["", "please", "I"],
];

/** Levenshtein distance over words (the minimum S + D + I). */
function editDistance(a: string[], b: string[]) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/**
 * WER = (S + D + I) ÷ N, N = words in the reference. Here N = 10, S = 1 (four → for), D = 1 (a), I = 1 (please):
 * (1 + 1 + 1) ÷ 10 = 0.30 = 30 %. The alignment is checked against an edit-distance computation; a mismatch throws.
 */
export const WER = (() => {
  const count = (op: WerOp) => WER_ALIGN.filter((c) => c[2] === op).length;
  const S = count("S");
  const D = count("D");
  const I = count("I");
  const N = WER_REF.length;
  if (S + D + I !== editDistance(WER_REF, WER_HYP)) throw new Error("WER alignment is not minimal");
  if (WER_ALIGN.filter((c) => c[0]).length !== N) throw new Error("WER alignment drops a reference word");
  return { S, D, I, N, wer: (S + D + I) / N, percent: Math.round(((S + D + I) / N) * 100) };
})();

// ── TTS sizes ──────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A vocoder's job in numbers (illustrative settings): output at 24,000 Hz, acoustic frames every 10 ms, so one second
 * of speech is 100 frames and 24,000 samples; each frame becomes 24,000 ÷ 100 = 240 samples.
 */
export const TTS = (() => {
  const sampleRate = 24_000;
  const frameMs = 10;
  const framesPerSec = 1000 / frameMs;
  return { sampleRate, frameMs, framesPerSec, samplesPerFrame: sampleRate / framesPerSec };
})();

// ── The voice latency budget (illustrative, except the language-model figure) ──────────────────────────────────────

/**
 * One turn of the Brightpost phone line. Only the model's time to first token is a Brightpost constant (400 ms,
 * LATENCY.firstTokenMs). The other stages are ILLUSTRATIVE design values, labelled on the figure.
 *   end-of-turn wait   300 ms (a tuned detector; Gemini Live's documented default silence wait is about 800 ms)
 *   speech recognition  80 ms (the tail after the caller stops: streaming recognition has already read the rest)
 *   language model     400 ms to the first token
 *   speech synthesis   120 ms to the first audio chunk
 *   telephony + network 100 ms (both ways, together)
 * Total 300 + 80 + 400 + 120 + 100 = 1,000 ms. With the 800 ms default wait: 800 + 80 + 400 + 120 + 100 = 1,500 ms.
 */
export const VOICE_BUDGET = (() => {
  const stages = {
    endpoint: 300,
    asr: 80,
    llm: LATENCY.firstTokenMs,
    tts: 120,
    network: 100,
  } as const;
  const defaultWait = 800;
  const total = stages.endpoint + stages.asr + stages.llm + stages.tts + stages.network;
  return {
    ...stages,
    defaultWait,
    total,
    totalWithDefault: total - stages.endpoint + defaultWait,
    target: 1_000,
  };
})();

// ── Small shape helpers shared by the speech and voice specs ───────────────────────────────────────────────────────

/** A one-line quiet annotation (12.5 px text, centred in its w × 18 box). */
export const txt = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step?: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet: true });

/** A pastel block. */
export const bx = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: LayoutTone,
  label: string,
  opts: { sub?: string; step?: number; highlight?: boolean } = {}
): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w,
  h,
  label,
  sub: opts.sub,
  tone,
  fill: "pastel",
  step: opts.step,
  highlight: opts.highlight,
});

/** An arrow between two shapes, with an optional pill label. */
export const arr = (
  id: string,
  from: string,
  to: string,
  step?: number,
  label?: string,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
  ...extra,
});
