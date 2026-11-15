import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// How the KV cache grows during generation, and why it dominates memory. Top: one layer and one KV head, drawn as a
// row of keys (teal) over a row of values (violet), one column per token, at 4, 5, 6 and 7 tokens. Prefill writes
// the 4 prompt tokens' keys and values at once; each decode step appends one column. Solid cells (full weight) are the
// ones written in that step; faint cells ("soft" fill) were written earlier and are only read again (causal attention: earlier
// tokens' keys and values never change, so they are cached, not recomputed).
//
// Bottom: the page's formula, bytes = 2 × L × H_kv × d_head × seq len × batch × bytes per value, for the page's
// example model with full multi-head attention: L = 80 layers, H_kv = 64 KV heads, d_head = 128, 16-bit values.
// - Per token (seq len = 1, batch = 1): 2 × 80 × 64 × 128 × 2 = 2,621,440 bytes ≈ 2.62 MB (exactly 2.5 MiB).
//   The page says "about 2.6 MB per token".
// - One 4,000-token sequence: 2,621,440 × 4,000 = 10,485,760,000 bytes ≈ 10.5 GB (≈ 9.77 GiB). The page says
//   "around 10 GB".
// MB and GB are 10^6 and 10^9 bytes, as on the page; MiB and GiB (2^20, 2^30) are given alongside.

const LAYERS = 80;
const KV_HEADS = 64;
const D_HEAD = 128;
const BYTES = 2;
const SEQ = 4000;
const PER_TOKEN = 2 * LAYERS * KV_HEADS * D_HEAD * BYTES; // 2,621,440
const PER_SEQ = PER_TOKEN * SEQ; // 10,485,760,000
const MB = (PER_TOKEN / 1e6).toFixed(2); // "2.62"
const MIB = (PER_TOKEN / 2 ** 20).toFixed(1); // "2.5"
const GB = (PER_SEQ / 1e9).toFixed(1); // "10.5"
const GIB = (PER_SEQ / 2 ** 30).toFixed(1); // "9.8"

const PROMPT = 4;
const COUNTS = [4, 5, 6, 7];
const CELL = 26;
const WIDTH = 860;
const GAP = 64;
const LEFT = (WIDTH - COUNTS.reduce((a, n) => a + n * CELL, 0) - GAP * (COUNTS.length - 1)) / 2; // 48
const snapX = (s: number) => LEFT + COUNTS.slice(0, s).reduce((acc, n) => acc + n * CELL + GAP, 0);
const Y = { group: 40, head: 64, k: 110, under: 168, legend: 202, scale: 262, formula: 292, seq: 372, note: 440 };

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 18) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

function snapshot(s: number): LayoutShape[] {
  const n = COUNTS[s];
  const x = snapX(s);
  const w = n * CELL;
  const fresh = (c: number) => (s === 0 ? c < PROMPT : c === n - 1); // written in this step
  const out: LayoutShape[] = [];
  for (let c = 0; c < n; c++)
    (["k", "v"] as const).forEach((part, r) =>
      out.push({
        id: `s${s}-${part}${c}`,
        type: "cell",
        x: x + c * CELL,
        y: Y.k + r * CELL,
        w: CELL,
        h: CELL,
        label: `${part}${c + 1}`,
        tone: part === "k" ? ROLE_TONE.key : ROLE_TONE.value,
        fill: fresh(c) ? undefined : "soft",
        weight: fresh(c) ? 1 : undefined,
        quiet: true,
      })
    );
  out.push(
    text(
      `s${s}-head`,
      x - 20,
      Y.head,
      w + 40,
      s === 0 ? `Prefill\n${n} prompt tokens` : `Decode step ${s}\n${n} tokens`,
      "neutral",
      34
    ),
    text(`s${s}-under`, x - 30, Y.under, w + 60, s === 0 ? "written at once" : `+1 column (token ${n})`)
  );
  if (s > 0) {
    const from = snapX(s - 1) + COUNTS[s - 1] * CELL + 10;
    out.push({ id: `s${s}-arrow`, type: "arrow", x: from, y: Y.k + CELL, w: x - 10 - from, h: 0 });
  }
  return out;
}

/** A row of formula boxes with "×" (or "=") signs between them, centred on the canvas. */
function formula(
  id: string,
  y: number,
  terms: { label: string; sub: string; w?: number; tone?: LayoutTone; fill?: "pastel" }[],
  signs: string[]
): LayoutShape[] {
  const SIGN = 32;
  const widths = terms.map((t) => t.w ?? 104);
  const total = widths.reduce((a, b) => a + b, 0) + SIGN * signs.length;
  let x = (WIDTH - total) / 2;
  const out: LayoutShape[] = [];
  terms.forEach((t, i) => {
    out.push({
      id: `${id}-${i}`,
      type: "box",
      x,
      y,
      w: widths[i],
      h: 44,
      label: t.label,
      sub: t.sub,
      tone: t.tone ?? "neutral",
      fill: t.fill,
    });
    x += widths[i];
    if (i < signs.length) {
      out.push(text(`${id}-sign${i}`, x, y, SIGN, signs[i], "neutral", 44));
      x += SIGN;
    }
  });
  return out;
}

const lastRight = snapX(3) + COUNTS[3] * CELL;

const spec: LayoutSpec = {
  kind: "layout",
  title: "The KV cache grows by one entry per token",
  width: WIDTH,
  height: Y.note + 50,
  groups: [
    {
      id: "layer",
      title: "One layer, one KV head",
      tone: ROLE_TONE.block,
      x: LEFT - 30,
      y: Y.group,
      w: lastRight - LEFT + 60,
      h: Y.legend + 34 - Y.group,
    },
  ],
  shapes: [
    ...COUNTS.flatMap((_, s) => snapshot(s)),
    text(
      "legend",
      LEFT,
      Y.legend,
      lastRight - LEFT,
      "Solid: written in this step. Faint: written earlier, read again at every step."
    ),
    text(
      "scale",
      16,
      Y.scale,
      WIDTH - 32,
      `The model keeps that for every layer and every KV head: × ${LAYERS} layers × ${KV_HEADS} KV heads (MHA).`
    ),
    ...formula(
      "per-token",
      Y.formula,
      [
        { label: "2", sub: "K and V" },
        { label: String(LAYERS), sub: "layers" },
        { label: String(KV_HEADS), sub: "KV heads (MHA)", tone: ROLE_TONE.key },
        { label: String(D_HEAD), sub: "d_head" },
        { label: `${BYTES} bytes`, sub: "16-bit value" },
        { label: `≈ ${MB} MB`, sub: `per token (${MIB} MiB)`, w: 136, tone: ROLE_TONE.key, fill: "pastel" },
      ],
      ["×", "×", "×", "×", "="]
    ),
    ...formula(
      "per-seq",
      Y.seq,
      [
        { label: `${MB} MB`, sub: "per token", tone: ROLE_TONE.key },
        { label: SEQ.toLocaleString("en-US"), sub: "tokens" },
        { label: `≈ ${GB} GB`, sub: `one sequence (${GIB} GiB)`, w: 160, tone: ROLE_TONE.key, fill: "pastel" },
      ],
      ["×", "="]
    ),
    text(
      "note",
      16,
      Y.note,
      WIDTH - 32,
      "The weights stay the same size, but the cache grows linearly with every token and every sequence in the batch:\n" +
        `twice the context or twice the batch doubles it. MB and GB here are 10⁶ and 10⁹ bytes.`,
      "neutral",
      36
    ),
  ],
};

export default spec;
