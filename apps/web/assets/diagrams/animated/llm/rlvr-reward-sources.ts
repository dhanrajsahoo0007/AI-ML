import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// RLHF and RLVR side by side, for "RLHF vs. RLVR" on the RLVR & Reasoning Post-Training page. Static. The two
// loops are the same except for where the reward comes from, and that is where reward hacking enters.
//
// Facts checked:
// - RLHF: a reward model is trained on human comparisons and the policy is optimized against it with PPO and a KL
//   penalty to a reference (Ouyang et al., 2022, arXiv 2203.02155; as summarized in DeepSeekMath, arXiv 2402.03300,
//   §4.1.1, eq. 2). Gao et al. (2022, arXiv 2210.10760) measure reward-model over-optimization.
// - RLVR: Lambert et al. (2024), Tülu 3, arXiv 2411.15124, §6: "RLVR leverages the existing RLHF objective but
//   replaces the reward model with a verification function"; reward α if correct, else 0; trained with PPO.
//   DeepSeek-R1 (arXiv 2501.12948, §2.2) uses GRPO with rule-based accuracy and format rewards.
// - Hacks named in the notes: DeepSeek-R1 v2 Supplementary B.5 reports reward hacking against its helpfulness
//   reward model; Baker et al. (2025, arXiv 2503.11926) report coding agents passing tests with exit(0) or
//   raise SkipTest; Tülu 3 Appendix B.4 shows over-optimized outputs against IFEval constraint checkers.
//
// Colours (page legend for the rlvr-* figures): policy blue; RL update orange; programmatic verifier green;
// learned reward model pink; data neutral; hacking risk red.

const POLICY: LayoutTone = "blue";
const RL: LayoutTone = "orange";
const VERIFIER: LayoutTone = "green";
const LEARNED: LayoutTone = "pink";
const RISK: LayoutTone = "red";

const PANEL_X = [12, 448];
const PANEL_W = 420;
const MAIN_DX = 34;
const MAIN_W = 170;
const SIDE_DX = 262;
const SIDE_W = 146;
const Y_POLICY = 76;
const Y_REWARD = 196;
const Y_UPDATE = 324;

interface Panel {
  key: string;
  reward: [string, string, LayoutTone];
  side: string;
  signal: string;
  update: string;
  hack: string;
  footer: string;
}

const PANELS: Panel[] = [
  {
    key: "hf",
    reward: ["Reward model r_φ", "a learned network", LEARNED],
    side: "Human preference\npairs (A beats B)",
    signal: "a real-valued score",
    update: "PPO update",
    hack: "Hack: find what r_φ\nover-scores (length, tone,\nflattery) and farm it",
    footer: "Covers open-ended goals such as helpfulness\nand style, but r_φ can be fooled under pressure.",
  },
  {
    key: "vr",
    reward: ["Verifier", "a program: match, tests", VERIFIER],
    side: "Reference answer\nor test suite",
    signal: "reward 1 or 0",
    update: "GRPO or PPO update",
    hack: "Hack: exploit a loose\nchecker: weak tests, lax\nparsing, format rewards",
    footer: "Exact where it applies (math, code, formats),\nbut only for tasks a program can check.",
  },
];

const shapes: LayoutShape[] = [];

PANELS.forEach((p, k) => {
  const x0 = PANEL_X[k];
  const mx = x0 + MAIN_DX;
  const sx = x0 + SIDE_DX;
  const id = (s: string) => `${p.key}-${s}`;
  shapes.push(
    {
      id: id("policy"),
      type: "box",
      x: mx,
      y: Y_POLICY,
      w: MAIN_W,
      h: 44,
      label: "Policy π_θ",
      sub: "writes a response",
      tone: POLICY,
      fill: "pastel",
    },
    {
      id: id("reward"),
      type: "box",
      x: mx,
      y: Y_REWARD,
      w: MAIN_W,
      h: 52,
      label: p.reward[0],
      sub: p.reward[1],
      tone: p.reward[2],
      fill: "pastel",
    },
    {
      id: id("update"),
      type: "box",
      x: mx,
      y: Y_UPDATE,
      w: MAIN_W,
      h: 44,
      label: p.update,
      sub: "+ KL to a reference",
      tone: RL,
      fill: "pastel",
    },
    {
      id: id("side"),
      type: "box",
      x: sx,
      y: Y_REWARD,
      w: SIDE_W,
      h: 52,
      label: p.side,
      tone: "neutral",
      fill: "soft",
    },
    { id: id("a-resp"), type: "arrow", x: 0, y: 0, from: id("policy"), to: id("reward"), label: "response" },
    { id: id("a-sig"), type: "arrow", x: 0, y: 0, from: id("reward"), to: id("update"), label: p.signal },
    { id: id("a-side"), type: "arrow", x: 0, y: 0, from: id("side"), to: id("reward") },
    {
      // Back from the update to the policy, around the left side.
      id: id("a-loop"),
      type: "arrow",
      x: mx,
      y: Y_UPDATE + 22,
      w: 0,
      h: Y_POLICY + 22 - (Y_UPDATE + 22),
      via: [
        [x0 + 16, Y_UPDATE + 22],
        [x0 + 16, Y_POLICY + 22],
      ],
      tone: "neutral",
    },
    {
      id: id("hack"),
      type: "text",
      x: sx - 18,
      y: Y_REWARD + 66,
      w: SIDE_W + 32,
      h: 52,
      label: p.hack,
      tone: RISK,
    },
    {
      id: id("a-hack"),
      type: "arrow",
      x: sx - 14,
      y: Y_REWARD + 74,
      w: mx + MAIN_W + 4 - (sx - 14),
      h: -20,
      dashed: true,
      tone: RISK,
    },
    {
      id: id("footer"),
      type: "text",
      x: x0 + 12,
      y: 392,
      w: PANEL_W - 24,
      h: 36,
      label: p.footer,
      tone: "neutral",
    }
  );
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "RLHF and RLVR: the same loop with a different source of reward",
  width: 880,
  height: 452,
  groups: [
    { id: "g-hf", title: "RLHF: learned reward model", tone: LEARNED, x: PANEL_X[0], y: 40, w: PANEL_W, h: 400 },
    { id: "g-vr", title: "RLVR: programmatic verifier", tone: VERIFIER, x: PANEL_X[1], y: 40, w: PANEL_W, h: 400 },
  ],
  shapes,
};

export default spec;
