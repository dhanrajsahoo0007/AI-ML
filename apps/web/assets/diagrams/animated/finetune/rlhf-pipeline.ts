import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T } from "@/components/diagrams/presets/production";
import { blockBox, leftNote, link } from "@/components/diagrams/presets/production-finetune";
import { RLHF, RLHF_PENALTY, RLHF_TOTAL } from "@/components/diagrams/presets/production-pref";

// The three stages of RLHF (reinforcement-preference-learning, Architecture), as in InstructGPT (Ouyang et al. 2022,
// arXiv 2203.02155): 1 supervised fine-tuning on labellers' demonstrations · 2 a reward model trained on labellers'
// comparisons · 3 policy optimisation (PPO) against the reward model with a KL penalty to the supervised model.
// Total reward for one answer (ILLUSTRATIVE numbers, presets/production-pref.ts): r − β × KL = 2.4 − 0.1 × 9 = 1.5.
// Steps: one per stage; nodes never move. Layout (880 x 400): row titles at y 14 / 130 / 244; boxes h 56 at y 40 / 156 /
// 270; stage 3 has four boxes (policy x 20, reward model x 260, total reward x 500, PPO update x 720) and the frozen
// reference model sits right of the stage-2 row at x 640, y 156, feeding the total reward; the PPO update returns to the
// policy along y 356.
// Colour: data blue, the model green (SFT model), weights being trained orange (policy, PPO), checks lime (reward
// model), frozen neutral (reference).

const row = (i: number) => 40 + i * 114;
const H = 56;

const shapes: LayoutShape[] = [
  leftNote("t1", 20, 14, "1  Supervised fine-tuning", { tone: T.data, step: 1 }),
  blockBox("demo", 20, row(0), 190, H, "Demonstrations", T.data, { sub: "labellers write answers", step: 1 }),
  blockBox("sft", 260, row(0), 190, H, "SFT model", T.model, { sub: "copies the demonstrations", step: 1 }),
  link("a1", "demo", "sft", { step: 1 }),

  leftNote("t2", 20, 128, "2  A reward model from comparisons", { tone: T.data, step: 2 }),
  blockBox("comp", 20, row(1), 190, H, "Comparisons", T.data, { sub: "answer A beats answer B", step: 2 }),
  blockBox("rm", 260, row(1), 190, H, "Reward model", T.check, { sub: "scores an answer", step: 2, highlight: true }),
  link("a2", "comp", "rm", { step: 2 }),
  leftNote("n2", 468, row(1) + 10, "loss pushes the winner's\nscore above the loser's", { step: 2 }),

  leftNote("t3", 20, 242, "3  Policy optimisation (PPO) with a KL penalty", { tone: T.trained, step: 3 }),
  blockBox("policy", 20, row(2), 190, H, "Policy", T.trained, { sub: "starts as the SFT model", step: 3 }),
  blockBox("rm2", 260, row(2), 190, H, "Reward model", T.check, { sub: "frozen", step: 3 }),
  blockBox("total", 500, row(2), 190, H, "Total reward", T.frozen, { sub: "r − β × KL", step: 3 }),
  blockBox("ppo", 730, row(2), 130, H, "PPO update", T.trained, { sub: "raises good answers", step: 3 }),
  blockBox("ref", 640, row(1), 220, H, "Reference model", T.frozen, { sub: "the SFT model, frozen", step: 3 }),
  link("a3", "policy", "rm2", { step: 3 }),
  link("a4", "rm2", "total", { step: 3 }),
  link("a5", "total", "ppo", { step: 3 }),
  link("a6", "ref", "total", { step: 3 }),
  link("a7", "ppo", "policy", {
    step: 3,
    via: [
      [795, 356],
      [115, 356],
    ],
  }),
  leftNote(
    "n3b",
    20,
    372,
    `illustrative: r = ${RLHF.score}, penalty β × KL = ${RLHF.beta} × ${RLHF.logRatio} = ${RLHF_PENALTY.toFixed(1)}, total = ${RLHF.score} − ${RLHF_PENALTY.toFixed(1)} = ${RLHF_TOTAL.toFixed(1)}`,
    { step: 3 }
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "RLHF in three stages",
  width: 880,
  height: 400,
  steps: [
    { title: "Supervised fine-tuning on demonstrations" },
    { title: "Train a reward model on comparisons" },
    { title: "Optimise the policy against it, with a KL penalty" },
  ],
  shapes,
};

export default spec;
