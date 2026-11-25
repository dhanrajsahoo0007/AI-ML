import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";
import { SPECDEC_ROUND } from "@/components/diagrams/presets/production-specdec";

// One round of speculative decoding with a separate draft model, for "Draft-and-verify with exact output distribution
// preservation" and the worked example on the Speculative Decoding page. Brightpost's assistant is answering the
// customer whose £42 cracked kettle needs approval (refunds over £30 do); the small draft model does not know that.
//
// Steps:
//   1. Draft: the small model runs 4 quick passes, one per token, and records q, its probability for each token.
//   2. Verify: the large model runs ONE forward pass over the prompt plus all 4 drafts and returns p at 5 positions
//      (one per draft and one after the last draft).
//   3. Accept test, left to right: keep a draft with probability min(1, p/q); stop at the first rejection.
//   4. Output: the kept prefix plus one token resampled from norm(max(0, p − q)) at the rejected position.
//
// Working (computed below from SPECDEC_ROUND, illustrative probabilities and random draws):
//   "Your":   p 0.70 ≥ q 0.60 → keep
//   "refund": p/q = 0.45 / 0.50 = 0.90; r 0.31 < 0.90 → keep
//   "is":     p/q = 0.05 / 0.40 = 0.125; r 0.62 > 0.125 → reject → resample "needs"
//   "on":     never tested (it came after a rejection)
//   tokens kept = 2 accepted + 1 resampled = 3 from one target pass (plain decoding: 1). If all 4 had passed, the
//   fifth p gives a bonus token: k + 1 = 5.
//
// Facts: Leviathan et al. (2023, arXiv 2211.17192) §2.3 and Algorithm 1; Chen et al. (2023, arXiv 2302.01318)
// Algorithm 2 (target and draft symbols swapped there). Both prove the output distribution equals the target's.
//
// Grid: a 190-wide label column at x 16; five token columns from x 236, 124 apart, 108 wide. Width 860.
// Colours (PROD_TONE): models and kept tokens green (model), drafts neutral (infra), the accept test lime (check),
// the rejection red (failure), the customer's context orange (traffic). One highlight: the resampled token.

const { drafts, correction } = SPECDEC_ROUND;
const K = drafts.length;

// Accept test, exactly as Algorithm 1: keep while r ≤ p/q (always when p ≥ q).
const ratio = drafts.map((d) => Math.min(1, d.p / d.q));
let accepted = 0;
while (accepted < K && drafts[accepted].r <= ratio[accepted]) accepted++;
const kept = [...drafts.slice(0, accepted).map((d) => d.token), correction];

const COL_X0 = 236;
const COL_STEP = 124;
const COL_W = 108;
const colX = (i: number) => COL_X0 + i * COL_STEP;
const BOX_H = 44;
const LEFT_W = 190;

const Y_CTX = 10;
const Y_HEAD = 38;
const Y_DRAFT = 62;
const Y_TARGET = 150;
const Y_P = 228;
const Y_TEST = 306;
const Y_OUT = 386;
const Y_NOTE = Y_OUT + BOX_H + 16;

// Two decimals unless a third is needed (0.90, 0.125).
const fmt = (v: number) => (Math.abs(v * 100 - Math.round(v * 100)) < 1e-9 ? v.toFixed(2) : v.toFixed(3));
const p2 = (v: number) => v.toFixed(2);

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  h = 20,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

const down = (id: string, x: number, y1: number, y2: number, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y: y1,
  w: 0,
  h: y2 - y1,
  step,
  quiet: true,
});

const shapes: LayoutShape[] = [
  // ── Step 1: draft ──────────────────────────────────────────────────────────────────────────────────────────
  text(
    "context",
    16,
    Y_CTX,
    828,
    `Customer: “the ${REFUND_CASE.item} from order ${REFUND_CASE.orderId} arrived cracked”. The assistant starts its answer.`,
    1,
    PROD_TONE.traffic
  ),
  {
    id: "draft-model",
    type: "box",
    x: 16,
    y: Y_DRAFT,
    w: LEFT_W,
    h: BOX_H,
    label: "Draft model (small)",
    sub: "4 quick passes, one per token",
    tone: PROD_TONE.model,
    fill: "soft",
    step: 1,
  },
];
drafts.forEach((d, i) => {
  shapes.push(text(`head-${i}`, colX(i), Y_HEAD, COL_W, `draft ${i + 1}`, 1), {
    id: `d-${i}`,
    type: "box",
    x: colX(i),
    y: Y_DRAFT,
    w: COL_W,
    h: BOX_H,
    label: d.token,
    sub: `q = ${p2(d.q)}`,
    tone: PROD_TONE.infra,
    fill: "pastel",
    step: 1,
    quiet: true,
  });
  shapes.push({
    id: `d-${i}-in`,
    type: "arrow",
    x: 0,
    y: 0,
    from: i === 0 ? "draft-model" : `d-${i - 1}`,
    to: `d-${i}`,
    step: 1,
    quiet: true,
  });
});

// ── Step 2: verify in one pass ───────────────────────────────────────────────────────────────────────────────
const TARGET_W = colX(K) + COL_W - colX(0);
shapes.push(
  {
    id: "target",
    type: "box",
    x: colX(0),
    y: Y_TARGET,
    w: TARGET_W,
    h: BOX_H,
    label: "Target model (large): one forward pass",
    sub: `reads the prompt + ${K} drafts at once and returns p at ${K + 1} positions`,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 2,
  },
  text(
    "target-side",
    16,
    Y_TARGET + 2,
    LEFT_W,
    "Decode is memory-bound:\nchecking 5 positions costs\nabout one normal step",
    2,
    PROD_TONE.infra,
    44
  )
);
drafts.forEach((d, i) => {
  shapes.push(down(`d-${i}>target`, colX(i) + COL_W / 2, Y_DRAFT + BOX_H, Y_TARGET, 2));
});
shapes.push(text("head-bonus", colX(K), Y_HEAD, COL_W, "after draft 4", 2));
for (let i = 0; i <= K; i++) {
  const bonus = i === K;
  shapes.push(down(`target>p-${i}`, colX(i) + COL_W / 2, Y_TARGET + BOX_H, Y_P, 2), {
    id: `p-${i}`,
    type: "box",
    x: colX(i),
    y: Y_P,
    w: COL_W,
    h: BOX_H,
    label: bonus ? "next-token p" : `p = ${p2(drafts[i].p)}`,
    sub: bonus ? "used if all 4 pass" : `for “${drafts[i].token}”`,
    tone: PROD_TONE.model,
    fill: "soft",
    step: 2,
    quiet: true,
  });
}

// ── Step 3: accept test, left to right ─────────────────────────────────────────────────────────────────────
shapes.push(
  text(
    "test-side",
    16,
    Y_TEST + 2,
    LEFT_W,
    "Keep each draft with\nprobability min(1, p/q);\nstop at the first reject",
    3,
    PROD_TONE.check,
    44,
    false
  )
);
drafts.forEach((d, i) => {
  if (i > accepted) {
    shapes.push(text(`test-${i}`, colX(i), Y_TEST + 12, COL_W, "not tested", 3));
    return;
  }
  const keep = i < accepted;
  const sub = d.p >= d.q ? "p ≥ q" : `r ${p2(d.r)} ${keep ? "<" : ">"} p/q ${fmt(ratio[i])}`;
  shapes.push({
    id: `test-${i}`,
    type: "box",
    x: colX(i),
    y: Y_TEST,
    w: COL_W,
    h: BOX_H,
    label: keep ? "keep" : "reject",
    sub,
    tone: keep ? PROD_TONE.check : PROD_TONE.failure,
    fill: "pastel",
    step: 3,
    quiet: true,
  });
});
if (accepted < K) shapes.push(text("test-bonus", colX(K), Y_TEST + 12, COL_W, "unused", 3));

// ── Step 4: the kept prefix plus the corrected token ─────────────────────────────────────────────────────────
shapes.push(text("out-side", 16, Y_OUT + 2, LEFT_W, "Answer after one\ntarget pass", 4, PROD_TONE.model, 44, false));
kept.forEach((tok, i) => {
  const fixed = i === kept.length - 1;
  shapes.push({
    id: `k-${i}`,
    type: "box",
    x: colX(i),
    y: Y_OUT,
    w: COL_W,
    h: BOX_H,
    label: tok,
    sub: fixed ? "resampled: p − q" : "draft kept",
    tone: PROD_TONE.model,
    fill: "pastel",
    highlight: fixed ? true : undefined,
    step: 4,
    quiet: true,
  });
});
shapes.push(
  text(
    "note-count",
    16,
    Y_NOTE,
    828,
    `${accepted} drafts kept + 1 corrected token = ${kept.length} tokens from one large-model pass, where plain decoding gets 1.`,
    4,
    PROD_TONE.model
  ),
  text(
    "note-bonus",
    16,
    Y_NOTE + 24,
    828,
    `Had all ${K} drafts passed, the fifth p would add a bonus token: ${K + 1} tokens from one pass.`,
    4
  ),
  text(
    "note-exact",
    16,
    Y_NOTE + 48,
    828,
    "The keep-or-resample rule makes the output follow the large model's distribution exactly.",
    4
  ),
  text("note-illus", 16, Y_NOTE + 72, 828, "Probabilities p, q and draws r are illustrative.", 4)
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Speculative decoding: draft, verify, accept, correct",
  width: 860,
  height: Y_NOTE + 100,
  steps: [
    { title: "Draft: the small model guesses 4 tokens, one quick pass each" },
    { title: "Verify: the large model scores all 4 drafts in one pass" },
    { title: "Accept: keep drafts left to right until one fails the test" },
    { title: "Correct: replace the first rejected draft with the target's token" },
  ],
  shapes,
};

export default spec;
