import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// Accuracy against test-time compute, two reported series side by side, for the test-time scaling section of the
// Reasoning Models & Test-Time Compute page. Reported points only; straight segments join them (nothing measured in
// between). Both use AIME 2024, which has 30 problems, so one problem is 3.3 points.
//
// Left, longer thinking: s1 (Muennighoff et al., 2025, arXiv 2501.19393 v3), Appendix E.1, Table 12 (lower half,
// "Forcing end of thinking when token budget is reached"): a 32B model trained with token instructions, its thinking
// cut off at the budget. Average thinking tokens → AIME24 accuracy:
//   1024 → 3.3%, 2048 → 30.0%, 4031 → 33.3%, 5664 → 33.3%, 6330 → 40.0%.
// (The answer-token row shows 15 answer tokens at the 1024 budget: cut off that early, it barely answers.)
//
// Right, more samples: OpenAI, "Learning to Reason with LLMs" (12 Sep 2024), AIME 2024:
//   o1 with 1 sample per problem 74% (11.1/15); consensus (majority vote) among 64 samples 83% (12.5/15);
//   re-ranking 1000 samples with a learned scoring function 93% (13.9/15). GPT-4o: 12% (1.8/15).
// The x-axis is log10 of the number of samples. Note the selection rule changes between the last two points.

const LEFT: { t: number; acc: number }[] = [
  { t: 1024, acc: 3.3 },
  { t: 2048, acc: 30.0 },
  { t: 4031, acc: 33.3 },
  { t: 5664, acc: 33.3 },
  { t: 6330, acc: 40.0 },
];
const RIGHT: { n: number; acc: number; label: string }[] = [
  { n: 1, acc: 74, label: "1 sample: 74%" },
  { n: 64, acc: 83, label: "Majority of 64: 83%" },
  { n: 1000, acc: 93, label: "Best of 1,000 by a\nlearned scorer: 93%" },
];
const GPT4O = 12;

const TONE_LEFT: LayoutTone = "violet"; // longer thinking (thinking tokens, as on the rest of the page)
const TONE_RIGHT: LayoutTone = "orange"; // more samples (the vote)

// ── Plot geometry: two panels share the y scale 0–100% (3 px per point) ──────────────────────────────────────
const Y_TOP = 96;
const Y_BOT = 396;
const py = (acc: number) => Math.round((Y_BOT - (acc * (Y_BOT - Y_TOP)) / 100) * 10) / 10;
const L0 = 96;
const L1 = 396;
const R0 = 530;
const R1 = 830;
const T_MAX = 7000;
const pxL = (t: number) => Math.round((L0 + (t / T_MAX) * (L1 - L0)) * 10) / 10;
const pxR = (n: number) => Math.round((R0 + (Math.log10(n) / 3) * (R1 - R0)) * 10) / 10;

const text = (id: string, x: number, y: number, w: number, h: number, label: string, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;
const seg = (
  id: string,
  points: [number, number][],
  tone: LayoutTone,
  weight: number,
  dashed = false
): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  tone,
  weight,
  dashed: dashed || undefined,
});
const dot = (id: string, x: number, y: number, tone: LayoutTone): LayoutShape => ({
  id,
  type: "circle",
  x,
  y,
  w: 12,
  tone,
  fill: "pastel",
});

const shapes: LayoutShape[] = [];

// Grids and y labels for both panels.
for (const a of [0, 25, 50, 75, 100]) {
  const w = a === 0 ? 0.3 : 0.06;
  shapes.push(
    seg(
      `gl-${a}`,
      [
        [L0 - 8, py(a)],
        [L1 + 8, py(a)],
      ],
      "neutral",
      w
    ),
    seg(
      `gr-${a}`,
      [
        [R0 - 8, py(a)],
        [R1 + 8, py(a)],
      ],
      "neutral",
      w
    ),
    text(`yl-${a}`, L0 - 56, py(a) - 10, 44, 20, `${a}%`),
    text(`yr-${a}`, R0 - 56, py(a) - 10, 44, 20, `${a}%`)
  );
}

// Panel titles.
shapes.push(
  text(
    "t-left",
    L0 - 60,
    20,
    L1 - L0 + 80,
    40,
    "Longer thinking: one sample, AIME 2024 accuracy\n32B s1 variant, its thinking cut off at a budget",
    TONE_LEFT
  ),
  text(
    "t-right",
    R0 - 60,
    20,
    R1 - R0 + 80,
    40,
    "More samples: OpenAI o1, AIME 2024 accuracy\nas reported in the o1 launch post (2024)",
    TONE_RIGHT
  )
);

// Left x axis: thinking tokens.
for (const t of [0, 2000, 4000, 6000]) {
  shapes.push(
    seg(
      `xl-${t}`,
      [
        [pxL(t), Y_BOT],
        [pxL(t), Y_BOT + 6],
      ],
      "neutral",
      0.3
    ),
    text(`xlt-${t}`, pxL(t) - 30, Y_BOT + 10, 60, 20, t.toLocaleString("en-US"))
  );
}
shapes.push(text("xl-title", L0, Y_BOT + 32, L1 - L0, 20, "Average thinking tokens per problem"));

// Right x axis: samples per problem, log scale.
for (const n of [1, 10, 100, 1000]) {
  shapes.push(
    seg(
      `xr-${n}`,
      [
        [pxR(n), Y_BOT],
        [pxR(n), Y_BOT + 6],
      ],
      "neutral",
      0.3
    ),
    text(`xrt-${n}`, pxR(n) - 30, Y_BOT + 10, 60, 20, n.toLocaleString("en-US"))
  );
}
shapes.push(text("xr-title", R0, Y_BOT + 32, R1 - R0, 20, "Samples per problem (log scale)"));

// Left series.
shapes.push(
  seg(
    "curve-left",
    LEFT.map((p) => [pxL(p.t), py(p.acc)] as [number, number]),
    TONE_LEFT,
    0.6
  )
);
LEFT.forEach((p, i) => {
  // Labels above each point; the two 33.3% points share a height, so their labels sit slightly apart.
  shapes.push(
    dot(`pl-${i}`, pxL(p.t), py(p.acc), TONE_LEFT),
    text(`vl-${i}`, pxL(p.t) - 26, py(p.acc) - (i === 0 ? -10 : 30), 52, 20, `${p.acc.toFixed(1)}%`, TONE_LEFT)
  );
});
shapes.push(
  text(
    "note-left",
    pxL(2500),
    py(15),
    220,
    36,
    "Cut off at 1,024 tokens, the model\nsolves 1 of the 30 problems.",
    TONE_LEFT
  )
);

// Right series and the GPT-4o reference.
shapes.push(
  seg(
    "gpt4o",
    [
      [R0 - 8, py(GPT4O)],
      [R1 + 8, py(GPT4O)],
    ],
    "neutral",
    0.35,
    true
  ),
  text("gpt4o-label", R0 + 120, py(GPT4O) - 26, 180, 20, `GPT-4o, 1 sample: ${GPT4O}%`),
  seg(
    "curve-right",
    RIGHT.map((p) => [pxR(p.n), py(p.acc)] as [number, number]),
    TONE_RIGHT,
    0.6
  )
);
// Label placement: 1 sample below-right, majority of 64 centred below, best of 1,000 above-left (inside the panel).
const LABEL_BOX: [number, number, number][] = [
  [6, 14, 150],
  [-75, 18, 150],
  [-150, -46, 144],
];
RIGHT.forEach((p, i) => {
  const lines = p.label.split("\n").length;
  const [dx, dy, w] = LABEL_BOX[i];
  shapes.push(
    dot(`pr-${i}`, pxR(p.n), py(p.acc), TONE_RIGHT),
    text(`vr-${i}`, pxR(p.n) + dx, py(p.acc) + dy, w, lines * 18, p.label, TONE_RIGHT)
  );
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Accuracy against test-time compute on AIME 2024",
  width: 860,
  height: Y_BOT + 66,
  shapes,
};

export default spec;
