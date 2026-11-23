import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { OPENVLA, PI0 } from "@/components/diagrams/presets/production-vla";
import { arr, bx, txt } from "@/components/diagrams/presets/production-speech";

// "Two ways to output an action" on the Robotics & VLA page. Both start from a vision-language backbone.
// Row 1, OpenVLA (Kim et al., 2024, arXiv 2406.09246): image and instruction -> SigLIP + DinoV2 vision encoders -> a
// 2-layer MLP projector -> Llama 2 7 B -> 7 action tokens (256 bins each) -> 7 numbers. 7 B parameters; 970 k episodes;
// 15 GB in bf16; about 6 Hz on an RTX 4090.
// Row 2, pi0 (Black et al., 2024, arXiv 2410.24164): images, instruction and robot state -> PaliGemma (3 B VLM) with a
// separate 300 M-parameter action expert (trained from scratch) -> flow matching (10 steps) -> a chunk of H = 50 actions.
// 3 B + 0.3 B = 3.3 B; up to 50 Hz; 73 ms per chunk on an RTX 4090 (14 + 32 + 27 ms).
// Steps: 1 the OpenVLA row · 2 the pi0 row.
// Grid: blocks 120 x 62, pitch 144 from x 20; row 1 y 56, notes y 126-168; row 2 y 236, notes y 306-348. Canvas 880 x 380.
// Colours (MODALITY_TONE): images blue, text/tokens orange, the model green, the projector neutral, actions teal; the one
// accent (highlight) is the part that differs: the action tokens, and the action expert.

const X = (i: number) => 20 + 144 * i;
const W = 120;
const H = 62;

const shapes: LayoutShape[] = [
  txt("h1", 20, 16, 560, "OpenVLA: the action is written as tokens, like text (arXiv 2406.09246)", 1),
  bx("o0", X(0), 56, W, H, MODALITY_TONE.image, "Image +\ninstruction", { step: 1 }),
  bx("o1", X(1), 56, W, H, MODALITY_TONE.model, "Vision\nencoders", { sub: "SigLIP + DinoV2", step: 1 }),
  bx("o2", X(2), 56, W, H, PROD_TONE.infra, "Projector", { sub: "2-layer MLP", step: 1 }),
  bx("o3", X(3), 56, W, H, MODALITY_TONE.model, "Llama 2", { sub: `${OPENVLA.params} language model`, step: 1 }),
  bx("o4", X(4), 56, W, H, MODALITY_TONE.text, "Action\ntokens", {
    sub: `${OPENVLA.dims} per action`,
    step: 1,
    highlight: true,
  }),
  bx("o5", X(5), 56, W, H, PROD_TONE.compute, "Action", { sub: `${OPENVLA.dims} numbers`, step: 1 }),
  ...[0, 1, 2, 3, 4].map((i) => arr(`oa${i}`, `o${i}`, `o${i + 1}`, 1)),
  txt(
    "on1",
    20,
    128,
    840,
    `${OPENVLA.params} parameters · ${OPENVLA.episodes} robot episodes · ${OPENVLA.bins} bins per dimension · ${OPENVLA.memoryGb} GB in bfloat16`,
    1
  ),
  txt(
    "on2",
    20,
    150,
    840,
    `about ${OPENVLA.hz} actions a second on one ${OPENVLA.gpu}, ${OPENVLA.periodMs} ms each, and one action is ${OPENVLA.dims} tokens one after another`,
    1
  ),

  txt("h2", 20, 206, 560, "π0: the action expert produces a chunk of actions by flow matching (arXiv 2410.24164)", 2),
  bx("p0", X(0), 246, W, H, MODALITY_TONE.image, "Images +\ninstruction", { sub: "+ robot state", step: 2 }),
  bx("p1", X(1), 246, W, H, MODALITY_TONE.model, "PaliGemma", { sub: `${PI0.vlm} vision-language`, step: 2 }),
  bx("p2", X(2), 246, W, H, MODALITY_TONE.model, "Action\nexpert", {
    sub: `${PI0.expert}, new`,
    step: 2,
    highlight: true,
  }),
  bx("p3", X(3), 246, W, H, PROD_TONE.infra, "Flow\nmatching", { sub: `${PI0.flowSteps} steps`, step: 2 }),
  bx("p4", X(4), 246, W, H, PROD_TONE.compute, "Action chunk", { sub: `${PI0.chunk} actions`, step: 2 }),
  arr("pa0", "p0", "p1", 2),
  arr("pa1", "p1", "p2", 2, undefined, { dashed: true }),
  arr("pa2", "p2", "p3", 2),
  arr("pa3", "p3", "p4", 2),
  txt(
    "pn1",
    20,
    318,
    840,
    `${PI0.vlm} + ${PI0.expert} = ${PI0.total} parameters · chunks of ${PI0.chunk} actions · control up to ${PI0.maxHz} Hz`,
    2
  ),
  txt(
    "pn2",
    20,
    340,
    840,
    `${PI0.inferenceMs} ms per chunk on an RTX 4090 (14 ms image encoders + 32 ms observation pass + 27 ms flow)`,
    2
  ),
];

// Left-align the wide notes: a text shape is centred in its box, so size the box to the text.
shapes.forEach((sh) => {
  if (sh.type === "text" && (sh.w ?? 0) >= 560 && sh.label) sh.w = Math.ceil(sh.label.length * 6.5) + 6;
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Two VLA designs: action tokens (OpenVLA) and an action expert with flow matching (π0)",
  width: 880,
  height: 372,
  steps: [
    { title: "OpenVLA writes the action as tokens" },
    { title: "π0 adds an action expert that makes a chunk of actions" },
  ],
  shapes,
};

export default spec;
