import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { CLAIM_RUN, PORTAL, RUN_TOKENS, SCREEN } from "@/components/diagrams/presets/agents-computer";

// The computer-use loop (computer-use-and-browser-agents, Architecture, the hero): the harness sends a screenshot,
// the model answers with one action in screenshot pixels, the harness scales it to the real screen and runs it in the
// VM, waits, and sends a new screenshot. The loop ends when the model answers without a tool call. Running example:
// the browser agent filling in Swiftline's claim form; the action drawn is the click on "Submit claim" at [812, 604]
// in the 1280 × 800 screenshot, which is [1624, 1208] on the 2560 × 1600 display. Facts: the Claude computer use tool
// docs (coordinates in the pixel space of the returned screenshot; the app resizes and scales back; the loop stops
// when Claude asks for no tool), checked 2026-11-16.
//
// Five steps: 1 the screenshot and the task go to the model · 2 the model answers with one action · 3 the harness
// runs it · 4 a new screenshot shows what changed · 5 no tool call: the loop ends.
//
// Layout: four boxes on a diamond (screenshot left, model top, action right, harness bottom) joined by straight
// diagonal arrows; "Done" to the right of the model; one line of arithmetic under the ring.
//
// Colour (agents legend, four tones plus neutral would be allowed; three used): screenshot blue (what comes back),
// model and Done green, the action teal and ringed (the only thing the model produces), harness neutral.

const fmt = (n: number) => n.toLocaleString("en-GB");
const [sx, sy] = PORTAL.fields.submit.at;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h: 64, label, sub, tone, fill: "pastel", step, ...extra });

const arrow = (id: string, from: string, to: string, label: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The computer-use loop: screenshot, action, new screenshot",
  width: 820,
  height: 380,
  steps: [
    { title: "The harness sends a screenshot and the task" },
    { title: "The model answers with one action" },
    { title: "The harness runs it on the real screen" },
    { title: "A new screenshot shows what changed" },
    { title: "No tool call: the loop ends" },
  ],
  shapes: [
    box(
      "shot",
      30,
      150,
      210,
      "Screenshot",
      `${SCREEN.sent.w} × ${SCREEN.sent.h}, ${fmt(SCREEN.sentTokens)} tokens`,
      AGENT_TONE.result,
      1
    ),
    box("model", 300, 30, 200, "Model", "looks, picks one action", AGENT_TONE.model, 1),
    arrow("a1", "shot", "model", "screenshot + task", 1),

    box("act", 570, 150, 220, `left_click [${sx}, ${sy}]`, "tool_use, screenshot pixels", AGENT_TONE.action, 2, {
      highlight: true,
    }),
    arrow("a2", "model", "act", "tool_use", 2),

    box(
      "harness",
      285,
      270,
      230,
      "Harness + VM",
      `× 2 → [${sx / SCREEN.scale}, ${sy / SCREEN.scale}], click, wait`,
      AGENT_TONE.infra,
      3
    ),
    arrow("a3", "act", "harness", "run it", 3),

    arrow("a4", "harness", "shot", "new screenshot", 4),

    box("done", 610, 30, 180, "Done", "reply, no tool call", AGENT_TONE.model, 5),
    arrow("exit", "model", "done", "no tool", 5),
    {
      id: "sum",
      type: "text",
      x: 30,
      y: 346,
      w: 760,
      h: 26,
      label: `Claim form: ${CLAIM_RUN.length} actions + 1 reply = ${RUN_TOKENS.calls} model calls, one screenshot each`,
      step: 5,
    },
  ],
};

export default spec;
