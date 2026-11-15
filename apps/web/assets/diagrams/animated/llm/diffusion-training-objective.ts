import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, block } from "@/components/diagrams/presets/transformer";

// The masked-diffusion training objective on one example, for the "Discrete and masked diffusion" concept on the
// Diffusion LLMs page. Static figure, read top to bottom.
//
// Objective (LLaDA, Nie et al. 2025, arXiv 2502.09992, Eq. 3; MDLM, Sahoo et al. 2024, arXiv 2406.07524, shows the
// same form is a weighted average of masked-LM losses):
//   L(θ) = −E_{t, x0, xt} [ (1/t) Σ_i 1[xt^i = M] log p_θ(x0^i | xt) ]
// with t drawn uniformly from (0, 1] and each token of x0 masked independently with probability t. The loss is
// computed only on masked positions; the 1/t factor makes it an upper bound on the negative log-likelihood.
//
// Our example (made up): x0 = "Rain fell all night so the river rose", t = 0.5.
//   Per-position uniform draws u (fixed below): 0.71 0.23 0.88 0.41 0.64 0.09 0.37 0.93 → masked where u < t:
//   positions 1, 3, 5, 6 ("fell", "night", "the", "river"): 4 of 8, the expected t × 8 = 4.
//   Model's probability of the true token at each masked position (made up): 0.62, 0.35, 0.80, 0.21
//   −ln p: 0.478, 1.050, 0.223, 1.561 → sum 3.312 → × 1/t = 2 → loss 6.62 for this example.

const TOKENS = ["Rain", "fell", "all", "night", "so", "the", "river", "rose"];
const U = [0.71, 0.23, 0.88, 0.41, 0.64, 0.09, 0.37, 0.93];
const T_RATIO = 0.5;
const P_TRUE: Record<number, number> = { 1: 0.62, 3: 0.35, 5: 0.8, 6: 0.21 };

const MASKED_POS = U.map((u, i) => (u < T_RATIO ? i : -1)).filter((i) => i >= 0);
if (MASKED_POS.join() !== Object.keys(P_TRUE).join()) throw new Error("P_TRUE must cover exactly the masked positions");
const NLL = MASKED_POS.map((i) => -Math.log(P_TRUE[i]));
const NLL_SUM = NLL.reduce((a, b) => a + b, 0);
const LOSS = NLL_SUM / T_RATIO;

// ── Grid ─────────────────────────────────────────────────────────────────────────────────────────────────────
const CELLS_X = 136;
const PITCH = 82;
const CELL_W = 78;
const cx = (i: number) => CELLS_X + i * PITCH;
const ROW_W = PITCH * TOKENS.length - (PITCH - CELL_W); // 652
const Y = { x0: 60, u: 98, xt: 162, model: 244, pred: 340, nll: 386, loss: 440 };
const MID_X = CELLS_X + ROW_W / 2;
const MASK: LayoutTone = ROLE_TONE.mask; // pink
const PROB: LayoutTone = ROLE_TONE.softmax; // green

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone,
});
const rowLabel = (id: string, y: number, h: number, label: string, tone: LayoutTone = "neutral") =>
  text(id, 8, y, 120, h, label, tone);

const shapes: LayoutShape[] = [
  text(
    "rule",
    16,
    12,
    848,
    20,
    `One training example: draw a mask ratio t uniformly from (0, 1]; here t = ${T_RATIO}`,
    "neutral"
  ),
  rowLabel("l-x0", Y.x0, 32, "clean text x₀"),
  rowLabel("l-u", Y.u, 20, "draw u per token"),
  rowLabel("l-xt", Y.xt, 32, "masked input xₜ", MASK),
  rowLabel("l-pred", Y.pred, 40, "prediction", PROB),
  rowLabel("l-nll", Y.nll, 20, "loss term −ln p"),
];

TOKENS.forEach((tok, i) => {
  const masked = MASKED_POS.includes(i);
  shapes.push(
    { id: `x0-${i}`, type: "cell", x: cx(i), y: Y.x0, w: CELL_W, h: 32, label: tok, tone: "neutral", fill: "soft" },
    text(`u-${i}`, cx(i), Y.u, CELL_W, 20, `u = ${U[i].toFixed(2)}`, masked ? MASK : "neutral"),
    {
      id: `xt-${i}`,
      type: "cell",
      x: cx(i),
      y: Y.xt,
      w: CELL_W,
      h: 32,
      label: masked ? "[M]" : tok,
      tone: masked ? MASK : "neutral",
      fill: masked ? "pastel" : "soft",
    }
  );
  if (masked) {
    const k = MASKED_POS.indexOf(i);
    shapes.push(
      {
        id: `pred-${i}`,
        type: "cell",
        x: cx(i),
        y: Y.pred,
        w: CELL_W,
        h: 40,
        label: tok,
        sub: `p = ${P_TRUE[i].toFixed(2)}`,
        tone: PROB,
        fill: "pastel",
      },
      text(`nll-${i}`, cx(i), Y.nll, CELL_W, 20, NLL[k].toFixed(2), "neutral")
    );
  } else {
    shapes.push(text(`pred-${i}`, cx(i), Y.pred, CELL_W, 40, "visible:\nno loss", "neutral"));
  }
});

shapes.push(
  {
    id: "mask-arrow",
    type: "arrow",
    x: MID_X,
    y: Y.u + 22,
    w: 0,
    h: Y.xt - Y.u - 26,
    label: `mask where u < ${T_RATIO}`,
    tone: "neutral",
  },
  block("model", "block", CELLS_X, Y.model, {
    w: ROW_W,
    label: "Mask predictor: a Transformer with no causal mask",
    sub: "every position attends to all 8 positions, masked or not",
  }),
  { id: "xt>model", type: "arrow", x: MID_X, y: Y.xt + 36, w: 0, h: Y.model - Y.xt - 40, label: "xₜ" },
  {
    id: "model>pred",
    type: "arrow",
    x: MID_X,
    y: Y.model + 46,
    w: 0,
    h: Y.pred - Y.model - 50,
    label: "pθ(x₀ⁱ | xₜ) at every [M]",
  },
  {
    id: "loss",
    type: "box",
    x: CELLS_X,
    y: Y.loss,
    w: ROW_W,
    h: 44,
    label: `Loss = (1 / t) × Σ −ln p over masked positions = ${(1 / T_RATIO).toFixed(0)} × ${NLL_SUM.toFixed(2)} = ${LOSS.toFixed(2)}`,
    sub: "the 1/t weight makes this an upper bound on −log-likelihood",
    tone: PROB,
    fill: "pastel",
    highlight: true,
  },
  {
    id: "nll>loss",
    type: "arrow",
    x: MID_X,
    y: Y.nll + 22,
    w: 0,
    h: Y.loss - Y.nll - 26,
  },
  text(
    "note",
    16,
    Y.loss + 60,
    848,
    20,
    `${MASKED_POS.length} of ${TOKENS.length} tokens masked (t × 8 = ${T_RATIO * 8} expected). The next example may draw t = 0.1 (about 1 masked) or t = 0.9 (about 7).`,
    "neutral"
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The masked-diffusion training objective",
  width: 880,
  height: Y.loss + 96,
  shapes,
};

export default spec;
