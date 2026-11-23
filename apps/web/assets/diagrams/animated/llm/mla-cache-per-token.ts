import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// What each attention design caches per token, per layer, drawn to scale, for the Multi-head Latent Attention page
// ("Memory footprint math: MHA vs. GQA vs. MLA"). Every design is applied to the same attention shape: DeepSeek-V2's
// 128 query heads of 128 dims. Only the MLA row is DeepSeek-V2's real design; the other rows apply each formula of
// the paper's Table 1 to the same heads.
//
// Facts checked against DeepSeek-V2 (arXiv 2405.04434):
// - §3.1.2: 60 layers, hidden size 5120, n_h = 128 heads, d_h = 128, KV compression d_c = 512, query compression
//   d'_c = 1536, decoupled RoPE per-head dim d_h^R = 64.
// - Table 1 (KV cache per token, in elements): MHA 2·n_h·d_h·l; GQA 2·n_g·d_h·l; MQA 2·d_h·l; MLA (d_c + d_h^R)·l
//   ≈ (9/2)·d_h·l, "equal to GQA with only 2.25 groups".
// - §2.1.3: the decoupled key k_R is cached too, so the total is (d_c + d_h^R)·l.
//
// Working, per token, per layer (elements):
//   MHA   2 × 128 × 128 = 32,768   (keys 16,384 + values 16,384)
//   GQA-8 2 × 8 × 128   =  2,048   (keys 1,024 + values 1,024); 8 KV heads, as in the paper's Table 8 ablation
//   MLA   512 + 64      =    576   (latent c_KV 512 + RoPE key k_R 64) → 32,768 / 576 = 56.9× smaller than MHA,
//                                  2,048 / 576 = 3.56× smaller than GQA-8; 576 / 256 = 2.25 "groups"
//   MQA   2 × 128       =    256   (keys 128 + values 128)
// Whole model, 60 layers, 16-bit (2 bytes) per element, per token:
//   MHA 32,768 × 60 × 2 = 3,932,160 B ≈ 3.93 MB; GQA-8 245,760 B ≈ 246 KB; MLA 69,120 B ≈ 69.1 KB;
//   MQA 30,720 B ≈ 30.7 KB. (MB = 10^6 bytes, KB = 10^3 bytes.)
//
// Scales: the top panel draws 32,768 elements as 460 px (0.01404 px per element), so GQA-8 is 28.75 px, MLA 8.09 px
// and MQA 3.59 px. The lower panel is the same rows 16× larger (0.2246 px per element): GQA-8 460 px, MLA 129.4 px
// (latent 115.0 + RoPE key 14.4) and MQA 57.5 px; MHA would be 7,360 px, so it is left off.
//
// Colours: keys teal and values violet (the Transformer legend). The latent c_KV is a compressed hidden state, not a
// key or a value, so it gets pink, the tone of token representations (embeddings); k_R is a key, so it is teal.

const HEADS = 128;
const D_H = 128;
const D_C = 512;
const D_R = 64;
const GQA_GROUPS = 8;
const LAYERS = 60;
const BYTES = 2;

interface Part {
  label: string;
  n: number;
  tone: LayoutTone;
}
interface Row {
  id: string;
  name: string;
  parts: Part[];
}

const ROWS: Row[] = [
  {
    id: "mha",
    name: "MHA · 128 KV heads",
    parts: [
      { label: `K · ${HEADS} heads × ${D_H}`, n: HEADS * D_H, tone: ROLE_TONE.key },
      { label: `V · ${HEADS} heads × ${D_H}`, n: HEADS * D_H, tone: ROLE_TONE.value },
    ],
  },
  {
    id: "gqa",
    name: `GQA · ${GQA_GROUPS} KV heads`,
    parts: [
      { label: `K · ${GQA_GROUPS} heads × ${D_H}`, n: GQA_GROUPS * D_H, tone: ROLE_TONE.key },
      { label: `V · ${GQA_GROUPS} heads × ${D_H}`, n: GQA_GROUPS * D_H, tone: ROLE_TONE.value },
    ],
  },
  {
    id: "mla",
    name: "MLA · latent + RoPE key",
    parts: [
      { label: `c_KV ${D_C}`, n: D_C, tone: ROLE_TONE.embedding },
      { label: "", n: D_R, tone: ROLE_TONE.key },
    ],
  },
  {
    id: "mqa",
    name: "MQA · 1 KV head",
    parts: [
      { label: "K", n: D_H, tone: ROLE_TONE.key },
      { label: "V", n: D_H, tone: ROLE_TONE.value },
    ],
  },
];

const total = (r: Row) => r.parts.reduce((s, p) => s + p.n, 0);
const MHA = total(ROWS[0]); // 32,768
const MLA = total(ROWS[2]); // 576

const fmtInt = (n: number) => n.toLocaleString("en-US");
// BAR_MAX × zoom = 460 × 16 = 7,360 px for MHA in the zoomed panel: 16 panel-bar widths.
const fmtBytes = (n: number) => {
  const b = n * LAYERS * BYTES;
  return b >= 1e6 ? `${(b / 1e6).toFixed(2)} MB` : `${(b / 1e3).toFixed(1)} KB`;
};

// ── Grid ───────────────────────────────────────────────────────────────────────────────────────────────────────
const NAME_X = 24;
const NAME_W = 168;
const BAR_X = 200;
const BAR_MAX = 460;
const BAR_H = 24;
const ROW_STEP = 46;
const A = { y: 48, first: 78 };
const B = { y: 290, first: 320, zoom: 16 };

const text = (id: string, x: number, y: number, w: number, h: number, label: string, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;
/** A text box that hugs its label, so a centred label reads as left-aligned after a bar. */
const after = (id: string, x: number, y: number, label: string, tone: LayoutTone = "neutral") =>
  text(id, x, y, Math.round(label.length * 6.9) + 8, BAR_H, label, tone);

function row(r: Row, y: number, pxPer: number, panel: string, showLabels: boolean): LayoutShape[] {
  const out: LayoutShape[] = [text(`${panel}-${r.id}-name`, NAME_X, y, NAME_W, BAR_H, r.name)];
  let x = BAR_X;
  r.parts.forEach((p, i) => {
    const w = Math.round(p.n * pxPer * 100) / 100;
    const fits = showLabels && p.label && p.label.length * 6.2 <= w - 8;
    out.push({
      id: `${panel}-${r.id}-${i}`,
      type: "cell",
      x,
      y,
      w,
      h: BAR_H,
      tone: p.tone,
      fill: "pastel",
      label: fits ? p.label : undefined,
      quiet: true,
    });
    x += w;
  });
  const n = total(r);
  const ratio = r.id === "mha" ? "" : ` · ${(MHA / n).toFixed(n === MLA ? 1 : 0)}× less`;
  const note = r.id === "mla" ? `${fmtInt(n)} = ${D_C} + ${D_R} RoPE key` : fmtInt(n);
  out.push(
    after(`${panel}-${r.id}-value`, x + 10, y, `${note}${ratio}`, r.id === "mla" ? ROLE_TONE.embedding : "neutral")
  );
  return out;
}

const pxA = BAR_MAX / MHA;
const pxB = pxA * B.zoom;
const zoomRows = ROWS.slice(1);

const shapes: LayoutShape[] = [
  ...ROWS.flatMap((r, i) => row(r, A.first + i * ROW_STEP, pxA, "a", true)),
  ...zoomRows.flatMap((r, i) => row(r, B.first + i * ROW_STEP, pxB, "b", true)),
  // MHA does not fit the zoomed panel: say how far off the chart it runs.
  text(
    "b-mha-off",
    NAME_X,
    B.first + zoomRows.length * ROW_STEP,
    816,
    BAR_H,
    `MHA is off the chart here: at this zoom its bar would be ${MHA / total(ROWS[1])} times as long as the GQA bar.`
  ),
  // The MLA RoPE key is too thin for a label in either panel; name it under the zoomed bar.
  text(
    "b-mla-kr",
    BAR_X + Math.round(D_C * pxB) - 40,
    B.first + ROW_STEP + BAR_H + 2,
    110,
    16,
    `k_R ${D_R}`,
    ROLE_TONE.key
  ),
  // Whole-model bytes per token, one line per design.
  text(
    "bytes",
    16,
    506,
    848,
    20,
    `Whole model, ${LAYERS} layers, 16-bit, per token: ` +
      ROWS.map((r) => `${r.id.toUpperCase()} ${fmtBytes(total(r))}`).join(" · "),
    "neutral"
  ),
  text(
    "foot",
    16,
    530,
    848,
    36,
    `Elements per token, per layer (DeepSeek-V2 Table 1): MHA 2 × ${HEADS} × ${D_H} · GQA 2 × ${GQA_GROUPS} × ${D_H} · ` +
      `MQA 2 × ${D_H} · MLA ${D_C} + ${D_R}.\nOnly the MLA row is DeepSeek-V2's real design; the others apply each ` +
      `formula to the same ${HEADS} heads of ${D_H} dims.`,
    "neutral"
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "KV cache per token: MHA, GQA, MLA and MQA to scale",
  width: 880,
  height: 576,
  groups: [
    {
      id: "g-same",
      title: "Same scale: numbers cached per token, per layer",
      tone: ROLE_TONE.block,
      x: 12,
      y: A.y,
      w: 856,
      h: A.first + ROWS.length * ROW_STEP - A.y,
    },
    {
      id: "g-zoom",
      title: `Zoomed ${B.zoom}×: the three small rows`,
      tone: ROLE_TONE.block,
      x: 12,
      y: B.y,
      w: 856,
      h: B.first + (zoomRows.length + 1) * ROW_STEP - B.y - 12,
    },
  ],
  shapes,
};

export default spec;
