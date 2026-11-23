import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";
import { BUDGET, OBJECTIVES } from "@/components/diagrams/presets/llm-families";

// The three pre-training objectives on the same text, the page's running example "the kettle boiled / she poured the
// tea" (from `bert-pretrain-finetune`, punctuation left out), with "boiled" and "tea" as the hidden words in both
// denoising objectives. One band per family; in each, the bottom row is what the model reads and the top row is what
// it is trained to output. Static, no steps. Tokens and counts come from presets/llm-families.ts (working there):
//   Encoder-only, masked LM     [CLS] the kettle [MASK] [SEP] she poured the [MASK] [SEP] → targets at 2 of 10
//                               positions (boiled, tea); per 1,000 tokens 1,000 × 0.15 = 150 targets
//   Decoder-only, next token    <s> the kettle boiled she poured the → the kettle boiled she poured the tea:
//                               a target at all 7 positions; per 1,000 tokens 1,000 targets
//   Encoder-decoder, span       encoder reads the kettle <X> she poured the <Y>; decoder writes <X> boiled <Y> tea
//   corruption                  <Z> (5 tokens, 2 of them words); per 1,000 tokens 150 dropped in 150 / 3 = 50 spans:
//                               input 1,000 − 150 + 50 = 900, target 150 + 50 + 1 = 201
// The example hides 2 of 7 words (29 %) so the effect shows on a short line; the real rate is 15 % (labelled in the
// footnote).
//
// Facts checked:
// - Devlin et al. 2018 (arXiv 1810.04805) §3.1: only the masked positions are predicted, "rather than reconstructing
//   the entire input"; [CLS] first, [SEP] after each sentence (§3).
// - Radford et al. 2018 (GPT) §3.1: the language-modelling objective maximises Σ log P(u_i | u_{i−k}, …, u_{i−1}),
//   one term per position; the model is a decoder-only Transformer with masked self-attention (§4.1).
// - Raffel et al. 2019 (arXiv 1910.10683) §3.1.4 and Figure 2: dropped spans become sentinels unique in the example
//   (drawn <X>, <Y>), the target is the spans after their sentinels plus a final sentinel (<Z>); §3.3.4: 15 % and a
//   mean span length of 3 ("500 × 0.15 = 75 … 75/25 = 3").
//
// Geometry: three groups 124 tall at y 36, 196, 356 (x 16–864; 36 px between them for the title tabs). Row labels x 24–100; token cells 54 × 28 at
// x 108 + 58·i (10 cells end at x 684); output row 32 px under the group top, input row 50 px under it (22 px gap
// for the arrows); note column x 700–856 (25 characters at 6.2 px). The cross-attention arrow runs up from <Y> and
// left into <Z>.

const LABEL_X = 24;
const LABEL_W = 76;
const TOK_X = 108;
const PITCH = 58;
const TOK_W = 54;
const TOK_H = 28;
const NOTE_X = 700;
const NOTE_W = 156;
const BAND_Y = [36, 196, 356];
const BAND_H = 124;
const OUT_DY = 32;
const IN_DY = OUT_DY + TOK_H + 22;

const tokX = (i: number) => TOK_X + i * PITCH;
const fmt = (n: number) => n.toLocaleString("en-US");
const isSpecial = (t: string) => /^(\[.*\]|<.*>)$/.test(t);
const isNoise = (t: string) => t === "[MASK]" || /^<[XYZ]>$/.test(t);

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 20) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

/** A row of token cells; `target` rows are green, noise tokens ([MASK], sentinels) pink. */
function row(id: string, y: number, tokens: (string | null)[], target: boolean): LayoutShape[] {
  return tokens.flatMap((t, i): LayoutShape[] => {
    if (t === null) return [];
    const noise = isNoise(t);
    const tone: LayoutTone = noise ? ROLE_TONE.mask : target ? ROLE_TONE.softmax : "neutral";
    const fill = noise || target ? (target && noise ? "soft" : "pastel") : isSpecial(t) ? "pastel" : undefined;
    return [{ id: `${id}-${i}`, type: "cell", x: tokX(i), y, w: TOK_W, h: TOK_H, label: t, tone, fill }];
  });
}

/** Up-arrows from input cell i to output cell i, for the positions that have a target. */
const ups = (band: string, targets: (string | null)[]): LayoutShape[] =>
  targets.flatMap((t, i): LayoutShape[] =>
    t === null
      ? []
      : [{ id: `${band}-up-${i}`, type: "arrow", x: 0, y: 0, from: `${band}-in-${i}`, to: `${band}-out-${i}` }]
  );

interface Band {
  id: string;
  title: string;
  outLabel: string;
  inLabel: string;
  out: (string | null)[];
  inp: string[];
  aligned: boolean;
  note: string;
}

const { mlmInput, mlmTargets, causalInput, causalTargets, t5 } = OBJECTIVES;
const count = (xs: (string | null)[]) => xs.filter((x) => x !== null).length;

const BANDS: Band[] = [
  {
    id: "mlm",
    title: "Encoder-only (BERT): masked language model",
    outLabel: "predict",
    inLabel: "reads",
    out: mlmTargets,
    inp: mlmInput,
    aligned: true,
    note: `${count(mlmTargets)} targets, ${mlmInput.length} positions\nper 1,000 tokens:\n${fmt(BUDGET.mlmChosen)} targets`,
  },
  {
    id: "clm",
    title: "Decoder-only (GPT): next-token prediction",
    outLabel: "predict",
    inLabel: "reads",
    out: causalTargets,
    inp: causalInput,
    aligned: true,
    note: `${count(causalTargets)} targets, ${causalInput.length} positions\nper 1,000 tokens:\n${fmt(BUDGET.causalTargets)} targets`,
  },
  {
    id: "t5",
    title: "Encoder-decoder (T5): span corruption",
    outLabel: "decoder\nwrites",
    inLabel: "encoder\nreads",
    out: t5.target,
    inp: t5.input,
    aligned: false,
    note: `${t5.target.length} out: 2 words + 3 sentinels\nper 1,000 tokens:\n${fmt(BUDGET.t5Input)} in, ${fmt(BUDGET.t5Target)} out`,
  },
];

const shapes: LayoutShape[] = BANDS.flatMap((b, k) => {
  const y = BAND_Y[k];
  return [
    text(`${b.id}-out-label`, LABEL_X, y + OUT_DY, LABEL_W, b.outLabel, "neutral", TOK_H),
    text(`${b.id}-in-label`, LABEL_X, y + IN_DY, LABEL_W, b.inLabel, "neutral", TOK_H),
    ...row(`${b.id}-out`, y + OUT_DY, b.out, true),
    ...row(`${b.id}-in`, y + IN_DY, b.inp, false),
    ...(b.aligned ? ups(b.id, b.out) : []),
    text(`${b.id}-note`, NOTE_X, y + OUT_DY, NOTE_W, b.note, "neutral", IN_DY + TOK_H - OUT_DY),
  ];
});

// The encoder-decoder band has no per-position alignment: the decoder reads the encoder through cross-attention.
shapes.push({
  id: "t5-xattn",
  type: "arrow",
  x: 0,
  y: 0,
  from: `t5-in-${t5.input.length - 1}`,
  to: `t5-out-${t5.target.length - 1}`,
  via: [[tokX(t5.input.length - 1) + TOK_W / 2, BAND_Y[2] + OUT_DY + TOK_H / 2]],
  dashed: true,
  label: "cross-attention",
});

shapes.push(
  text(
    "foot",
    16,
    496,
    848,
    "Top rows: what the loss is computed on (T5's target includes its sentinels). Pink: [MASK] and sentinels. Punctuation\nleft out; the example hides 2 of 7 words so the effect shows, where BERT and T5 use 15 % (T5: mean span 3, §3.3.4).",
    "neutral",
    36
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three pre-training objectives on one sentence",
  width: 880,
  height: 544,
  groups: BANDS.map((b, k) => ({
    id: `g-${b.id}`,
    title: b.title,
    tone: ROLE_TONE.block,
    x: 16,
    y: BAND_Y[k],
    w: 848,
    h: BAND_H,
  })),
  shapes,
};

export default spec;
