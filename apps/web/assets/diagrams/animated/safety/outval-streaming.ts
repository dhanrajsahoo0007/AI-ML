import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { HOLD_BACK, arr, blk, note } from "@/components/diagrams/presets/production-safety";

// A hold-back window (guardrails-output-validation, Deep dive): while a check runs, the newest tokens wait before they
// are shown, so a failing check can still stop them. Working (HOLD_BACK in presets/production-safety.ts):
//   decode speed 4.4 ms per token (LATENCY.decodeMsPerToken); the check takes 50 ms (ILLUSTRATIVE);
//   window = ceil(50 ÷ 4.4) = ceil(11.4) = 12 tokens; added delay = 12 × 4.4 = 52.8 ms, about 53 ms.
// Twenty tokens are drawn; 8 are shown and 12 are held. Steps: 1 tokens stream out · 2 the window holds the newest 12 ·
// 3 a check runs on the window and passes: one token is released · 4 a check fails: the held tokens are dropped.
// Grid (900 wide): token cells x 10 + 44 i (w 40, h 36), row y 52; group around cells 9 to 20; shown row y 172.
// Colours (PROD_TONE): tokens green (the model), shown tokens orange (the customer), the window and check lime,
// the failure red, the fallback message neutral.

const CELL = 44;
const X0 = 10;
const SHOWN = 20 - HOLD_BACK.tokens; // 8 tokens already shown
const cx = (i: number) => X0 + i * CELL;

const shapes: LayoutShape[] = [note("t-head", 10, 14, `Model output, one token every ${HOLD_BACK.msPerToken} ms`, 1)];
for (let i = 0; i < 20; i++) {
  shapes.push({
    id: `tok${i + 1}`,
    type: "cell",
    x: cx(i),
    y: 52,
    w: 40,
    h: 36,
    label: `${i + 1}`,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 1,
    quiet: true,
  });
}
shapes.push(note("shown-head", 10, 140, "What the customer has seen", 2));
for (let i = 0; i < SHOWN; i++) {
  shapes.push({
    id: `seen${i + 1}`,
    type: "cell",
    x: cx(i),
    y: 164,
    w: 40,
    h: 36,
    label: `${i + 1}`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 2,
    quiet: true,
  });
}
shapes.push(
  {
    id: "seen9",
    type: "cell",
    x: cx(SHOWN),
    y: 164,
    w: 40,
    h: 36,
    label: `${SHOWN + 1}`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 3,
  },
  blk(
    "check",
    cx(10),
    232,
    300,
    56,
    "Check on the held tokens",
    `${HOLD_BACK.checkMs} ms (illustrative)`,
    PROD_TONE.check,
    3
  ),
  arr("held-check", `tok${SHOWN + 4}`, "check", 3, "check runs"),
  blk(
    "fail",
    cx(10),
    316,
    300,
    56,
    "Check fails: drop the held tokens",
    "the stream stops here",
    PROD_TONE.failure,
    4,
    true
  ),
  arr("check-fail", "check", "fail", 4),
  blk(
    "safe",
    cx(2),
    316,
    260,
    56,
    "Customer sees a hand-off message",
    "“Let me pass this to a colleague”",
    PROD_TONE.infra,
    4
  ),
  arr("fail-safe", "fail", "safe", 4),
  note(
    "cost",
    10,
    392,
    `Window = ceil(${HOLD_BACK.checkMs} ÷ ${HOLD_BACK.msPerToken}) = ${HOLD_BACK.tokens} tokens; delay = ${HOLD_BACK.tokens} × ${HOLD_BACK.msPerToken} ms = about ${HOLD_BACK.delayMs} ms.`,
    2
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A hold-back window lets a check run before text is shown",
  width: 900,
  height: 428,
  groups: [
    {
      id: "window",
      title: `Held back: ${HOLD_BACK.tokens} tokens`,
      tone: PROD_TONE.check,
      x: cx(SHOWN) - 4,
      y: 36,
      w: HOLD_BACK.tokens * CELL + 4,
      h: 64,
    },
  ],
  steps: [
    { title: "Tokens stream out, the newest are held" },
    { title: "The customer has seen the rest" },
    { title: "A check runs and passes" },
    { title: "A check fails" },
  ],
  shapes,
};

export default spec;
