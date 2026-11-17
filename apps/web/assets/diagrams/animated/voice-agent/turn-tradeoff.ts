import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { MODALITY_TONE, PROD_TONE, curve, n } from "@/components/diagrams/presets/production";
import { BUDGET, PREEMPTIVE, TARGETS, TURN_DETECTORS } from "@/components/diagrams/presets/gcase-voice";

// Deep dive 2 of the voice-agent case study (design sheet §15.2): false cut-offs against the end-of-turn wait budget,
// and why preemptive generation makes a longer, safer wait cost model calls instead of latency.
// Data: TURN_DETECTORS in presets/gcase-voice.ts (LiveKit eot-bench, June 2026, vendor; dossier F26): the audio turn
// model (LiveKit v1) cuts off 9.9% of turns at a 300 ms budget and 4.5% at 600 ms; the fused recogniser (Deepgram
// Flux) 12.9% and 9.9%. Only these four points are measured; a straight line joins each detector's two points.
// Working:
//   - target N3: false cut-offs ≤ TARGETS.falseCutoffs (5%); only the audio model at 600 ms meets it (4.5%).
//   - preemptive generation starts the model on the final transcript, so the reply is ready BUDGET.freeWait = commit
//     200 + first token 400 + first clause 100 + synthesis 200 = 900 ms after speech ends; any wait up to 900 ms adds
//     no latency, only model calls: +50–70% (PREEMPTIVE, Deepgram Flux 2025, vendor; dossier F22) and wasted first
//     clauses. The design waits ~300 ms when the model is confident, up to the 600 ms backstop when not.
// Steps: 1 the two detectors · 2 the 5% target · 3 the free-wait band.
// Layout (880 × 400): curve() from presets/production.ts at (20, 24), 840 × 320, x 0–1,000 ms (ticks at 0, 300, 600,
// 900), y 0–20% (ticks to 15%). The band and the target line use the same mapping as curve(): left = x + 36 (the y labels need 26 +
// 8 px, so the 36 px minimum wins), right = x + width − 12, top = y + 26, bottom = y + height − 42.
// The free wait is a lime strip above the data (y 16.5–20%, no data there) with a dashed line down at 900 ms, so it
// covers no point or line.
// Colours: the audio turn model violet (audio), the fused recogniser blue, the target line red, the strip lime.

const CX = 20;
const CY = 24;
const CW = 840;
const CH = 320;
const X_MAX = 1_000;
const Y_MAX = 0.2; // headroom above 15% for the free-wait strip
const STRIP_FROM = 0.165;
const left = CX + 36;
const right = CX + CW - 12;
const top = CY + 26;
const bottom = CY + CH - 42;
const toX = (ms: number) => Math.round((left + (ms / X_MAX) * (right - left)) * 10) / 10;
const toY = (v: number) => Math.round((bottom - (v / Y_MAX) * (bottom - top)) * 10) / 10;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const [audioModel, fused] = TURN_DETECTORS;
const AUDIO = MODALITY_TONE.audio;
const FUSED = GENAI_TONE.data;

const plot = curve("c", CX, CY, {
  width: CW,
  height: CH,
  xDomain: [0, X_MAX],
  yDomain: [0, Y_MAX],
  xTicks: [0, BUDGET.wait, BUDGET.backstop, BUDGET.freeWait],
  yTicks: [0, 0.05, 0.1, 0.15],
  formatY: (v) => `${Math.round(v * 100)}%`,
  xLabel: "Wait after the caller stops speaking (ms)",
  yLabel: "False cut-offs, % of turns",
  series: [
    { points: audioModel.points.map((p) => [p.waitMs, p.cutoffs] as [number, number]), tone: AUDIO },
    { points: fused.points.map((p) => [p.waitMs, p.cutoffs] as [number, number]), tone: FUSED },
  ],
  marks: [
    {
      x: audioModel.points[0].waitMs,
      y: audioModel.points[0].cutoffs,
      label: pct(audioModel.points[0].cutoffs),
      tone: AUDIO,
      place: "below-left",
    },
    {
      x: audioModel.points[1].waitMs,
      y: audioModel.points[1].cutoffs,
      label: `${pct(audioModel.points[1].cutoffs)} audio turn model (LiveKit v1)`,
      tone: AUDIO,
      place: "below-right",
    },
    {
      x: fused.points[0].waitMs,
      y: fused.points[0].cutoffs,
      label: pct(fused.points[0].cutoffs),
      tone: FUSED,
      place: "above-left",
    },
    {
      x: fused.points[1].waitMs,
      y: fused.points[1].cutoffs,
      label: `${pct(fused.points[1].cutoffs)} fused recogniser (Deepgram Flux)`,
      tone: FUSED,
      place: "above-right",
    },
  ],
  step: 1,
});

const targetY = toY(TARGETS.falseCutoffs);
const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone,
  step,
});
const lowPct = Math.round(PREEMPTIVE.extraCallsLow * 100);
const highPct = Math.round(PREEMPTIVE.extraCallsHigh * 100);

const shapes: LayoutShape[] = [
  // Step 3: with preemptive generation, waits up to 900 ms are free (a strip above the data, so it hides nothing).
  {
    id: "band",
    type: "cell",
    x: toX(0),
    y: top,
    w: toX(BUDGET.freeWait) - toX(0),
    h: toY(STRIP_FROM) - top,
    label: `waits up to ${n(BUDGET.freeWait)} ms: no added latency, only +${lowPct}–${highPct}% model calls`,
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 3,
  },
  {
    id: "free-edge",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [toX(BUDGET.freeWait), toY(STRIP_FROM)],
      [toX(BUDGET.freeWait), bottom],
    ],
    dashed: true,
    tone: PROD_TONE.check,
    step: 3,
  },
  ...plot.map((s) => ({ ...s, quiet: s.id === "c-axes" ? undefined : true })),

  // Step 2: the N3 target.
  {
    id: "target",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [left, targetY],
      [right, targetY],
    ],
    dashed: true,
    tone: PROD_TONE.failure,
    step: 2,
  },
  text(
    "target-label",
    left + 8,
    targetY - 20,
    `target: at most ${Math.round(TARGETS.falseCutoffs * 100)}% of turns`,
    2,
    PROD_TONE.failure
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Turn detection: false cut-offs against the wait, and the wait preemptive generation makes free",
  width: 880,
  height: CY + CH + 46,
  steps: [
    { title: "Two detectors, measured at 300 and 600 ms" },
    { title: `The target: at most ${Math.round(TARGETS.falseCutoffs * 100)}% of turns cut off` },
    { title: `Waits up to ${n(BUDGET.freeWait)} ms cost model calls, not latency` },
  ],
  shapes: [
    ...shapes,
    text(
      "foot",
      CX,
      CY + CH + 20,
      "Vendor benchmark (LiveKit eot-bench, June 2026): four measured points, lines join them. Past 900 ms, every ms of wait is heard.",
      1
    ),
  ],
};

export default spec;
