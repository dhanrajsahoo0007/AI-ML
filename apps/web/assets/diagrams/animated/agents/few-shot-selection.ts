import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { BOOTSTRAP, DEMO_LIMITS } from "@/components/diagrams/presets/agents-optimize";

// Few-shot selection by bootstrapping (automated-prompt-optimization, Core concepts "Bootstrap few-shot and example
// selection"). DSPy's BootstrapFewShot: a teacher (here v12 on the task model) runs five training chats, the metric
// judges each reply, and only the traces that pass become demonstrations in the compiled prompt. Failing traces are
// never copied in, so the demos are replies the metric already accepts. The chats and verdicts come from BOOTSTRAP in
// presets/agents-optimize (illustrative); the limits (4 bootstrapped, 16 in total per predictor) are DSPy's defaults.
//
// Three steps: 1 five training chats and the prompt before compiling (instructions only) · 2 the teacher runs each
// chat and the metric passes three, fails two (red: v12's early "on its way", and a refund for both items) · 3 the three
// passing traces become demos 1–3 (demo 1 ringed).
//
// Layout: three columns. Chats x 20–240, verdicts x 290–480, both on rows 64 + 58 i (h 44). The compiled prompt is a
// group at x 560–800 with the instructions cell on top and three demo cells under it. Arrows: chat → verdict on each
// row; passing verdict → its demo cell.
//
// Colour (agents legend, four tones plus neutral): the chats orange (customers' messages), passing verdicts lime,
// failing verdicts red (the only failures), demos blue (traces that came back), instructions neutral.

const ROW0 = 64;
const ROW_H = 58;
const CELL_H = 44;
const COL = { chat: 20, verdict: 290, demo: 580 } as const;
const W = { chat: 220, verdict: 190, demo: 200 } as const;
const rowY = (i: number) => ROW0 + i * ROW_H;
const demoY = (k: number) => 132 + k * 58;

const passing = BOOTSTRAP.filter((t) => t.pass);

const heading = (id: string, x: number, w: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x,
  y: 22,
  w,
  h: 20,
  label,
  tone: AGENT_TONE.infra,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Bootstrapping demonstrations: only passing traces become examples",
  width: 820,
  height: 380,
  steps: [
    { title: `${BOOTSTRAP.length} training chats; the prompt has no examples yet` },
    { title: `The teacher runs each chat: ${passing.length} pass, ${BOOTSTRAP.length - passing.length} fail` },
    { title: `The ${passing.length} passing traces become demos` },
  ],
  groups: [{ id: "prompt", title: "Compiled prompt", tone: AGENT_TONE.infra, x: 560, y: 52, w: 240, h: 290 }],
  shapes: [
    heading("h-chats", COL.chat, W.chat, "Training chats"),
    heading("h-verdicts", COL.verdict, W.verdict, "Teacher reply, metric"),

    // Step 1: the chats, and the prompt before compiling.
    ...BOOTSTRAP.map((t, i): LayoutShape => ({
      id: `chat-${t.id}`,
      type: "cell",
      x: COL.chat,
      y: rowY(i),
      w: W.chat,
      h: CELL_H,
      label: `${t.id} · ${t.chat}`,
      tone: AGENT_TONE.task,
      fill: "pastel",
      quiet: i > 0,
    })),
    {
      id: "instructions",
      type: "cell",
      x: COL.demo,
      y: 72,
      w: W.demo,
      h: CELL_H,
      label: "Instructions (v12)",
      tone: AGENT_TONE.infra,
    },

    // Step 2: the teacher runs every chat; the metric judges each reply.
    ...BOOTSTRAP.flatMap((t, i): LayoutShape[] => [
      {
        id: `run-${t.id}`,
        type: "arrow",
        x: 0,
        y: 0,
        from: `chat-${t.id}`,
        to: `verdict-${t.id}`,
        tone: AGENT_TONE.infra,
        step: 2,
        quiet: true,
      },
      {
        id: `verdict-${t.id}`,
        type: "cell",
        x: COL.verdict,
        y: rowY(i),
        w: W.verdict,
        h: CELL_H,
        label: t.verdict,
        tone: t.pass ? AGENT_TONE.check : AGENT_TONE.failure,
        fill: "pastel",
        step: 2,
        quiet: i > 0,
      },
    ]),

    // Step 3: each passing trace (input and the teacher's reply) is copied in as a demo.
    ...passing.flatMap((t, k): LayoutShape[] => [
      {
        id: `copy-${t.id}`,
        type: "arrow",
        x: 0,
        y: 0,
        from: `verdict-${t.id}`,
        to: `demo-${t.id}`,
        tone: AGENT_TONE.infra,
        step: 3,
        quiet: true,
      },
      {
        id: `demo-${t.id}`,
        type: "cell",
        x: COL.demo,
        y: demoY(k),
        w: W.demo,
        h: CELL_H,
        label: `Demo ${k + 1}: ${t.id}, ${t.demo}`,
        tone: AGENT_TONE.result,
        fill: "pastel",
        step: 3,
        highlight: k === 0,
        quiet: k > 0,
      },
    ]),
    {
      id: "limits",
      type: "text",
      x: 560,
      y: 348,
      w: 240,
      h: 20,
      label: `up to ${DEMO_LIMITS.bootstrapped} bootstrapped, ${DEMO_LIMITS.total} in total`,
      tone: AGENT_TONE.infra,
      step: 3,
      quiet: true,
    },
  ],
};

export default spec;
