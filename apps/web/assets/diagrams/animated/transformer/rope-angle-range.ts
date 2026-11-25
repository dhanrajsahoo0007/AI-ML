import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROPE, theta, wavelength } from "@/components/diagrams/presets/llm-positions";

// Why a RoPE model fails past its trained length: the angles each pair of dimensions reached in training, against the
// angles it reaches at four times that length. A 128-wide head (64 pairs), base 10,000, trained on 4,096 positions
// and asked for 16,384 (all from presets/llm-positions.ts, whose header has the working).
//
// Pair i turns θᵢ = 10000^(−2i/128) rad per position (RoFormer, Su et al., 2021, arXiv 2104.09864, Eq. 15); its
// wavelength 2π/θᵢ is the number of positions per full turn (YaRN, Peng et al., 2023, arXiv 2309.00071, Eq. 8).
//   pair  0: θ = 1        λ = 6.3     by 4,096: 652 turns          → every angle seen
//   pair 32: θ = 0.01     λ = 628     by 4,096: 6.5 turns          → every angle seen
//   pair 48: θ = 0.001    λ = 6,283   by 4,096: 235° (0.65 turn)   → 235°–360° new by 16,384 (2.6 turns)
//   pair 63: θ = 1.15e−4  λ = 54,410  by 4,096: 27°                → 27°–108° new by 16,384
// Pairs whose wavelength is longer than the trained length (pair 46 on, λ = 4,712) never turn a full circle in
// training; YaRN §3.2 calls them the dimensions that do "not perform a full rotation" and interpolates them fully.
// Position interpolation (Chen et al., 2023, arXiv 2306.15595) divides every position by 16,384 / 4,096 = 4, so
// position 16,384 gets the angles of 4,096 in every pair (each dial's green arc), at the cost of neighbours sitting
// 1/4 rad apart in pair 0 instead of 1 rad.
//
// Geometry: four dials in a row, centres 214 px apart, radius 58 px; angles counter-clockwise from the dashed axis
// (position 0); canvas y grows downwards, so a point at angle a is (cx + r cos a, cy − r sin a). The green arc
// (weight tone: seen in training) runs from 0° to the angle at 4,096 (a full circle once a pair has turned once);
// the red arc (blocked tone: only where something breaks) runs on from there to the angle at 16,384, up to 360°.

const PAIRS = [0, 32, 48, 63];
const R = 58;
const CY = 134;
const COL_W = 202;
const colX = (j: number) => 16 + j * 214;
const colCx = (j: number) => colX(j) + COL_W / 2;

const r1 = (v: number) => Math.round(v * 10) / 10;
const at = (cx: number, deg: number, r: number): [number, number] => [
  r1(cx + r * Math.cos((deg * Math.PI) / 180)),
  r1(CY - r * Math.sin((deg * Math.PI) / 180)),
];
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const group = (v: number) => Math.round(v).toLocaleString("en-US");
const sig = (v: number) => (v >= 100 ? group(v) : v.toFixed(1));

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone = "neutral",
  h = 20
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone });

const arc = (id: string, cx: number, from: number, to: number, tone: LayoutTone): LayoutShape => {
  const n = Math.max(2, Math.ceil((to - from) / 7.5) + 1);
  return {
    id,
    type: "path",
    x: 0,
    y: 0,
    points: Array.from({ length: n }, (_, i) => at(cx, from + ((to - from) * i) / (n - 1), R)),
    smooth: true,
    tone,
    weight: 1,
  };
};

function dial(i: number, j: number): LayoutShape[] {
  const cx = colCx(j);
  const x = colX(j);
  const t = theta(i);
  const seen = toDeg(t * ROPE.trained);
  const asked = toDeg(t * ROPE.target);
  const thetaLabel = t >= 0.01 ? String(t) : t >= 0.001 ? t.toFixed(3) : t.toExponential(2).replace("e-", "e−");
  const turnsSeen = seen / 360;
  const full = turnsSeen >= 1;
  const shapes: LayoutShape[] = [
    text(`t${j}`, x, 20, COL_W, `pair ${i}: ${thetaLabel} rad per position`),
    text(`l${j}`, x, 40, COL_W, `one turn every ${sig(wavelength(i))} positions`),
    {
      id: `c${j}`,
      type: "path",
      x: 0,
      y: 0,
      points: Array.from({ length: 49 }, (_, k) => at(cx, k * 7.5, R)),
      smooth: true,
      weight: 0.25,
    },
    {
      id: `ax${j}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [cx, CY],
        [cx + R + 10, CY],
      ],
      dashed: true,
      weight: 0.1,
    },
    arc(`g${j}`, cx, 0, full ? 360 : seen, "green"),
    { id: `o${j}`, type: "circle", x: cx, y: CY, w: 7, tone: "neutral", fill: "pastel" },
  ];
  if (full) {
    const turns = turnsSeen >= 100 ? group(turnsSeen) : turnsSeen.toFixed(1);
    shapes.push(
      text(`s${j}`, x, CY + R + 14, COL_W, `by 4,096: ${turns} turns`, "green"),
      text(`v${j}`, x, CY + R + 36, COL_W, "every angle seen\nin training", "green", 34)
    );
  } else {
    const end = Math.min(asked, 360);
    shapes.push(
      arc(`r${j}`, cx, seen, end, "red"),
      text(`s${j}`, x, CY + R + 14, COL_W, `by 4,096: ${Math.round(seen)}°`, "green"),
      text(
        `v${j}`,
        x,
        CY + R + 36,
        COL_W,
        `by 16,384: ${asked > 360 ? `${(asked / 360).toFixed(1)} turns` : `${Math.round(asked)}°`};\n${Math.round(seen)}° to ${Math.round(end)}° never seen`,
        "red",
        34
      )
    );
  }
  return shapes;
}

const firstSlow = Array.from({ length: ROPE.dHead / 2 }, (_, i) => i).find((i) => wavelength(i) > ROPE.trained) ?? 0;
const s = ROPE.target / ROPE.trained;
const NOTE_Y = CY + R + 92;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Why RoPE fails past its trained length",
  width: 880,
  height: NOTE_Y + 96,
  shapes: [
    ...PAIRS.flatMap(dial),
    text(
      "n1",
      24,
      NOTE_Y,
      832,
      `Green: angles reached by position 4,096 in training. Red: new angles at 16,384. Pairs ${firstSlow}–${ROPE.dHead / 2 - 1} never turn a full circle by 4,096.`,
      "neutral"
    ),
    text(
      "n2",
      24,
      NOTE_Y + 28,
      832,
      `Position interpolation divides every position by ${s}: 16,384 gets the angles of 4,096 and stays on the green arcs,\nbut in pair 0 neighbours sit 1/${s} rad (${Math.round(toDeg(1 / s))}°) apart instead of 1 rad (${Math.round(toDeg(1))}°).`,
      "neutral",
      34
    ),
    text(
      "n3",
      24,
      NOTE_Y + 70,
      832,
      "A 128-wide head (64 pairs), RoPE base 10,000, trained on 4,096 positions.",
      "neutral"
    ),
  ],
};

export default spec;
