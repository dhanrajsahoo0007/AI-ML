import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { QUANT_OUTLIER, QUANT_WEIGHTS, absmaxQuantise, mean } from "@/components/diagrams/presets/production-quant";

// "Rounding to 4 bits" on the Quantization & Optimization page: the one idea behind every quantiser, drawn on a
// number line. Seven 16-bit values are snapped to the nearest of 15 evenly spaced levels (signed 4-bit codes −7..7),
// and the rounding error of each is computed. Scheme: symmetric absmax. scale = max|w| ÷ 7; code = round(w ÷ scale);
// back = code × scale; error = |w − back|. (Numbers come from presets/production-quant.ts.)
//
// Steps:
//   1. Six weights alone. max 0.91, scale 0.91 ÷ 7 = 0.13. Codes −6, −4, −1, 1, 3, 7; errors 0.06, 0.05, 0.01, 0.04,
//      0.01, 0.00; mean error 0.028.
//   2. The same six plus one outlier, 2.80, in the same group. scale = 2.80 ÷ 7 = 0.40. Levels are now 0.40 apart, so
//      −0.12 and 0.09 both round to 0 (code 0), and the six now average 0.075 error (2.7× worse). The outlier itself
//      is exact. This is why outliers hurt, and why per-group scales (GPTQ, AWQ) and outlier handling (LLM.int8())
//      exist.
//
// Grid: line 1 at y 150, line 2 at y 400; both x 62–498 (15 levels, 31 px apart, so each line is stretched to its own
// scale); tables x 560–860. Colours: 16-bit weights blue (data), snapped values green (the model), error cells and
// the mean lime (a metric), the two values that collapse to zero red (the only thing that breaks).

const AX = { cx: 280, half: 218 } as const; // axis centre x; 7 levels span 218 px
const LEVEL_PX = AX.half / 7; // 31.14
const Y1 = 134;
const Y2 = 372;

const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  align: "left" | "centre" = "left"
): LayoutShape => {
  const w = Math.ceil(label.length * 6) + 4;
  return {
    id,
    type: "text",
    x: align === "left" ? x : x - w / 2,
    y,
    w,
    h: 18,
    label,
    tone,
    step,
    quiet: true,
  };
};
const f = (v: number, d = 2) => v.toFixed(d).replace("-", "−");

function section(
  p: string,
  step: number,
  y0: number,
  axisY: number,
  weights: number[],
  title: string,
  collapse: boolean
): LayoutShape[] {
  const q = absmaxQuantise(weights);
  const px = (v: number) => AX.cx + (v / (q.scale * 7)) * AX.half;
  const letters = "abcdefg";
  const out: LayoutShape[] = [
    text(`${p}-title`, 40, y0, title, step, PROD_TONE.infra),
    {
      id: `${p}-axis`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [AX.cx - AX.half - 14, axisY],
        [AX.cx + AX.half + 14, axisY],
      ],
      step,
      quiet: true,
    },
  ];
  for (let k = -7; k <= 7; k++) {
    const x = Math.round((AX.cx + k * LEVEL_PX) * 10) / 10;
    out.push({
      id: `${p}-tick-${k}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x, axisY - 6],
        [x, axisY + 6],
      ],
      step,
      quiet: true,
    });
    if (k % 1 === 0)
      out.push({
        id: `${p}-code-${k}`,
        type: "text",
        x: x - 13,
        y: axisY + 10,
        w: 26,
        h: 16,
        label: f(k, 0),
        tone: PROD_TONE.infra,
        step,
        quiet: true,
      });
  }
  out.push(text(`${p}-codes-name`, AX.cx - 60, axisY + 30, "4-bit code (level = code × scale)", step));

  const seen = new Set<number>();
  q.items.forEach((it, i) => {
    const xw = Math.round(px(it.w) * 10) / 10;
    const xs = Math.round((AX.cx + it.code * LEVEL_PX) * 10) / 10;
    const dupe = collapse && it.code === 0;
    out.push(
      {
        id: `${p}-w-${i}`,
        type: "circle",
        x: xw,
        y: axisY - 34,
        w: 12,
        tone: PROD_TONE.data,
        fill: "pastel",
        step,
        quiet: true,
      },
      text(`${p}-wl-${i}`, xw, axisY - 60, letters[i], step, PROD_TONE.data, "centre"),
      {
        id: `${p}-arrow-${i}`,
        type: "arrow",
        x: xw,
        y: axisY - 27,
        w: Math.round((xs - xw) * 10) / 10,
        h: 20,
        step,
        quiet: true,
      }
    );
    if (!seen.has(it.code)) {
      seen.add(it.code);
      out.push({
        id: `${p}-s-${i}`,
        type: "circle",
        x: xs,
        y: axisY,
        w: 12,
        tone: dupe ? PROD_TONE.failure : PROD_TONE.model,
        fill: "pastel",
        highlight: dupe || undefined,
        step,
      });
    }
  });

  // Table: letter, 16-bit value, code, back, error.
  const tx = 560;
  const rowY = (i: number) => y0 + 22 + i * 21;
  out.push(
    text(`${p}-h0`, tx, rowY(0), "weight", step),
    text(`${p}-h1`, tx + 62, rowY(0), "code", step),
    text(`${p}-h2`, tx + 112, rowY(0), "back", step),
    text(`${p}-h3`, tx + 176, rowY(0), "error", step)
  );
  q.items.forEach((it, i) => {
    const hot = collapse && it.code === 0;
    out.push(
      text(`${p}-r${i}-w`, tx, rowY(i + 1), `${letters[i]}  ${f(it.w)}`, step, PROD_TONE.data),
      text(`${p}-r${i}-c`, tx + 62, rowY(i + 1), f(it.code, 0), step, hot ? PROD_TONE.failure : PROD_TONE.infra),
      text(`${p}-r${i}-b`, tx + 112, rowY(i + 1), f(it.value), step, hot ? PROD_TONE.failure : PROD_TONE.infra),
      {
        id: `${p}-r${i}-e`,
        type: "cell",
        x: tx + 168,
        y: rowY(i + 1),
        w: 54,
        h: 18,
        label: f(it.error),
        tone: PROD_TONE.check,
        weight: Math.min(1, it.error / 0.13),
        step,
        quiet: true,
      }
    );
  });
  return out;
}

const small = [...QUANT_WEIGHTS];
const s1 = absmaxQuantise(small);
const withOutlier = [...small, QUANT_OUTLIER];
const s2 = absmaxQuantise(withOutlier);
const mean1 = mean(s1.items.map((i) => i.error));
const mean2 = mean(s2.items.slice(0, 6).map((i) => i.error));

const shapes: LayoutShape[] = [
  ...section("a", 1, 14, Y1, small, `Six weights, scale ${f(s1.scale)} (0.91 ÷ 7)`, false),
  text("a-mean", 560, 14 + 22 + 7 * 21 - 2, `mean error ${f(mean1, 3)}`, 1, PROD_TONE.check),
  ...section("b", 2, 246, Y2, withOutlier, `Add one outlier, 2.80: scale ${f(s2.scale)} (2.80 ÷ 7)`, true),
  text("b-mean", 560, 246 + 22 + 8 * 21 - 2, `mean error on a–f ${f(mean2, 3)}`, 2, PROD_TONE.check),
  text("b-note", 62, Y2 + 52, "c and d both round to 0: the small weights lose their identity", 2, PROD_TONE.failure),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Rounding sixteen-bit weights to 4-bit levels, with the error computed",
  width: 880,
  height: 460,
  steps: [{ title: "Snap each weight to the nearest of 15 levels" }, { title: "One outlier stretches the scale" }],
  shapes,
};

export default spec;
