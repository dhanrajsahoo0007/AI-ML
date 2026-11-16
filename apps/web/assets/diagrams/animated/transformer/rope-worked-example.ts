import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";
import {
  K_CAT,
  Q_SAT,
  ROPE_CASES,
  direction,
  fmt2,
  ropeScore,
  rotate,
  wrapDeg,
} from "@/components/diagrams/presets/llm-positions";

// RoPE worked step by step on one 2-D pair of dimensions, with the query of "sat" and the key of "cat" from the
// "the cat sat" example (presets/llm-positions.ts, which imports them from presets/llm-attention.ts). Pair 0, so
// θ₀ = 10000⁰ = 1 rad per position (RoFormer, Su et al., 2021, arXiv 2104.09864, Eq. 15). Four steps, one dial each:
//
// Step 1, no position: q = (1, 1) at 45°, k = (0, 2) at 90°, 45° apart; q · k = 2.00.
// Step 2, "the cat sat" (sat at m = 2, cat at n = 1): q turned 2 rad (114.6°) to 159.6°, k turned 1 rad (57.3°) to
//         147.3°; 12.3° apart; score 2.76.
// Step 3, the same words 100 places later (m = 102, n = 101): 102 rad ≡ 84.2°, 101 rad ≡ 26.9°; q at 129.2°, k at
//         116.9°; still 12.3° apart; score 2.76. Eq. 16: (R(mθ) q) · (R(nθ) k) = qᵀ R((n − m)θ) k, so only n − m counts.
// Step 4, one word between (m = 3, n = 1): q turned 3 rad (171.9°) to 216.9°; 69.6° apart; score 0.99.
// All angles, coordinates and scores are computed below with Math.cos / Math.sin (working in the preset's header).
//
// Geometry: four dials in a row, centres 214 px apart; vectors drawn at 35 px per unit, so |k| = 2 reaches the
// 70 px circle and |q| = √2 is 49.5 px long. Canvas y grows downwards, so a point at angle a is (cx + r cos a,
// cy − r sin a). Colour: query blue, key teal, the angle between them and the score orange (score tone).

const PX = 35;
const R = 70;
const CY = 140;
const ARC_R = 22;
const COL_W = 202;
const colX = (j: number) => 16 + j * 214;
const colCx = (j: number) => colX(j) + COL_W / 2;

const r1 = (v: number) => Math.round(v * 10) / 10;
const at = (cx: number, deg: number, r: number): [number, number] => [
  r1(cx + r * Math.cos((deg * Math.PI) / 180)),
  r1(CY - r * Math.sin((deg * Math.PI) / 180)),
];
const deg0 = (v: number) => `${Math.round(v)}°`;

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

function dial(j: number): LayoutShape[] {
  const c = ROPE_CASES[j];
  const step = j + 1;
  const cx = colCx(j);
  const x = colX(j);
  const q = rotate(Q_SAT, c.m);
  const k = rotate(K_CAT, c.n);
  const aq = direction(q);
  const ak = direction(k);
  const between = Math.abs(aq - ak);
  const [qx, qy] = [r1(q[0] * PX), r1(-q[1] * PX)];
  const [kx, ky] = [r1(k[0] * PX), r1(-k[1] * PX)];
  const lo = Math.min(aq, ak);
  const arc = Array.from({ length: 7 }, (_, i) => at(cx, lo + (between * i) / 6, ARC_R));
  const turned = (p: number) => (c.rotated ? `turned ${p} rad ≡ ${deg0(wrapDeg(p))}` : "not turned");
  const score = ropeScore(c.m, c.n, c.rotated ? 1 : 0);
  return [
    text(`t${j}`, x, 20, COL_W, `${step} · ${c.title}`, step, "neutral", 20, false),
    {
      id: `c${j}`,
      type: "path",
      x: 0,
      y: 0,
      points: Array.from({ length: 49 }, (_, i) => at(cx, i * 7.5, R)),
      smooth: true,
      weight: 0.25,
      step,
    },
    {
      id: `ax${j}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [cx - R - 8, CY],
        [cx + R + 8, CY],
      ],
      dashed: true,
      weight: 0.1,
      step,
    },
    { id: `arc${j}`, type: "path", x: 0, y: 0, points: arc, smooth: true, tone: ROLE_TONE.score, weight: 0.6, step },
    { id: `q${j}`, type: "arrow", x: cx, y: CY, w: qx, h: qy, tone: ROLE_TONE.query, step, quiet: true },
    { id: `k${j}`, type: "arrow", x: cx, y: CY, w: kx, h: ky, tone: ROLE_TONE.key, step, quiet: true },
    { id: `o${j}`, type: "circle", x: cx, y: CY, w: 7, tone: "neutral", fill: "pastel", step, quiet: true },
    text(`qt${j}`, x, CY + R + 12, COL_W, `q “sat” at ${c.m}\n${turned(c.m)}`, step, ROLE_TONE.query, 34),
    text(`kt${j}`, x, CY + R + 50, COL_W, `k “cat” at ${c.n}\n${turned(c.n)}`, step, ROLE_TONE.key, 34),
    text(`s${j}`, x, CY + R + 90, COL_W, `${deg0(between)} apart · score ${fmt2(score)}`, step, ROLE_TONE.score),
  ];
}

const [s1, s2, s3, s4] = ROPE_CASES.map((c) => fmt2(ropeScore(c.m, c.n, c.rotated ? 1 : 0)));
const [g1, g2, , g4] = ROPE_CASES.map((c) =>
  deg0(Math.abs(direction(rotate(Q_SAT, c.m)) - direction(rotate(K_CAT, c.n))))
);
const TRACE_Y = CY + R + 128;
const trace: LayoutShape[] = [
  text("tr1", 24, TRACE_Y, 832, `No position: “sat” scores “cat” ${s1} wherever the two words stand, in any order.`, 1),
  text(
    "tr2",
    24,
    TRACE_Y + 24,
    832,
    `Positions 2 and 1: q turns 2 rad, k turns 1 rad, so the gap between them closes from ${g1} to ${g2} and the score is ${s2}.`,
    2,
    ROLE_TONE.score
  ),
  text(
    "tr3",
    24,
    TRACE_Y + 48,
    832,
    `Positions 102 and 101: both turn 100 rad further, the angles change, the ${g2} gap does not: score ${s3} again.`,
    3,
    ROLE_TONE.score
  ),
  text(
    "tr4",
    24,
    TRACE_Y + 72,
    832,
    `Positions 3 and 1: q turns one more radian, the gap opens to ${g4} and the score falls to ${s4}. Only n − m counts.`,
    4,
    ROLE_TONE.score
  ),
  text(
    "note",
    24,
    TRACE_Y + 104,
    832,
    "One pair of dimensions, pair 0, which turns 1 rad (57°) per position. Blue: query of “sat”; teal: key of “cat”.",
    1,
    "neutral",
    20
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "RoPE worked example: one pair of dimensions",
  width: 880,
  height: TRACE_Y + 136,
  shapes: [...[0, 1, 2, 3].flatMap(dial), ...trace],
  steps: [
    { title: `No position: the score is the plain dot product, ${s1}` },
    { title: `Rotate by position: sat at 2, cat at 1, score ${s2}` },
    { title: "Move both 100 places: the angles change, the score does not" },
    { title: `Change the gap: one word between, score ${s4}` },
  ],
};

export default spec;
