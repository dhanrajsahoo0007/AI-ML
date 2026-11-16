import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Autoregressive decoding vs masked-diffusion decoding of the same 8-token answer, for the "Parallel token
// refinement and remasking steps" concept on the Diffusion LLMs page. The prompt is "When and where shall we meet?";
// the answer is "We meet at noon by the old gate" (8 tokens, our own example).
// Left: an autoregressive model writes one token per forward pass, left to right, so it needs 8 passes.
// Right: a masked diffusion model starts with 8 [M] positions. Each denoising step predicts a token and a confidence
// for every masked position, keeps the K most confident predictions and remasks the rest ("low-confidence
// remasking", the default sampler of LLaDA, Nie et al. 2025, arXiv 2502.09992, §2.4, borrowed from MaskGIT). With a
// linear schedule and T = 4 steps, K = N / T = 8 / 4 = 2 tokens are committed per step.
// Steps 1–4: pass k of each model side by side. Step 5: the 4 extra passes the autoregressive model still needs.
//
// The confidences are made up for illustration (CONF below); which tokens are kept is computed from them:
//   step 1, masked 0–7: We .88, meet .52, at .30, noon .47, by .21 ("at"), the .33, old .18 ("main"), gate .79
//           → keep We (.88), gate (.79)
//   step 2, masked 1–6: meet .81, at .46, noon .58, by .29 ("at"), the .62, old .24 ("main") → keep meet, the
//   step 3, masked 2, 3, 4, 6: at .77, noon .69, by .55, old .48 → keep at, noon
//   step 4, masked 4, 6: by .86, old .74 → keep both; all 8 positions are filled after 4 passes.
// Words in parentheses are wrong guesses at low confidence; they are remasked and predicted again later.

const TOKENS = ["We", "meet", "at", "noon", "by", "the", "old", "gate"];
const N = TOKENS.length;
const T = 4;
const K = N / T; // tokens committed per denoising step

// CONF[s][i]: confidence of the prediction at position i in denoising step s (only read while i is masked).
// GUESS[s][i]: the predicted word when it differs from the final token.
const CONF = [
  [0.88, 0.52, 0.3, 0.47, 0.21, 0.33, 0.18, 0.79],
  [0, 0.81, 0.46, 0.58, 0.29, 0.62, 0.24, 0],
  [0, 0, 0.77, 0.69, 0.55, 0, 0.48, 0],
  [0, 0, 0, 0, 0.86, 0, 0.74, 0],
];
const GUESS: Record<string, string> = { "0-4": "at", "0-6": "main", "1-4": "at", "1-6": "main" };

interface Pred {
  pos: number;
  word: string;
  conf: number;
  kept: boolean;
}
const committedBefore: number[][] = []; // positions already filled before step s
const preds: Pred[][] = [];
let done: number[] = [];
for (let s = 0; s < T; s++) {
  committedBefore.push([...done]);
  const masked = TOKENS.map((_, i) => i).filter((i) => !done.includes(i));
  const keep = [...masked].sort((a, b) => CONF[s][b] - CONF[s][a]).slice(0, K);
  preds.push(
    masked.map((i) => ({ pos: i, word: GUESS[`${s}-${i}`] ?? TOKENS[i], conf: CONF[s][i], kept: keep.includes(i) }))
  );
  done = [...done, ...keep];
}
if (done.length !== N) throw new Error("diffusion did not fill every position");

// ── Grid ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ROW_TOP = 112;
const PITCH = 44;
const CELL_H = 36;
const rowY = (r: number) => ROW_TOP + r * PITCH;
const AR = { group: 8, label: 16, cells: 68, pitch: 41, w: 40 };
const DF = { group: 420, label: 428, cells: 480, pitch: 48, w: 46 };
const GROUP_Y = 72;
const GROUP_BOTTOM = rowY(N - 1) + CELL_H + 14;
const TOKEN: LayoutTone = ROLE_TONE.softmax; // a chosen token (green)
const MASKED: LayoutTone = ROLE_TONE.masked; // [M] or a remasked guess (gray)
const fmt = (c: number) => c.toFixed(2).replace(/^0\./, ".");

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  step: number,
  label: string | undefined,
  tone: LayoutTone,
  fill: "pastel" | "soft",
  sub?: string
): LayoutShape => ({ id, type: "cell", x, y, w, h: CELL_H, label, sub, tone, fill, step, quiet: true });

const shapes: LayoutShape[] = [
  text(
    "prompt",
    16,
    12,
    848,
    20,
    "Prompt: “When and where shall we meet?”  Both models must fill 8 answer positions.",
    "neutral",
    1
  ),
];

// ── Autoregressive: pass k writes token k ───────────────────────────────────────────────────────────────────
for (let k = 0; k < N; k++) {
  const step = Math.min(k + 1, T + 1);
  shapes.push(text(`ar-l-${k}`, AR.label, rowY(k), 48, CELL_H, `pass ${k + 1}`, "neutral", step, k !== T));
  for (let i = 0; i < N; i++) {
    const x = AR.cells + i * AR.pitch;
    if (i < k) shapes.push(cell(`ar-${k}-${i}`, x, rowY(k), AR.w, step, TOKENS[i], TOKEN, "soft"));
    else if (i === k) shapes.push(cell(`ar-${k}-${i}`, x, rowY(k), AR.w, step, TOKENS[i], TOKEN, "pastel"));
    else shapes.push(cell(`ar-${k}-${i}`, x, rowY(k), AR.w, step, undefined, MASKED, "soft"));
  }
}

// ── Masked diffusion: step s predicts every masked position and keeps the K most confident ───────────────────
for (let s = 0; s < T; s++) {
  shapes.push(text(`df-l-${s}`, DF.label, rowY(s), 48, CELL_H, `step ${s + 1}`, "neutral", s + 1, false));
  for (let i = 0; i < N; i++) {
    const x = DF.cells + i * DF.pitch;
    const p = preds[s].find((q) => q.pos === i);
    if (!p) shapes.push(cell(`df-${s}-${i}`, x, rowY(s), DF.w, s + 1, TOKENS[i], TOKEN, "soft"));
    else if (p.kept) shapes.push(cell(`df-${s}-${i}`, x, rowY(s), DF.w, s + 1, p.word, TOKEN, "pastel", fmt(p.conf)));
    else shapes.push(cell(`df-${s}-${i}`, x, rowY(s), DF.w, s + 1, p.word, MASKED, "soft", fmt(p.conf)));
  }
}

// ── Notes ────────────────────────────────────────────────────────────────────────────────────────────────────
const NOTE_Y = rowY(T) + 4;
shapes.push(
  text(
    "df-rule",
    DF.label,
    NOTE_Y,
    436,
    54,
    `Each step predicts every masked position at once,\nkeeps the ${K} most confident (green, with confidence)\nand remasks the rest (gray) for the next step.`,
    "neutral",
    1
  ),
  text(
    "df-done",
    DF.label,
    NOTE_Y + 66,
    436,
    36,
    `Done after ${T} passes: ${K} tokens per pass.\nEach pass recomputes all ${N} positions (no KV cache).`,
    TOKEN,
    T
  ),
  text(
    "ar-done",
    16,
    GROUP_BOTTOM + 12,
    388,
    36,
    `Done after ${N} passes: 1 token per pass.\nEach pass reuses the KV cache of earlier tokens.`,
    TOKEN,
    T + 1
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Autoregressive vs masked-diffusion decoding",
  width: 880,
  height: GROUP_BOTTOM + 60,
  steps: [
    { title: "Pass 1: one token vs the two most confident guesses" },
    { title: "Pass 2: diffusion predicts again with more context" },
    { title: "Pass 3: wrong low-confidence guesses were remasked" },
    { title: `Pass 4: diffusion has filled all ${N} positions` },
    { title: "Autoregression needs four more passes" },
  ],
  groups: [
    {
      id: "g-ar",
      title: "Autoregressive",
      tone: "neutral",
      x: AR.group,
      y: GROUP_Y,
      w: 396,
      h: GROUP_BOTTOM - GROUP_Y,
    },
    {
      id: "g-df",
      title: "Masked diffusion, T = 4 steps",
      tone: TOKEN,
      x: DF.group,
      y: GROUP_Y,
      w: 452,
      h: GROUP_BOTTOM - GROUP_Y,
    },
  ],
  shapes,
};

export default spec;
