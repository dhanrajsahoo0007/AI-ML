import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// One GRPO update on one prompt, for "Group Relative Policy Optimization (GRPO)" on the RLVR & Reasoning
// Post-Training page. A stepper, because each step needs the one before it: sample a group, score it with a verifier,
// normalize the rewards inside the group, then take a policy-gradient step held near a reference model.
//
// Facts checked:
// - Shao et al. (2024), DeepSeekMath, arXiv 2402.03300, §4.1: GRPO samples a group {o_1 … o_G} from the old policy
//   for each question q, scores each output, and uses A_i = (r_i − mean(r)) / std(r) as the advantage of every
//   token of o_i (outcome supervision, §4.1.2). There is no value (critic) network; the group mean is the baseline.
//   The KL divergence to a reference policy is added to the loss directly (β · D_KL), not folded into the reward.
//   DeepSeekMath used G = 64 and β = 0.04 with a learned reward model.
// - DeepSeek-AI (2025), DeepSeek-R1, arXiv 2501.12948, §2.2: the same objective (eqs. 1–3) with rule-based
//   accuracy and format rewards; the revised version (v2) gives G = 16 samples per question and β = 0.001.
// - Tülu 3 (Lambert et al., 2024, arXiv 2411.15124, §6): the verifier returns a fixed reward when the extracted
//   final answer matches the ground truth and 0 otherwise. Here the reward is 1 or 0.
// - G = 6 is chosen for the drawing only.
//
// Working (computed below; population standard deviation, the paper writes only "std"; implementations differ):
//   rewards r = [1, 0, 0, 1, 0, 0]; mean = 2/6 = 0.333; variance = (2·(0.667)² + 4·(0.333)²)/6 = 0.222;
//   std = 0.471. A = (1 − 0.333)/0.471 = +1.41 for a correct answer, (0 − 0.333)/0.471 = −0.71 for a wrong one.
//   The advantages sum to 0 (2 × 1.41 = 4 × 0.71). If all six rewards were equal, std = 0 and every advantage is 0
//   (implementations add a small ε to the denominator).
//
// Colours (page legend for the rlvr-* figures): models being trained blue; the frozen reference neutral; the
// verifier and correct answers green; wrong answers and "push down" red.

const POLICY: LayoutTone = "blue";
const VERIFIER: LayoutTone = "green";
const WRONG: LayoutTone = "red";

const ANSWERS = [
  "o1:  3x = 15, so x = 5",
  "o2:  3x = 25, so x = 25/3",
  "o3:  x = 20 − 5 = 15",
  "o4:  x = (20 − 5) / 3 = 5",
  "o5:  “roughly 5” (no final answer)",
  "o6:  3x = 12, so x = 4",
];
const REWARDS = [1, 0, 0, 1, 0, 0];
const G = REWARDS.length;
const MEAN = REWARDS.reduce((a, b) => a + b, 0) / G;
const STD = Math.sqrt(REWARDS.reduce((a, r) => a + (r - MEAN) ** 2, 0) / G);
const ADV = REWARDS.map((r) => (STD === 0 ? 0 : (r - MEAN) / STD));
const signed = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);

// ── Grid ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ROW0 = 64;
const PITCH = 48;
const ROW_H = 34;
const rowY = (i: number) => ROW0 + i * PITCH;
const ROWS_BOTTOM = rowY(G - 1) + ROW_H; // 338
const ANS_X = 244;
const ANS_W = 268;
const R_X = 572;
const R_W = 40;
const A_X = 700;
const A_W = 64;
const BEND_Y = 418; // the update arrow runs left along this line
const LEFT_X = 24;
const LEFT_W = 170;
const BUS_X = 212; // vertical feed line between the policy and the answers

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral",
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet });

const shapes: LayoutShape[] = [
  // Step 1: a prompt, the policy, and a group of six sampled answers.
  {
    id: "prompt",
    type: "box",
    x: LEFT_X,
    y: 64,
    w: LEFT_W,
    h: 62,
    label: "Prompt q\n3x + 5 = 20.\nFind x.",
    tone: "neutral",
    fill: "pastel",
    step: 1,
    quiet: true,
  },
  {
    id: "policy",
    type: "box",
    x: LEFT_X,
    y: 178,
    w: LEFT_W,
    h: 44,
    label: "Policy π_θ",
    sub: `samples G = ${G} answers`,
    tone: POLICY,
    fill: "pastel",
    step: 1,
  },
  { id: "prompt>policy", type: "arrow", x: 0, y: 0, from: "prompt", to: "policy", step: 1, quiet: true },
];

ANSWERS.forEach((label, i) => {
  shapes.push(
    {
      id: `ans-${i}`,
      type: "box",
      x: ANS_X,
      y: rowY(i),
      w: ANS_W,
      h: ROW_H,
      label,
      tone: "neutral",
      fill: "paper",
      step: 1,
      quiet: true,
    },
    {
      id: `bus>ans-${i}`,
      type: "arrow",
      x: BUS_X,
      y: rowY(i) + ROW_H / 2,
      w: ANS_X - BUS_X,
      h: 0,
      step: 1,
      quiet: true,
    }
  );
});
// One line out of the policy into a vertical bus that feeds every answer.
shapes.push({
  id: "bus",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [LEFT_X + LEFT_W, 200],
    [BUS_X, 200],
  ],
  step: 1,
  quiet: true,
});
shapes.push({
  id: "bus-v",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [BUS_X, rowY(0) + ROW_H / 2],
    [BUS_X, rowY(G - 1) + ROW_H / 2],
  ],
  step: 1,
  quiet: true,
});

// Step 2: the verifier scores each answer.
shapes.push(text("h-reward", R_X - 52, 32, 144, 20, "Verifier: is x = 5?", 2, VERIFIER, false));
REWARDS.forEach((r, i) =>
  shapes.push({
    id: `r-${i}`,
    type: "cell",
    x: R_X,
    y: rowY(i),
    w: R_W,
    h: ROW_H,
    label: String(r),
    tone: r === 1 ? VERIFIER : WRONG,
    fill: "pastel",
    step: 2,
    quiet: true,
  })
);

// Step 3: normalize inside the group.
shapes.push(text("h-adv", A_X - 20, 32, 160, 20, "Advantage A", 3, "neutral", false));
ADV.forEach((a, i) =>
  shapes.push({
    id: `a-${i}`,
    type: "cell",
    x: A_X,
    y: rowY(i),
    w: A_W,
    h: ROW_H,
    label: signed(a),
    tone: a > 0 ? VERIFIER : WRONG,
    fill: "pastel",
    step: 3,
    quiet: true,
  })
);
shapes.push(
  text("stats", A_X + 12, ROWS_BOTTOM + 18, 152, 36, `mean = ${MEAN.toFixed(2)}\nstd = ${STD.toFixed(2)}`, 3),
  text(
    "zero-var",
    ANS_X - 16,
    ROWS_BOTTOM + 18,
    300,
    36,
    "If all 6 were right, or all 6 wrong, std = 0\nand every A = 0: the prompt teaches nothing.",
    3
  )
);

// Step 4: the policy-gradient step, held near a frozen reference model.
ADV.forEach((a, i) =>
  shapes.push(
    text(
      `dir-${i}`,
      A_X + A_W + 8,
      rowY(i) + (ROW_H - 20) / 2,
      90,
      20,
      a > 0 ? "↑ raise" : "↓ lower",
      4,
      a > 0 ? VERIFIER : WRONG
    )
  )
);
const POLICY_CX = 150; // where the update arrow enters the policy box from below
shapes.push(
  {
    id: "update",
    type: "arrow",
    x: A_X,
    y: ROWS_BOTTOM + 4,
    w: POLICY_CX - A_X,
    h: 222 - (ROWS_BOTTOM + 4),
    via: [
      [A_X, BEND_Y],
      [POLICY_CX, BEND_Y],
    ],
    label: "gradient step on θ",
    tone: "neutral",
    step: 4,
  },
  {
    id: "ref",
    type: "box",
    x: LEFT_X,
    y: 440,
    w: LEFT_W,
    h: 44,
    label: "Reference π_ref",
    sub: "frozen copy of the policy",
    tone: "neutral",
    fill: "pastel",
    step: 4,
    quiet: true,
  },
  {
    id: "kl",
    type: "arrow",
    x: 64,
    y: 440,
    w: 0,
    h: 222 - 440,
    label: "β · KL",
    dashed: true,
    tone: "neutral",
    step: 4,
    quiet: true,
  },
  text(
    "loss",
    ANS_X - 16,
    446,
    620,
    36,
    "o1 and o4 become more likely (A = +1.41); the other four less likely (A = −0.71).\nThe KL term pulls π_θ back toward π_ref, so the policy cannot drift far.",
    4
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "One GRPO update: sample a group, verify, normalize, update",
  width: 880,
  height: 500,
  steps: [
    { title: "Sample a group of G = 6 answers" },
    { title: "The verifier scores each answer 1 or 0" },
    { title: "Normalize rewards inside the group" },
    { title: "Update the policy, held near the reference" },
  ],
  groups: [
    {
      id: "g-group",
      title: `Group: G = ${G} answers`,
      tone: POLICY,
      x: ANS_X - 16,
      y: 36,
      w: ANS_W + 32,
      h: ROWS_BOTTOM - 36 + 12,
    },
  ],
  shapes,
};

export default spec;
