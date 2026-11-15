import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// How a chat LLM is built, in four phases read as a snake (left to right, then right to left, and so on):
// 1. Data: raw corpora (web, code, books) → filter, deduplicate and mix domains → tokenize.
// 2. Pre-training: next-token prediction over trillions of tokens, where most of the compute goes → a base model.
// 3. Post-training: supervised fine-tuning on instruction data, then preference tuning by one of two routes:
//    RLHF (a reward model trained on human comparisons, then reinforcement learning, often PPO, with a KL penalty
//    that keeps the model close to its starting point) or DPO (one loss directly on preference pairs, with no reward
//    model and no RL loop).
// 4. Release: safety tuning and evaluations → the released assistant model.
//
// Facts checked:
// - InstructGPT (Ouyang et al., 2022, arXiv 2203.02155) §3: SFT on demonstrations → reward model trained on human
//   comparisons of outputs → PPO against the reward model, with a per-token KL penalty from the SFT model.
// - DPO (Rafailov et al., 2023, arXiv 2305.18290): optimizes the policy with a classification-style loss on preference
//   pairs, "without an explicit reward model" and without RL; the page says the same.
// - Pre-training dominates compute; fine-tuning is orders of magnitude cheaper (the page's pitfalls section).
//
// Tones: data neutral (paper), training stages neutral blocks, the tokenizer violet (as in the tokenizer pipeline
// figure), model checkpoints pastel blue.

const DATA: LayoutTone = "neutral";
const STAGE: LayoutTone = "neutral";
const TOKENIZER: LayoutTone = "violet"; // the tokenizer model's tone in tokenizer-pipeline
const CHECKPOINT: LayoutTone = "blue";

// ── Grid ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Three columns. The left column starts right of the group title tabs, so the vertical link from the base model
// to fine-tuning does not cross the "Post-training" tab; the right column sits under the merge of the two routes.
const L = { x: 100, w: 170 }; // centre 185
const R = { x: 690, w: 160 }; // centre 770
const cx = (c: { x: number; w: number }) => c.x + c.w / 2;
const H = 44;

const G = { x: 12, w: 856 };
const BAND = {
  data: { y: 30, h: 96 },
  pre: { y: 170, h: 128 },
  post: { y: 346, h: 180 },
  rel: { y: 576, h: 92 },
};

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  opts: { sub?: string; h?: number; tone?: LayoutTone; fill?: "pastel"; step: number; quiet?: boolean }
): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w,
  h: opts.h ?? H,
  label,
  sub: opts.sub,
  tone: opts.tone ?? STAGE,
  fill: opts.fill,
  step: opts.step,
  quiet: opts.quiet,
});

const text = (id: string, x: number, y: number, w: number, label: string, step: number, h = 20): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: "neutral",
  step,
  quiet: true,
});

const link = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

/** A free arrow from (x, y) to (x2, y2) through `via`, with an optional label pill. */
const free = (
  id: string,
  [x, y]: [number, number],
  [x2, y2]: [number, number],
  step: number,
  opts: { via?: [number, number][]; label?: string } = {}
): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y,
  w: x2 - x,
  h: y2 - y,
  via: opts.via,
  label: opts.label,
  step,
  quiet: true,
});

// ── 1. Data (left to right) ──────────────────────────────────────────────────────────────────────────────────
const D_Y = BAND.data.y + 30;
const CLEAN_W = 200;
const data: LayoutShape[] = [
  box("raw", L.x, D_Y, L.w, "Raw corpora", { sub: "web, code, books", tone: DATA, step: 1, quiet: true }),
  box("clean", (L.x + L.w + R.x - CLEAN_W) / 2, D_Y - 2, CLEAN_W, "Filter, deduplicate,\nmix domains", {
    h: 48,
    fill: "pastel",
    step: 1,
  }),
  box("tok", R.x, D_Y, R.w, "Tokenize", {
    sub: "text → token ids",
    tone: TOKENIZER,
    fill: "pastel",
    step: 1,
    quiet: true,
  }),
  link("raw>clean", "raw", "clean", 1),
  link("clean>tok", "clean", "tok", 1),
];

// ── 2. Pre-training (right to left) ──────────────────────────────────────────────────────────────────────────
const PT = { x: 350, y: BAND.pre.y + 30, w: R.x + R.w - 350, h: 60 };
const BASE_Y = PT.y + (PT.h - H) / 2;
const pre: LayoutShape[] = [
  box("pretrain", PT.x, PT.y, PT.w, "Pre-training", {
    sub: "next-token prediction over the whole corpus",
    h: PT.h,
    fill: "pastel",
    step: 2,
  }),
  text("pretrain-note", PT.x, PT.y + PT.h + 6, PT.w, "Most of the compute: thousands of GPUs for weeks or months", 2),
  box("base", L.x, BASE_Y, L.w, "Base model", {
    sub: "knows language and facts",
    tone: CHECKPOINT,
    fill: "pastel",
    step: 2,
    quiet: true,
  }),
  free("tok>pretrain", [cx(R), D_Y + H + 4], [cx(R), PT.y - 4], 2, { label: "trillions of tokens" }),
  link("pretrain>base", "pretrain", "base", 2),
];

// ── 3. Post-training (left to right, with a fork) ────────────────────────────────────────────────────────────
const ROW_A = BAND.post.y + 54; // top of the RLHF row
const ROW_B = ROW_A + 72; // top of the DPO row
const SFT_Y = (ROW_A + ROW_B) / 2;
const FORK_X = 290;
const RM = { x: 380, w: 166 };
const RL = { x: 580, w: 166 };
const MERGE_X = cx(R); // the merge drops straight into the safety block
const midA = ROW_A + H / 2;
const midB = ROW_B + H / 2;
const midSft = SFT_Y + H / 2;
const line = (id: string, points: [number, number][], step: number): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  step,
});

const post: LayoutShape[] = [
  box("sft", L.x, SFT_Y, L.w, "Supervised fine-tuning", { sub: "instruction data", fill: "pastel", step: 3 }),
  free("base>sft", [cx(L), BASE_Y + H + 4], [cx(L), SFT_Y - 4], 3),
  text("pref-head", RM.x, BAND.post.y + 22, RL.x + RL.w - RM.x, "Preference tuning: one of two routes", 3),
  box("rm", RM.x, ROW_A, RM.w, "Reward model", {
    sub: "from human comparisons",
    fill: "pastel",
    step: 3,
    quiet: true,
  }),
  box("rl", RL.x, ROW_A, RL.w, "RL with PPO", {
    sub: "maximize reward, KL penalty",
    fill: "pastel",
    step: 3,
    quiet: true,
  }),
  link("rm>rl", "rm", "rl", 3),
  box("dpo", RM.x, ROW_B, RL.x + RL.w - RM.x, "Loss directly on preference pairs", {
    sub: "no reward model, no RL loop",
    fill: "pastel",
    step: 3,
    quiet: true,
  }),
  // The fork: out of fine-tuning, up and down, then one labelled arrow into each route.
  line(
    "fork",
    [
      [L.x + L.w + 4, midSft],
      [FORK_X, midSft],
    ],
    3
  ),
  line(
    "fork-bar",
    [
      [FORK_X, midA],
      [FORK_X, midB],
    ],
    3
  ),
  free("fork-a", [FORK_X, midA], [RM.x - 4, midA], 3, { label: "RLHF" }),
  free("fork-b", [FORK_X, midB], [RM.x - 4, midB], 3, { label: "DPO" }),
  // The two routes join and drop into the release phase (drawn with it, in step 4).
  line(
    "merge-a",
    [
      [RL.x + RL.w + 4, midA],
      [MERGE_X, midA],
      [MERGE_X, midB],
    ],
    4
  ),
];

// ── 4. Release (right to left) ───────────────────────────────────────────────────────────────────────────────
const REL_Y = BAND.rel.y + 30;
const release: LayoutShape[] = [
  box("safety", R.x, REL_Y, R.w, "Safety tuning and evals", {
    sub: "red-teaming, benchmarks",
    fill: "pastel",
    step: 4,
    quiet: true,
  }),
  free("merge>safety", [RL.x + RL.w + 4, midB], [MERGE_X, REL_Y - 4], 4, { via: [[MERGE_X, midB]] }),
  box("released", L.x, REL_Y, L.w + 20, "Released assistant model", {
    sub: "follows instructions",
    tone: CHECKPOINT,
    fill: "pastel",
    step: 4,
  }),
  link("safety>released", "safety", "released", 4),
];

const group = (id: string, title: string, band: { y: number; h: number }) => ({
  id,
  title,
  tone: "neutral" as LayoutTone,
  x: G.x,
  w: G.w,
  ...band,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "From raw text to a released assistant model",
  width: 880,
  height: BAND.rel.y + BAND.rel.h + 14,
  groups: [
    group("g-data", "Data", BAND.data),
    group("g-pre", "Pre-training", BAND.pre),
    group("g-post", "Post-training", BAND.post),
    group("g-rel", "Release", BAND.rel),
  ],
  shapes: [...data, ...pre, ...post, ...release],
  steps: [
    { title: "Data: clean, deduplicate and tokenize the corpus" },
    { title: "Pre-training: next-token prediction gives a base model" },
    { title: "Post-training: instruction tuning, then RLHF or DPO" },
    { title: "Release: safety tuning and evaluations" },
  ],
};

export default spec;
