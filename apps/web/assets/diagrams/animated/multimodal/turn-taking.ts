import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { VOICE_BUDGET as B, txt } from "@/components/diagrams/presets/production-speech";

// "Turn-taking" on the Real-Time Voice Agents page: one Brightpost call on a time axis, three lanes (caller, turn
// detector, agent). All times are ILLUSTRATIVE except where they follow the latency budget (voice-latency-budget).
//   0.0-2.4 s   the caller says "refund for order 4471"
//   2.4-2.7 s   the turn detector waits 300 ms of silence (B.endpoint); at 2.7 s it declares the end of the turn
//   2.7-3.4 s   the agent thinks: 80 + 400 + 120 + 100 = 700 ms (B.asr + B.llm + B.tts + B.network); first audio at 3.4 s,
//               i.e. 1,000 ms after the caller stopped (B.total)
//   3.4-6.0 s   the reply is 2.6 s of audio in all
//   4.6 s       the caller speaks over the agent (barge-in); 100 ms later (4.7 s) the agent stops
//   Heard: 4.7 - 3.4 = 1.3 s of the 2.6 s; the other 1.3 s is never played, and the saved transcript must be cut to
//   what the caller heard.
// Steps: 1 the caller speaks · 2 the end of the turn is detected · 3 the agent answers · 4 the caller interrupts ·
// 5 the agent stops.
// Grid: time axis from x 150, 100 px a second (0-7 s = 700 px); lanes at y 70 (caller), 126 (turn detector), 182 (agent);
// axis y 244; notes y 290-346. Canvas 880 x 370.
// Colours: caller and agent audio violet, the turn detector lime (a check), thinking green (the model), the unplayed
// part of the reply a soft violet block; markers neutral.

const X0 = 150;
const PX = 100;
const at = (s: number) => Math.round(X0 + s * PX);
const LANE = { caller: 70, vad: 126, agent: 182 } as const;
const BAR_H = 34;

const bar = (
  id: string,
  lane: number,
  from: number,
  to: number,
  label: string | undefined,
  tone: LayoutTone,
  step: number,
  fill: "pastel" | "soft" = "pastel"
): LayoutShape => ({
  id,
  type: "cell",
  x: at(from),
  y: lane,
  w: at(to) - at(from),
  h: BAR_H,
  label,
  tone,
  fill,
  step,
  quiet: true,
});

const marker = (
  id: string,
  s: number,
  label: string,
  row: number,
  step: number,
  side: "mid" | "left" | "right" = "mid"
): LayoutShape[] => [
  {
    id: `${id}-line`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [at(s), 34 + row * 16],
      [at(s), 236],
    ],
    dashed: true,
    step,
  },
  txt(
    `${id}-label`,
    side === "mid"
      ? at(s) - Math.ceil((label.length * 6.5 + 6) / 2)
      : side === "left"
        ? at(s) - 4 - Math.ceil(label.length * 6.5 + 6)
        : at(s) + 4,
    12 + row * 16,
    Math.ceil(label.length * 6.5) + 6,
    label,
    step
  ),
];

const shapes: LayoutShape[] = [
  txt("l-caller", 10, LANE.caller + 8, 120, "Caller", 1),
  txt("l-vad", 10, LANE.vad + 8, 120, "Turn detector", 1),
  txt("l-agent", 10, LANE.agent + 8, 120, "Agent", 1),

  bar("c1", LANE.caller, 0, 2.4, "“refund for order 4471”", MODALITY_TONE.audio, 1),
  bar("v1", LANE.vad, 0, 2.4, "hears speech", PROD_TONE.check, 1),

  bar("v2", LANE.vad, 2.4, 2.7, undefined, PROD_TONE.check, 2, "soft"),
  ...marker("m-end", 2.7, "end of turn", 0, 2),

  bar("a1", LANE.agent, 2.7, 3.4, "thinking", MODALITY_TONE.model, 3),
  ...marker("m-first", 3.4, "first audio", 1, 3),
  bar("a2", LANE.agent, 3.4, 4.7, "speaking", MODALITY_TONE.audio, 3),
  bar("a3", LANE.agent, 4.7, 6.0, "never played", MODALITY_TONE.audio, 5, "soft"),

  bar("c2", LANE.caller, 4.6, 5.8, "interrupts", MODALITY_TONE.audio, 4),
  bar("v3", LANE.vad, 4.6, 5.8, "hears speech", PROD_TONE.check, 4),
  ...marker("m-barge", 4.6, "barge-in", 0, 4, "left"),
  ...marker("m-stop", 4.7, "agent stops", 0, 5, "right"),

  {
    id: "axis",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [X0, 244],
      [at(7), 244],
    ],
  },
  ...Array.from({ length: 8 }, (_, i): LayoutShape[] => [
    {
      id: `tick-${i}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [at(i), 244],
        [at(i), 249],
      ],
    },
    txt(`tick-${i}-l`, at(i) - 20, 252, 40, i === 7 ? "7 s" : String(i), undefined),
  ]).flat(),
  txt(
    "n1",
    X0,
    284,
    700,
    "Caller stops at 2.4 s; after a 300 ms wait the end of turn is called at 2.4 + 0.3 = 2.7 s; first audio at 2.7 + 0.7 = 3.4 s.",
    3
  ),
  txt(
    "n2",
    X0,
    306,
    700,
    `The 0.7 s is ${B.asr} + ${B.llm} + ${B.tts} + ${B.network} ms (recognition, model, synthesis, network); times are illustrative.`,
    3
  ),
  txt(
    "n3",
    X0,
    328,
    700,
    "The caller heard 4.7 − 3.4 = 1.3 s of a 2.6 s reply. Save only what was heard in the transcript.",
    5,
    PROD_TONE.failure
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title:
    "Turn-taking: the caller speaks, the end of the turn is found, the agent answers, the caller interrupts, the agent stops",
  width: 880,
  height: 360,
  steps: [
    { title: "The caller speaks" },
    { title: "The turn detector waits, then calls the end of the turn" },
    { title: "The agent thinks and starts to answer" },
    { title: "The caller speaks over the agent" },
    { title: "The agent stops; the rest is never played" },
  ],
  shapes,
};

export default spec;
