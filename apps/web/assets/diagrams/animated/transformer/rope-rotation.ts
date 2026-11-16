import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// How RoPE turns absolute positions into relative ones, for one 2-D pair of dimensions. A query at position m is
// rotated by m·θ and a key at position n by n·θ (Su et al., 2021, RoFormer, arXiv 2104.09864, §3.2:
// f(x, m) = R(mθ) W x). Both start along the same axis here, so after rotation the angle between them is (n − m)·θ.
// Rotation keeps lengths, so q · k = |q| |k| cos(angle) depends only on n − m (RoFormer §3.2.2:
// qᵀ R(mθ)ᵀ R(nθ) k = qᵀ R((n − m)θ) k).
//
// Left: m = 2, n = 5. Right: m = 6, n = 9. Same gap n − m = 3, different absolute angles.
// Working, θ = 20°:
//   left:  q at 2θ = 40°,  k at 5θ = 100°, angle between = 60° = 3θ
//   right: q at 6θ = 120°, k at 9θ = 180°, angle between = 60° = 3θ
// Every endpoint below is computed with Math.cos / Math.sin; y grows downwards on the canvas, so y = cy − R sin(a).
//
// Simplification (stated on the figure): real models split q and k into d/2 pairs and rotate pair i by its own
// frequency θᵢ = 10000^(−2i/d) (RoFormer §3.2.2, the sinusoidal frequencies of Vaswani et al., 2017, §3.5).

const THETA = 20; // degrees
const R = 110; // circle radius
const CY = 210;
const ARC_R = 46; // radius of the angle marker
const PILL_R = 72; // radius of the "3θ" pill

const rad = (deg: number) => (deg * Math.PI) / 180;
const r1 = (v: number) => Math.round(v * 10) / 10;
const at = (cx: number, deg: number, r: number): [number, number] => [
  r1(cx + r * Math.cos(rad(deg))),
  r1(CY - r * Math.sin(rad(deg))),
];

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  h = 20,
  tone: LayoutTone = "neutral"
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone });

/** A pill with no visible line: a 0.1 px arrow, so the label sits exactly at (x, y). */
const pill = (id: string, x: number, y: number, label: string, tone: LayoutTone): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y,
  w: 0.1,
  h: 0,
  head: false,
  label,
  tone,
});

interface Panel {
  p: string;
  cx: number;
  m: number;
  n: number;
  /** Top-left of the query and key labels (each 120 × 34). */
  qLabel: [number, number];
  kLabel: [number, number];
}

function panel({ p, cx, m, n, qLabel, kLabel }: Panel): LayoutShape[] {
  const aq = m * THETA;
  const ak = n * THETA;
  const [qx, qy] = at(cx, aq, R);
  const [kx, ky] = at(cx, ak, R);
  const arc = Array.from({ length: 9 }, (_, i) => at(cx, aq + ((ak - aq) * i) / 8, ARC_R));
  const [px, py] = at(cx, (aq + ak) / 2, PILL_R);
  return [
    // The circle (a path, so it sits under the arrows) and its axes; the dashed horizontal axis is where both vectors
    // start (position 0).
    {
      id: `${p}-circle`,
      type: "path",
      x: 0,
      y: 0,
      points: Array.from({ length: 49 }, (_, i) => at(cx, i * 7.5, R)),
      smooth: true,
      weight: 0.25,
    },
    {
      id: `${p}-axis-x`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [cx - R - 12, CY],
        [cx + R + 12, CY],
      ],
      dashed: true,
      weight: 0.1,
    },
    {
      id: `${p}-axis-y`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [cx, CY + R + 12],
        [cx, CY - R - 12],
      ],
      dashed: true,
      weight: 0.1,
    },
    text(`${p}-zero`, cx + R + 14, CY - 10, 30, "0°"),
    // The angle between q and k.
    { id: `${p}-arc`, type: "path", x: 0, y: 0, points: arc, smooth: true, tone: ROLE_TONE.score, weight: 0.6 },
    pill(`${p}-gap`, px, py, `${n - m}θ`, ROLE_TONE.score),
    // Query (blue) and key (teal), drawn from the centre.
    { id: `${p}-q`, type: "arrow", x: cx, y: CY, w: r1(qx - cx), h: r1(qy - CY), tone: ROLE_TONE.query },
    { id: `${p}-k`, type: "arrow", x: cx, y: CY, w: r1(kx - cx), h: r1(ky - CY), tone: ROLE_TONE.key },
    { id: `${p}-origin`, type: "circle", x: cx, y: CY, w: 7, tone: "neutral", fill: "pastel" },
    text(`${p}-q-name`, ...qLabel, 120, `q at m = ${m}\nturned ${m}θ = ${aq}°`, 34, ROLE_TONE.query),
    text(`${p}-k-name`, ...kLabel, 120, `k at n = ${n}\nturned ${n}θ = ${ak}°`, 34, ROLE_TONE.key),
    text(`${p}-diff`, cx - 100, CY + R + 14, 200, `n − m = ${n} − ${m} = ${n - m}`),
  ];
}

const LEFT = { x: 24, w: 410 };
const RIGHT = { x: 446, w: 410 };
const LCX = LEFT.x + 180;
const RCX = RIGHT.x + 240;

const shapes: LayoutShape[] = [
  // Left: q at 40° (tip upper right), k at 100° (tip near the top).
  ...panel({ p: "l", cx: LCX, m: 2, n: 5, qLabel: [LCX + 88, CY - 116], kLabel: [LCX - 79, CY - 152] }),
  // Right: q at 120° (tip upper left), k at 180° (tip on the left of the axis).
  ...panel({ p: "r", cx: RCX, m: 6, n: 9, qLabel: [RCX - 136, CY - 140], kLabel: [RCX - 234, CY - 42] }),
  text("angle", 40, 390, 800, `angle = (n − m)·θ = 3θ in both (${3 * THETA}° with θ = ${THETA}°)`, 20, ROLE_TONE.score),
  text(
    "dot",
    40,
    412,
    800,
    "The dot product depends only on the angle between q and k, so the score depends only on n − m."
  ),
  text(
    "simplified",
    40,
    440,
    800,
    "Simplified: one 2-D pair of dimensions, θ = 20°, and q and k start on the same axis. Real models rotate\nevery pair of dimensions at its own frequency, θᵢ = 10000^(−2i/d): fast pairs for nearby order, slow for distance.",
    34
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "RoPE: rotation turns absolute positions into a relative angle",
  width: 880,
  height: 488,
  groups: [
    { id: "g-left", title: "m = 2, n = 5", tone: "neutral", x: LEFT.x, y: 40, w: LEFT.w, h: 330 },
    { id: "g-right", title: "m = 6, n = 9", tone: "neutral", x: RIGHT.x, y: 40, w: RIGHT.w, h: 330 },
  ],
  shapes,
};

export default spec;
