import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { block } from "@/components/diagrams/presets/transformer";

// The selective scan of Mamba drawn as a recurrence chain over three time steps (t − 1, t, t + 1). Static: every
// column is the same computation; only the inputs differ.
//
// Facts checked against Gu & Dao (2023), "Mamba: Linear-Time Sequence Modeling with Selective State Spaces",
// arXiv 2312.00752, Section 2–3:
// - Discrete SSM: h_t = Ā h_{t−1} + B̄ x_t,  y_t = C h_t.
// - Zero-order hold: Ā = exp(ΔA),  B̄ = (ΔA)⁻¹ (exp(ΔA) − I) · ΔB.
// - Selection (Algorithm 2): B = s_B(x) = Linear_N(x), C = s_C(x) = Linear_N(x), Δ = softplus(parameter + s_Δ(x)),
//   so Δ, B and C have a length dimension (one value per token); A stays a learned, input-independent parameter.
// - Interpretation: a large Δ resets the state and focuses on the current input; a small Δ keeps the state and
//   ignores the current input.
// - Because the parameters vary with time, the model can no longer be computed as a convolution; Mamba uses a
//   parallel scan in a fused kernel that keeps the expanded state in on-chip SRAM, not in HBM.
//
// Colours: the state is teal (the SSM tone used across the ssm-* figures), the selection projection is a Linear
// (violet, from ROLE_TONE), inputs and outputs are neutral.

const COLS = [170, 430, 690];
const SUB = ["t−1", "t", "t+1"];
const Y_Y = 110;
const H_Y = 212;
const SEL_Y = 312;
const X_Y = 404;
const STATE: LayoutTone = "teal";

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 20) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

const shapes: LayoutShape[] = [
  text("eq-1", 40, 14, 400, "h(t) = Ā · h(t−1) + B̄ · x(t)"),
  text("eq-2", 440, 14, 380, "y(t) = C · h(t)"),
  text("eq-3", 40, 42, 400, "Ā = exp(Δ · A)"),
  text("eq-4", 440, 42, 380, "B̄ = (Δ · A)⁻¹ (exp(Δ · A) − I) · Δ · B"),
  text("eq-note", 40, 64, 780, "zero-order hold; Δ, B and C, and so Ā and B̄, are new at every step", "violet"),
];

COLS.forEach((cx, i) => {
  const s = SUB[i];
  shapes.push(
    {
      id: `y-${i}`,
      type: "box",
      x: cx - 55,
      y: Y_Y,
      w: 110,
      h: 36,
      label: `y(${s})`,
      sub: "output",
      tone: "neutral",
      fill: "pastel",
    },
    {
      id: `h-${i}`,
      type: "box",
      x: cx - 60,
      y: H_Y,
      w: 120,
      h: 44,
      label: `h(${s})`,
      sub: "state, fixed size",
      tone: STATE,
      fill: "pastel",
      highlight: i === 1 || undefined,
    },
    {
      id: `x-${i}`,
      type: "box",
      x: cx - 55,
      y: X_Y,
      w: 110,
      h: 36,
      label: `x(${s})`,
      sub: "token input",
      tone: "neutral",
      fill: "pastel",
    },
    block(`sel-${i}`, "linear", cx + 34, SEL_Y, { w: 108, h: 40, label: "Δ, B, C", sub: `from x(${s})` }),
    { id: `read-${i}`, type: "arrow", x: 0, y: 0, from: `h-${i}`, to: `y-${i}`, label: "× C", tone: "neutral" },
    { id: `write-${i}`, type: "arrow", x: 0, y: 0, from: `x-${i}`, to: `h-${i}`, label: "× B̄", tone: "neutral" },
    { id: `proj-${i}`, type: "arrow", x: 0, y: 0, from: `x-${i}`, to: `sel-${i}`, tone: "neutral" },
    { id: `set-${i}`, type: "arrow", x: 0, y: 0, from: `sel-${i}`, to: `h-${i}`, tone: "violet", dashed: true }
  );
  if (i > 0) {
    shapes.push({
      id: `carry-${i}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `h-${i - 1}`,
      to: `h-${i}`,
      label: "× Ā",
      tone: STATE,
    });
  }
});

// The chain continues on both sides.
const MID = H_Y + 22;
shapes.push(
  { id: "carry-in", type: "arrow", x: 16, y: MID, w: COLS[0] - 60 - 16 - 2, h: 0, tone: STATE },
  text("carry-in-label", 10, MID - 30, 90, "h(t−2) …", STATE),
  { id: "carry-out", type: "arrow", x: COLS[2] + 60 + 2, y: MID, w: 860 - COLS[2] - 60 - 18, h: 0, tone: STATE },
  text("carry-out-label", 770, MID - 30, 90, "… h(t+2)", STATE)
);

// What the selection does.
const NOTE_Y = X_Y + 58;
shapes.push(
  text(
    "note-select",
    20,
    NOTE_Y,
    820,
    "A is learned once and is the same at every step. Δ, B and C are computed from each token (dashed violet):\n" +
      "that makes the layer selective. A large Δ resets the state to take in this token; a small Δ keeps the state and skips it.",
    "neutral",
    36
  ),
  text(
    "note-scan",
    20,
    NOTE_Y + 46,
    820,
    "Inference runs the chain left to right and keeps only the latest h. Training computes every h at once with a parallel scan.",
    STATE
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The selective scan: an input-dependent recurrence",
  width: 860,
  height: NOTE_Y + 80,
  shapes,
};

export default spec;
