import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// The DeepSeek-R1 training recipe, for "Architecture" on the RLVR & Reasoning Post-Training page. Static: three
// lanes read left to right, except the second R1 row, which runs right to left back under the first.
//
// Facts checked against DeepSeek-AI (2025), "DeepSeek-R1", arXiv 2501.12948 (v1, Jan 2025; v2 revised):
// - §2.2 (v1): R1-Zero applies RL (GRPO) to DeepSeek-V3-Base with no SFT; rule-based accuracy and format rewards
//   (<think> tags); no neural outcome or process reward model, because of reward hacking. AIME 2024 average pass@1
//   rose from 15.6% to 71.0% (v1, Table 2; v2 reports 77.9% from a run that raised the output limit to 65,536 tokens at step 8.2k); cons@64
//   86.7%. Drawbacks: poor readability and language mixing.
// - §2.3.1: "thousands" of long-CoT cold-start examples, collected partly from readable R1-Zero outputs refined by
//   annotators, fine-tune V3-Base as the starting RL actor.
// - §2.3.2: the same large-scale RL, plus a language-consistency reward (share of target-language words in the CoT).
// - §2.3.3: rejection sampling from that RL checkpoint keeps only correct responses: about 600k reasoning samples,
//   plus about 200k non-reasoning samples (writing, factual QA, self-cognition, translation) reusing DeepSeek-V3's
//   SFT data; "We fine-tune DeepSeek-V3-Base for two epochs using the above curated dataset of about 800k samples."
//   (v1; the revised v2, Supplementary B.4.2, says 2–3 epochs.)
// - §2.3.4: a second RL stage over all scenarios: rule-based rewards for reasoning, reward models for helpfulness
//   and harmlessness. DeepSeek-R1: AIME 2024 pass@1 79.8% (Table 4).
// - §2.4 and Table 5: six dense models (Qwen2.5-Math-1.5B, Qwen2.5-Math-7B, Qwen2.5-14B, Qwen2.5-32B,
//   Llama-3.1-8B, Llama-3.3-70B-Instruct) are fine-tuned on the same 800k samples with SFT only, no RL.
//   R1-Distill-Qwen-32B: 72.6% AIME 2024 pass@1. §4.1, Table 6: large-scale RL on Qwen-32B-Base alone
//   (DeepSeek-R1-Zero-Qwen-32B, over 10K steps) reaches 47.0%.
// - V3-Base: 671B total, 37B activated parameters (Table 4).
//
// Colours (page legend for the rlvr-* figures): model checkpoints blue; SFT stages violet; RL stages orange;
// data and sampling neutral.

const MODEL: LayoutTone = "blue";
const SFT: LayoutTone = "violet";
const RL: LayoutTone = "orange";

const COL = [24, 238, 452, 666];
const W = 182;
const H = 52;
const cx = (c: number) => COL[c] + W / 2;

const ROW_A = 66;
const ROW_B = 210;
const ROW_C = 300;
const ROW_D = 436;

const box = (
  id: string,
  col: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  fill: "pastel" | "soft" = "pastel"
): LayoutShape => ({ id, type: "box", x: COL[col], y, w: W, h: H, label, sub, tone, fill });

const arrow = (id: string, from: string, to: string, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  tone: "neutral",
  ...extra,
});

const shapes: LayoutShape[] = [
  // Lane A: R1-Zero.
  box("a-base", 0, ROW_A, "DeepSeek-V3-Base", "671B MoE, 37B active", MODEL),
  box("a-rl", 1, ROW_A, "RL with GRPO", "accuracy + format rewards", RL),
  box("a-zero", 2, ROW_A, "DeepSeek-R1-Zero", "AIME 2024: 15.6% → 71.0%", MODEL),
  {
    id: "a-note",
    type: "text",
    x: COL[3],
    y: ROW_A,
    w: 200,
    h: H,
    label: "Long chains and reflection\nemerge, but the text is hard\nto read and mixes languages",
    tone: "neutral",
  },
  arrow("a1", "a-base", "a-rl"),
  arrow("a2", "a-rl", "a-zero"),

  // Lane B: DeepSeek-R1, first row left to right, second row right to left.
  box("b-base", 0, ROW_B, "DeepSeek-V3-Base", "the same base model", MODEL),
  box("b-cold", 1, ROW_B, "1. Cold-start SFT", "thousands of long-CoT examples", SFT),
  box("b-rl", 2, ROW_B, "2. Reasoning RL", "rules + language consistency", RL),
  box("b-rs", 3, ROW_B, "3. Rejection sampling", "keep only correct answers", "neutral"),
  box("c-data", 3, ROW_C, "800k samples", "600k reasoning + 200k other", "neutral", "soft"),
  box("c-sft", 2, ROW_C, "3. SFT on V3-Base", "restarts from base, 2 epochs", SFT),
  box("c-rl", 1, ROW_C, "4. RL, all scenarios", "rules + preference models", RL),
  box("c-r1", 0, ROW_C, "DeepSeek-R1", "AIME 2024: 79.8%", MODEL),
  arrow("b1", "b-base", "b-cold"),
  arrow("b2", "b-cold", "b-rl"),
  arrow("b3", "b-rl", "b-rs"),
  arrow("b4", "b-rs", "c-data"),
  arrow("c1", "c-data", "c-sft"),
  arrow("c2", "c-sft", "c-rl"),
  arrow("c3", "c-rl", "c-r1"),

  // R1-Zero's readable outputs are one source of cold-start data.
  {
    id: "zero>cold",
    type: "arrow",
    x: cx(2),
    y: ROW_A + H,
    w: cx(1) - cx(2),
    h: ROW_B - (ROW_A + H),
    via: [
      [cx(2), 156],
      [cx(1), 156],
    ],
    label: "some cold-start data",
    dashed: true,
    tone: "neutral",
  },

  // Lane D: distillation.
  box("d-sft", 3, ROW_D, "SFT only, no RL", "on the same 800k samples", SFT),
  box("d-models", 2, ROW_D, "Six dense students", "Qwen and Llama, 1.5B to 70B", MODEL),
  {
    id: "d-note",
    type: "text",
    x: COL[0],
    y: ROW_D + 8,
    w: 384,
    h: 36,
    label: "R1-Distill-Qwen-32B: 72.6% on AIME 2024.\nRL alone on the same Qwen2.5-32B base: 47.0%.",
    tone: "neutral",
  },
  arrow("d0", "c-data", "d-sft", { label: "reused" }),
  arrow("d1", "d-sft", "d-models"),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "How DeepSeek-R1 was trained: R1-Zero, the four-stage R1 recipe, and distillation",
  width: 880,
  height: 516,
  groups: [
    { id: "g-zero", title: "R1-Zero: RL straight on the base", tone: RL, x: 12, y: 40, w: 856, h: 92 },
    { id: "g-r1", title: "DeepSeek-R1: four stages", tone: MODEL, x: 12, y: 184, w: 856, h: 184 },
    { id: "g-distill", title: "Distillation into small models", tone: SFT, x: 12, y: 410, w: 856, h: 92 },
  ],
  shapes,
};

export default spec;
