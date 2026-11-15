import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Self-speculative decoding with 4 prediction heads, for "Turning MTP heads into built-in speculative drafters" on the
// Multi-Token Prediction page. Greedy decoding, our own example prompt "The meeting moved to".
// Step 1 (draft): one forward pass; head 1 gives the real next token, heads 2–4 give k = 3 draft tokens.
// Step 2 (verify): one forward pass over all drafts at once; the next-token head at every position says what greedy
//   decoding would have produced there.
// Step 3 (accept): keep the drafts up to the first mismatch, then take the verifier's own token at the mismatch.
//
// Working (computed below):
//   draft     = Friday | at | noon | because   (head 1 … head 4)
//   verifier  = after "Friday" → "at" ✓, after "at" → "noon" ✓, after "noon" → "and" ✗ (draft was "because")
//   accepted drafts = 2 of 3; tokens kept = 1 (head 1) + 2 (accepted) + 1 (correction) = 4
//   forward passes = 2 (draft + verify); plain greedy decoding gets 2 tokens from 2 passes, so 2× here.
//   The output is identical to greedy decoding, because every kept token is what the next-token head chose.
//
// Facts: blockwise parallel decoding (Stern et al., 2018, arXiv 1811.03115) predicts, verifies and accepts the
// longest matching prefix; Gloeckle et al. (2024, arXiv 2404.19737, §3.2) use their extra heads this way and report
// 3.0× faster decoding on code for 7B models with n = 4, accepting on average 2.5 of 3 suggested tokens. In practice
// the verify pass also runs the extra heads, so it drafts the next block too (a note says this).

const PROMPT = "The meeting moved to";
const DRAFT = ["Friday", "at", "noon", "because"]; // heads 1–4
const VERIFY = ["at", "noon", "and", "the"]; // greedy next token after each drafted token (last one is unused)

let accepted = 0;
while (accepted < DRAFT.length - 1 && VERIFY[accepted] === DRAFT[accepted + 1]) accepted++;
const kept = [DRAFT[0], ...DRAFT.slice(1, 1 + accepted), VERIFY[accepted]];
const PASSES = 2;

const COL_X0 = 236;
const COL_STEP = 150;
const COL_W = 124;
const colX = (i: number) => COL_X0 + i * COL_STEP;
const BOX_H = 40;
const PROB: LayoutTone = ROLE_TONE.softmax;
const BAD: LayoutTone = ROLE_TONE.blocked;

const Y_HEAD = 58;
const Y_DRAFT = 84;
const Y_VERIFY = 184;
const Y_OUT = 284;
const Y_CHECK = Y_OUT + BOX_H + 6;
const Y_FINAL = 404;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral",
  h = 20,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

const shapes: LayoutShape[] = [
  // ── Step 1: draft ──────────────────────────────────────────────────────────────────────────────────────────
  text("prompt", 16, 20, 190, `prompt: “${PROMPT}”`, 1),
  {
    id: "model",
    type: "box",
    x: 16,
    y: Y_DRAFT - 2,
    w: 190,
    h: 44,
    label: "Pass 1: trunk +\n4 heads",
    tone: "neutral",
    fill: "pastel",
    step: 1,
  },
  { id: "prompt>model", type: "arrow", x: 111, y: 42, w: 0, h: Y_DRAFT - 2 - 42, step: 1, quiet: true },
  { id: "model>d-0", type: "arrow", x: 0, y: 0, from: "model", to: "d-0", step: 1, quiet: true },
];
DRAFT.forEach((tok, i) => {
  shapes.push(
    text(`hd-${i}`, colX(i), Y_HEAD, COL_W, i === 0 ? "head 1: next token" : `head ${i + 1}: draft`, 1, PROB),
    {
      id: `d-${i}`,
      type: "box",
      x: colX(i),
      y: Y_DRAFT,
      w: COL_W,
      h: BOX_H,
      label: tok,
      tone: PROB,
      fill: i === 0 ? "pastel" : "soft",
      step: 1,
      quiet: true,
    }
  );
});

// ── Step 2: verify in one pass ─────────────────────────────────────────────────────────────────────────────────
shapes.push(
  {
    id: "verify",
    type: "box",
    x: colX(0),
    y: Y_VERIFY,
    w: colX(DRAFT.length - 1) + COL_W - colX(0),
    h: 44,
    label: "Pass 2: run the model on all 4 tokens at once",
    sub: "the next-token head at each position gives the greedy choice",
    tone: "neutral",
    fill: "pastel",
    step: 2,
  },
  text("verify-side", 16, Y_VERIFY + 4, 190, "One pass checks every\ndraft in parallel.", 2, "neutral", 36)
);
DRAFT.forEach((_, i) => {
  shapes.push({
    id: `d-${i}>verify`,
    type: "arrow",
    x: colX(i) + COL_W / 2,
    y: Y_DRAFT + BOX_H,
    w: 0,
    h: Y_VERIFY - Y_DRAFT - BOX_H,
    step: 2,
    quiet: true,
  });
});
// The verifier's token after draft i checks draft i + 1, so it sits in column i + 1.
for (let i = 0; i < DRAFT.length - 1; i++) {
  const x = colX(i + 1);
  shapes.push(
    {
      id: `verify>v-${i}`,
      type: "arrow",
      x: x + COL_W / 2,
      y: Y_VERIFY + 44,
      w: 0,
      h: Y_OUT - Y_VERIFY - 44,
      step: 2,
      quiet: true,
    },
    {
      id: `v-${i}`,
      type: "box",
      x,
      y: Y_OUT,
      w: COL_W,
      h: BOX_H,
      label: VERIFY[i],
      sub: `greedy after “${DRAFT[i]}”`,
      tone: "neutral",
      fill: "pastel",
      step: 2,
      quiet: true,
    }
  );
}

// ── Step 3: compare and accept ─────────────────────────────────────────────────────────────────────────────────
for (let i = 0; i < DRAFT.length - 1; i++) {
  if (i > accepted) break;
  const ok = i < accepted;
  shapes.push(
    text(
      `check-${i}`,
      colX(i + 1) - 10,
      Y_CHECK,
      COL_W + 20,
      ok ? "✓ matches the draft" : `✗ draft was “${DRAFT[i + 1]}”`,
      3,
      ok ? PROB : BAD
    )
  );
}
for (let i = accepted + 2; i < DRAFT.length; i++) {
  shapes.push(text(`skip-${i}`, colX(i) - 10, Y_CHECK, COL_W + 20, "discarded", 3, "neutral"));
}
shapes.push(text("final-label", 16, Y_FINAL + 10, 190, "Output after 2 passes", 3, PROB, 20, false));
kept.forEach((tok, i) => {
  shapes.push({
    id: `k-${i}`,
    type: "box",
    x: colX(i),
    y: Y_FINAL,
    w: COL_W,
    h: BOX_H,
    label: tok,
    tone: PROB,
    fill: "pastel",
    highlight: i === kept.length - 1 ? true : undefined,
    step: 3,
    quiet: true,
  });
});
shapes.push(
  text(
    "note-count",
    16,
    Y_FINAL + BOX_H + 18,
    836,
    `${accepted} of ${DRAFT.length - 1} drafts accepted, plus 1 correction: ${kept.length} tokens from ${PASSES} passes, where plain decoding gets ${PASSES}. Same text as greedy decoding.`,
    3,
    PROB
  ),
  text(
    "note-pipe",
    16,
    Y_FINAL + BOX_H + 42,
    836,
    `The verify pass also runs heads 2–4 at “${kept[kept.length - 2]}”, so the tokens after “${kept[kept.length - 1]}” are already drafted.`,
    3
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Self-speculative decoding with 4 heads",
  width: 860,
  height: Y_FINAL + BOX_H + 76,
  steps: [
    { title: "Draft: one pass, head 1 picks the next token, heads 2–4 guess the 3 after it" },
    { title: "Verify: one pass over all drafts gives the greedy token at each position" },
    { title: "Accept the matching prefix, then the verifier's token at the first mismatch" },
  ],
  shapes,
};

export default spec;
