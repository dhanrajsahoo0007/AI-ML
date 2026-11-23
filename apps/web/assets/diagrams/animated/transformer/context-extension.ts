import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Extending a RoPE model's context window, replacing the Mermaid under "Extending a context window" on the Positional
// Encodings page. Top: a model trained on positions 0–4K is given 16K. Extrapolation feeds positions past 4K as they
// are; position interpolation divides every position by the scale factor s = 16K / 4K = 4, so 16K lands on 4K.
// Middle: NTK-aware scaling and YaRN scale each frequency differently. Bottom: the usual recipe.
//
// Facts checked:
// - Chen et al., 2023, "Extending Context Window of Large Language Models via Positional Interpolation" (arXiv
//   2306.15595): position interpolation "linearly down-scales the input position indices to match the original context
//   window size" (position m becomes m · L / L′), instead of extrapolating past the trained length, where attention
//   scores can blow up; it extends LLaMA 7B–65B to 32,768 tokens with about 1,000 fine-tuning steps.
// - Why extrapolation fails: RoPE rotates pair i by m · θᵢ, θᵢ = 10000^(−2i/d). Fast pairs (short wavelengths) wrap
//   many times inside 4K, so they have seen every angle; slow pairs (wavelengths longer than 4K) never turned past
//   the angle reached at position 4K, so positions beyond it give them angles never seen in training.
// - Peng et al., 2023, "YaRN" (arXiv 2309.00071), §3: NTK-aware scaling changes the RoPE base so high frequencies are
//   scaled little and low frequencies close to s; "NTK-by-parts" (used by YaRN) sets, per pair d with wavelength
//   λ_d = 2π · b^(2d/|D|) and ratio r = L / λ_d: no interpolation if r > β, full interpolation by s if r < α, a linear
//   ramp in between; α = 1, β = 32 for LLaMA. The new frequency is θ′ = (1 − γ) · θ / s + γ · θ, γ = ramp(r).
//   (YaRN also rescales the attention temperature; left out of the drawing.) YaRN needs about 10× fewer tokens and
//   2.5× fewer training steps than earlier methods.
//
// Bars below: the effective position divisor θ / θ′ = 1 / ((1 − γ) / s + γ) for every 4th of the 64 pairs of a
// d_head = 128, base 10,000 model, trained length L = 4096, s = 4 (computed in `divisor`). Working:
//   pair  0: λ = 6.3,    r = 652  → γ = 1    → ÷ 1.00 (unchanged)
//   pair 20: λ = 111.7,  r = 36.7 → γ = 1    → ÷ 1.00
//   pair 24: λ = 198.7,  r = 20.6 → γ = 0.63 → ÷ 1.38
//   pair 32: λ = 628.3,  r = 6.5  → γ = 0.18 → ÷ 2.61
//   pair 44: λ = 3533,   r = 1.16 → γ = 0.005 → ÷ 3.94
//   pair 48: λ = 6283,   r = 0.65 → γ = 0    → ÷ 4.00 (full interpolation)
// Pairs 0–20 are unchanged, 24–44 ramp, 48–60 are divided by the full factor 4.

const W = 880;
const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 18) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;
const line = (id: string, points: [number, number][], opts: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  tone: "neutral",
  ...opts,
});

// ── Top: extrapolation vs position interpolation ─────────────────────────────────────────────────────────────

const TRAINED_K = 4;
const TARGET_K = 16;
const S = TARGET_K / TRAINED_K; // 4
const X0 = 200;
const PER_K = 38; // px per 1K positions
const xAt = (k: number) => X0 + k * PER_K;
const TICKS = [0, 4, 8, 12, 16];

const TOP = { y: 40, h: 290 };
const EX_Y = 112; // extrapolation axis
const PI_TOP = 196; // interpolation: input positions
const PI_BOT = 266; // interpolation: trained range

const kLabel = (k: number) => (k === 0 ? "0" : `${k}K`);

function axis(id: string, y: number, toK: number): LayoutShape {
  return line(id, [
    [xAt(0), y],
    [xAt(toK), y],
  ]);
}

const top: LayoutShape[] = [
  // Extrapolation.
  text("ex-name", 24, EX_Y - 30, 160, "Extrapolation\n(positions as they are)", "neutral", 36),
  {
    id: "ex-seen",
    type: "cell",
    x: xAt(0),
    y: EX_Y - 22,
    w: TRAINED_K * PER_K,
    h: 22,
    label: "trained: 0–4K",
    tone: "green",
    fill: "soft",
  },
  {
    id: "ex-unseen",
    type: "cell",
    x: xAt(TRAINED_K),
    y: EX_Y - 22,
    w: (TARGET_K - TRAINED_K) * PER_K,
    h: 22,
    label: "past 4K: slow pairs turn to angles never seen",
    tone: ROLE_TONE.blocked,
    fill: "soft",
  },
  axis("ex-axis", EX_Y, TARGET_K),
  ...TICKS.flatMap((k) => [
    line(`ex-tick-${k}`, [
      [xAt(k), EX_Y],
      [xAt(k), EX_Y + 6],
    ]),
    text(`ex-tick-${k}-l`, xAt(k) - 20, EX_Y + 8, 40, kLabel(k)),
  ]),
  // Position interpolation.
  text(
    "pi-name",
    24,
    (PI_TOP + PI_BOT) / 2 - 18,
    160,
    `Position interpolation\n(every position ÷ ${S})`,
    "neutral",
    36
  ),
  text("pi-in", xAt(TARGET_K) - 140, PI_TOP - 46, 140, "input positions"),
  axis("pi-axis-top", PI_TOP, TARGET_K),
  ...TICKS.flatMap((k) => [
    line(`pi-top-tick-${k}`, [
      [xAt(k), PI_TOP - 6],
      [xAt(k), PI_TOP],
    ]),
    text(`pi-top-tick-${k}-l`, xAt(k) - 20, PI_TOP - 26, 40, kLabel(k)),
    // Each input position k lands on k / s.
    {
      id: `pi-map-${k}`,
      type: "arrow",
      x: xAt(k),
      y: PI_TOP + 4,
      w: xAt(k / S) - xAt(k),
      h: PI_BOT - 4 - (PI_TOP + 4),
      tone: "neutral",
      label: k === TARGET_K ? `÷ ${S}` : undefined,
    } as LayoutShape,
  ]),
  axis("pi-axis-bot", PI_BOT, TRAINED_K),
  {
    id: "pi-range",
    type: "cell",
    x: xAt(0),
    y: PI_BOT,
    w: TRAINED_K * PER_K,
    h: 22,
    label: "trained: 0–4K",
    tone: "green",
    fill: "soft",
  },
  ...[0, 1, 2, 3, 4].map((k) => text(`pi-bot-tick-${k}`, xAt(k) - 20, PI_BOT + 26, 40, kLabel(k))),
  text(
    "pi-note",
    xAt(TRAINED_K) + 40,
    PI_BOT + 2,
    440,
    "Every position now lands inside the trained range,\nbut neighbours are only ¼ of a step apart.",
    "neutral",
    36
  ),
];

// ── Middle: per-frequency scaling (NTK-aware, YaRN) ──────────────────────────────────────────────────────────

const D_HEAD = 128;
const PAIRS = D_HEAD / 2; // 64
const BASE = 10000;
const L = 4096;
const ALPHA = 1;
const BETA = 32;

function divisor(pair: number) {
  const lambda = 2 * Math.PI * Math.pow(BASE, (2 * pair) / D_HEAD);
  const r = L / lambda;
  const gamma = r < ALPHA ? 0 : r > BETA ? 1 : (r - ALPHA) / (BETA - ALPHA);
  return 1 / ((1 - gamma) / S + gamma);
}

const BARS = Array.from({ length: PAIRS / 4 }, (_, i) => i * 4); // pairs 0, 4, …, 60
const MID = { y: 372, h: 248 };
const BAR_X = 220;
const BAR_PITCH = 36;
const BAR_W = 28;
const BASELINE = 540;
const UNIT = 24; // px per ÷1
const barX = (i: number) => BAR_X + i * BAR_PITCH;
const regime = (f: number): LayoutTone => (f < 1.005 ? "orange" : f > 3.995 ? "blue" : "green");
const lastOf = (tone: LayoutTone) =>
  BARS.length - 1 - [...BARS].reverse().findIndex((p) => regime(divisor(p)) === tone);
const firstOf = (tone: LayoutTone) => BARS.findIndex((p) => regime(divisor(p)) === tone);

const span = (tone: LayoutTone) => [barX(firstOf(tone)), barX(lastOf(tone)) + BAR_W] as const;

const middle: LayoutShape[] = [
  line(
    "ref-4",
    [
      [BAR_X - 10, BASELINE - S * UNIT],
      [barX(BARS.length - 1) + BAR_W + 10, BASELINE - S * UNIT],
    ],
    { dashed: true, weight: 0.3 }
  ),
  line(
    "ref-1",
    [
      [BAR_X - 10, BASELINE - UNIT],
      [barX(BARS.length - 1) + BAR_W + 10, BASELINE - UNIT],
    ],
    { dashed: true, weight: 0.3 }
  ),
  line("baseline", [
    [BAR_X - 10, BASELINE],
    [barX(BARS.length - 1) + BAR_W + 10, BASELINE],
  ]),
  text("ref-4-l", 40, BASELINE - S * UNIT - 9, 164, `position ÷ ${S}`),
  text("ref-1-l", 40, BASELINE - UNIT - 9, 164, "÷ 1 (unchanged)"),
  text("y-title", 40, MID.y + 22, 164, "how much each\npair is squeezed", "neutral", 36),
  text(
    "pi-ref",
    span("blue")[0] - 250,
    BASELINE - S * UNIT - 26,
    240,
    "position interpolation: every pair ÷ 4",
    "neutral"
  ),
  ...BARS.map((pair, i): LayoutShape => {
    const f = divisor(pair);
    const h = Math.round(f * UNIT * 10) / 10;
    return {
      id: `bar-${pair}`,
      type: "cell",
      x: barX(i),
      y: BASELINE - h,
      w: BAR_W,
      h,
      tone: regime(f),
      fill: "pastel",
      quiet: true,
    };
  }),
  ...(["orange", "green", "blue"] as const).map((tone) => {
    const [a, b] = span(tone);
    const label = {
      orange: "fast pairs: barely scaled,\nlocal detail kept",
      green: "in between:\na gradual ramp",
      blue: `slow pairs:\nfull ÷ ${S}`,
    }[tone];
    return text(`band-${tone}`, (a + b) / 2 - 110, BASELINE + 10, 220, label, tone, 36);
  }),
  text(
    "mid-note",
    24,
    BASELINE + 54,
    W - 48,
    "Shown: every 4th of the 64 dimension pairs of a 128-wide head (RoPE base 10,000), using YaRN's ramp for 4K → 16K.",
    "neutral"
  ),
];

// ── Bottom: the recipe ───────────────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "rescale", label: "Rescale RoPE", sub: "PI, NTK or YaRN", w: 150 },
  { id: "finetune", label: "Short fine-tune\non long documents", w: 160 },
  { id: "check", label: "Check needle-in-a-haystack\nand long-document QA", w: 196 },
  { id: "serve", label: "Serve at 32K–128K\ntokens", w: 150 },
];
const GAP = 44;
const ROW_Y = MID.y + MID.h + 40;
const totalW = STEPS.reduce((a, s) => a + s.w, 0) + GAP * (STEPS.length - 1);
let cursor = (W - totalW) / 2;
const recipe: LayoutShape[] = [];
STEPS.forEach((s, i) => {
  recipe.push({
    id: s.id,
    type: "box",
    x: cursor,
    y: ROW_Y,
    w: s.w,
    h: 50,
    label: s.label,
    sub: s.sub,
    tone: "neutral",
    fill: "pastel",
  });
  cursor += s.w + GAP;
  if (i > 0)
    recipe.push({ id: `${STEPS[i - 1].id}>${s.id}`, type: "arrow", x: 0, y: 0, from: STEPS[i - 1].id, to: s.id });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Extending a RoPE context window: interpolation, per-frequency scaling, fine-tune",
  width: W,
  height: ROW_Y + 50 + 24,
  groups: [
    { id: "g-top", title: "Trained on 4K positions, given 16K", tone: "neutral", x: 16, y: TOP.y, w: W - 32, h: TOP.h },
    {
      id: "g-mid",
      title: "NTK-aware scaling and YaRN: each frequency scaled differently",
      tone: "neutral",
      x: 16,
      y: MID.y,
      w: W - 32,
      h: MID.h,
    },
  ],
  shapes: [...top, ...middle, ...recipe],
};

export default spec;
