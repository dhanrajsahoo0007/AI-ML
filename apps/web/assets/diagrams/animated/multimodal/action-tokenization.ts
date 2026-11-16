import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { ACTION_TOKENS, OPENVLA, RT2 } from "@/components/diagrams/presets/production-vla";
import { txt } from "@/components/diagrams/presets/production-speech";

// "Actions as tokens" on the Robotics & VLA page. RT-2 (arXiv 2307.15818) and OpenVLA (arXiv 2406.09246) turn every
// continuous action dimension into one of 256 uniform bins and write the bin numbers as tokens. Worked example (values
// and ranges ILLUSTRATIVE; ACTION_TOKENS in the preset): a warehouse arm's next step, seven numbers.
//   Δx = +0.012 m in [-0.02, +0.02]: (0.012 + 0.02) / 0.04 = 0.8; 0.8 x 256 = 204.8 -> bin 204; bin width 0.04 / 256 =
//   0.156 mm; the robot gets back the bin centre, -0.02 + 204.5 x 0.04 / 256 = 0.01195 m.
// Steps: 1 one continuous number on a line · 2 the line cut into 256 bins; the number falls in bin 204 · 3 seven numbers
// become seven tokens; the cost of that.
// Grid: number line x 80-800 at y 110 (720 px for 0.04 m); bins strip y 190 (cells 44 px); token row y 330 (cells 104).
// Colours: the continuous value and the bins teal (a robot action), the tokens orange (tokens in the LLM's vocabulary).

const D = ACTION_TOKENS[0];
const X0 = 80;
const LEN = 720;
const px = (v: number) => X0 + ((v - D.lo) / (D.hi - D.lo)) * LEN;
const T_ACTION: LayoutTone = PROD_TONE.compute;
const T_TOKEN: LayoutTone = MODALITY_TONE.text;

const shapes: LayoutShape[] = [
  txt("t1", X0, 14, 460, "One number: how far the gripper moves sideways in this step (illustrative)", 1),
  {
    id: "line",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [X0, 110],
      [X0 + LEN, 110],
    ],
    step: 1,
  },
  ...[D.lo, 0, D.hi].flatMap((v, i): LayoutShape[] => [
    {
      id: `lt-${i}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [px(v), 104],
        [px(v), 116],
      ],
      step: 1,
    },
    txt(`lt-${i}-l`, px(v) - 40, 120, 80, v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v)} m`, 1),
  ]),
  {
    id: "val",
    type: "circle",
    x: px(D.value),
    y: 110,
    w: 16,
    tone: T_ACTION,
    fill: "pastel",
    step: 1,
    highlight: true,
  },
  txt("val-l", px(D.value) - 90, 64, 180, `Δx = +${D.value} m`, 1, T_ACTION),

  txt(
    "t2",
    X0,
    160,
    640,
    `Cut the line into ${OPENVLA.bins} equal bins, 0.04 ÷ 256 = ${D.widthMm.toFixed(3)} mm wide, numbered 0 to 255`,
    2
  ),
];
// Step 2: sixteen bins around the chosen one, bin 196 to 211.
const first = D.bin - 8;
for (let k = 0; k < 16; k++) {
  const b = first + k;
  shapes.push({
    id: `bin-${k}`,
    type: "cell",
    x: X0 + 10 + k * 44,
    y: 190,
    w: 44,
    h: 44,
    label: String(b),
    tone: T_ACTION,
    fill: "pastel",
    weight: b === D.bin ? 0.55 : undefined,
    step: 2,
    quiet: true,
  });
}
shapes.push(
  txt(
    "t2b",
    X0 + 10,
    240,
    704,
    `Showing bins ${first} to ${first + 15}. (0.012 + 0.02) ÷ 0.04 × 256 = 204.8, so the value falls in bin ${D.bin}.`,
    2
  ),
  txt(
    "t2c",
    X0 + 10,
    260,
    704,
    `The robot gets back the bin's centre, ${D.decoded.toFixed(5)} m: an error of at most half a bin, ${(D.widthMm / 2).toFixed(3)} mm.`,
    2
  ),
  txt(
    "t3",
    X0,
    300,
    700,
    `Do this for all ${OPENVLA.dims} dimensions and the action is ${OPENVLA.dims} tokens, in a fixed order`,
    3
  )
);
ACTION_TOKENS.forEach((a, i) => {
  const x = X0 + i * 104;
  shapes.push(txt(`d-${i}`, x, 326, 98, a.name, 3), {
    id: `tok-${i}`,
    type: "cell",
    x,
    y: 348,
    w: 98,
    h: 40,
    label: String(a.bin),
    tone: T_TOKEN,
    fill: "pastel",
    step: 3,
    quiet: true,
  });
});
shapes.push(
  txt(
    "t3b",
    X0,
    400,
    720,
    `${OPENVLA.dims} tokens × ${OPENVLA.hz} actions a second = ${OPENVLA.tokensPerSecond} tokens a second, written one after another.`,
    3
  ),
  txt(
    "t3c",
    X0,
    420,
    720,
    `RT-2 uses the same 256 bins (8 integers with a terminate flag) at ${RT2.bigHz} Hz for its 55 B model.`,
    3
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Actions as tokens: a continuous movement cut into 256 bins",
  width: 880,
  height: 452,
  steps: [
    { title: "One movement is a continuous number" },
    { title: "Cut the range into 256 bins; the number falls in one" },
    { title: "Seven numbers become seven tokens, written one by one" },
  ],
  shapes,
};

export default spec;
