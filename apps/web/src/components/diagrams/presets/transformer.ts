// Shared building blocks for the Transformer figures in assets/diagrams/animated/transformer/. Pure functions that
// return layout shapes, so every figure keeps one colour legend and one set of proportions. Specs import from here
// and never hard-code a tone for a component.
//
// The geometry of Figure 1 of "Attention Is All You Need" (Vaswani et al., 2017) lives in ARCH below: the hero spec
// draws it at full size with labels, and miniMap() draws the same blocks small as a locator next to a zoomed panel.

import type { LayoutShape, LayoutTone } from "../types";

type Point = [number, number];

/** The fixed colour legend: a component keeps its tone in every Transformer diagram. */
export const ROLE_TONE = {
  // Components (Figure 1)
  embedding: "pink",
  position: "neutral",
  attention: "orange",
  ffn: "blue",
  norm: "lime",
  linear: "violet",
  softmax: "green",
  block: "neutral",
  // Inside attention (Figure 2)
  matmul: "violet",
  scale: "lime",
  mask: "pink",
  concat: "lime",
  // Data
  query: "blue",
  key: "teal",
  value: "violet",
  score: "orange",
  weight: "green",
  masked: "neutral",
  blocked: "red",
} as const satisfies Record<string, LayoutTone>;

type Role = keyof typeof ROLE_TONE;

/** Default block labels; "\n" breaks a line. */
const ROLE_LABEL: Partial<Record<Role, string>> = {
  embedding: "Embedding",
  attention: "Multi-Head\nAttention",
  ffn: "Feed\nForward",
  norm: "Add & Norm",
  linear: "Linear",
  softmax: "Softmax",
};

const BLOCK_W = 150;
const BLOCK_H = 44;
/** Height of a one-line block (Add & Norm, Linear, Softmax). */
const THIN_H = 30;

interface ShapeOpts {
  step?: number;
  highlight?: boolean;
}

/** A pastel block for a component, top-left at (x, y). */
export function block(
  id: string,
  role: Role,
  x: number,
  y: number,
  opts: ShapeOpts & { w?: number; h?: number; label?: string; sub?: string } = {}
): LayoutShape {
  return {
    id,
    type: "box",
    x,
    y,
    w: opts.w ?? BLOCK_W,
    h: opts.h ?? BLOCK_H,
    label: opts.label ?? ROLE_LABEL[role] ?? role,
    sub: opts.sub,
    tone: ROLE_TONE[role],
    fill: "pastel",
    step: opts.step,
    highlight: opts.highlight,
  };
}

/**
 * A vector drawn as `n` touching cells from (x, y), left to right (or top to bottom with `vertical`). Ids are
 * `<id>-0` … `<id>-<n-1>`. `values` (0–1) shade the cells; `labels` write in them. Cells are `quiet`.
 */
export function vector(
  id: string,
  x: number,
  y: number,
  n: number,
  tone: LayoutTone,
  opts: ShapeOpts & { cell?: number; vertical?: boolean; values?: number[]; labels?: string[] } = {}
): LayoutShape[] {
  const size = opts.cell ?? 14;
  return Array.from({ length: n }, (_, i) => ({
    id: `${id}-${i}`,
    type: "cell" as const,
    x: opts.vertical ? x : x + i * size,
    y: opts.vertical ? y + i * size : y,
    w: size,
    h: size,
    tone,
    fill: opts.values ? undefined : ("pastel" as const),
    weight: opts.values?.[i],
    label: opts.labels?.[i],
    step: opts.step,
    quiet: true,
    highlight: opts.highlight,
  }));
}

/**
 * A matrix of touching cells with its top-left at (x, y); `values[r][c]` (0–1) becomes each cell's weight. Ids are
 * `<id>-<r>-<c>`. Cells and labels are `quiet` (no NEW ring each in a stepper; label the step with one other shape).
 * Optional row labels sit to the left, column labels above, each as text shapes; `showValues` writes
 * every value in its cell with `digits` decimals.
 */
export function matrix(
  id: string,
  x: number,
  y: number,
  values: number[][],
  tone: LayoutTone,
  opts: ShapeOpts & {
    cell?: number;
    rowLabels?: string[];
    colLabels?: string[];
    showValues?: boolean;
    digits?: number;
    labelTone?: LayoutTone;
  } = {}
): LayoutShape[] {
  const size = opts.cell ?? 28;
  const out: LayoutShape[] = [];
  values.forEach((row, r) =>
    row.forEach((v, c) =>
      out.push({
        id: `${id}-${r}-${c}`,
        type: "cell",
        x: x + c * size,
        y: y + r * size,
        w: size,
        h: size,
        tone,
        weight: Math.min(1, Math.max(0, v)),
        label: opts.showValues ? v.toFixed(opts.digits ?? 2).replace(/^0\./, ".") : undefined,
        step: opts.step,
        quiet: true,
      })
    )
  );
  const labelTone = opts.labelTone ?? "neutral";
  opts.rowLabels?.forEach((label, r) =>
    out.push({
      id: `${id}-row-${r}`,
      type: "text",
      x: x - 64,
      y: y + r * size,
      w: 60,
      h: size,
      label,
      tone: labelTone,
      step: opts.step,
      quiet: true,
    })
  );
  opts.colLabels?.forEach((label, c) =>
    out.push({
      id: `${id}-col-${c}`,
      type: "text",
      x: x + c * size,
      y: y - 22,
      w: size,
      h: 20,
      label,
      tone: labelTone,
      step: opts.step,
      quiet: true,
    })
  );
  return out;
}

/**
 * A residual (skip) connection: from a point on the main line, out sideways to x = `outX`, along to the target's
 * middle, and into its side with an arrowhead. `outX` is left of the target for the encoder, right for the decoder.
 */
export function residual(
  id: string,
  from: Point,
  to: LayoutShape,
  outX: number,
  opts: { step?: number; tone?: LayoutTone } = {}
): LayoutShape {
  // A circle's y is already its centre; boxes are anchored at the top.
  const midY = to.type === "circle" ? to.y : to.y + (to.h ?? BLOCK_H) / 2;
  return {
    id,
    type: "arrow",
    x: from[0],
    y: from[1],
    to: to.id,
    via: [
      [outX, from[1]],
      [outX, midY],
    ],
    tone: opts.tone ?? "neutral",
    step: opts.step,
  };
}

// ── Figure 1 geometry ─────────────────────────────────────────────────────────────────────────────────────────

/** Column centres and the bottom of both N× groups, in the hero's 780-wide viewBox. */
export const ARCH = {
  width: 780,
  height: 844,
  encX: 200,
  decX: 575,
  /** Bottom edge of both N× groups. */
  groupBottom: 654,
  /** y of the ⊕ that adds positional encoding, and of the embeddings below it. */
  addY: 696,
  embY: 736,
  /** x of the vertical run of the residual lines: left of the encoder, right of the decoder. */
  encResidualX: 90,
  decResidualX: 668,
  /** The encoder output runs up to bridgeTopY, across, down at bridgeX and into the decoder at crossY. */
  bridgeX: 370,
  bridgeTopY: 324,
  crossY: 494,
  encGroup: { x: 56, y: 362, w: 249 },
  decGroup: { x: 430, y: 190, w: 250 },
} as const;

/** Identifier of each part of Figure 1. */
type ArchPart =
  | "enc-emb"
  | "enc-pe"
  | "enc-add"
  | "enc-mha"
  | "enc-norm1"
  | "enc-ffn"
  | "enc-norm2"
  | "dec-emb"
  | "dec-pe"
  | "dec-add"
  | "dec-mmha"
  | "dec-norm1"
  | "dec-xattn"
  | "dec-norm2"
  | "dec-ffn"
  | "dec-norm3"
  | "linear"
  | "softmax";

interface PartGeom {
  id: ArchPart;
  role: Role;
  /** Column centre; top edge; height. */
  cx: number;
  y: number;
  h: number;
  label: string;
}

const E = ARCH.encX;
const D = ARCH.decX;

/** Every block of Figure 1, bottom to top in reading order. */
const PARTS: PartGeom[] = [
  { id: "enc-emb", role: "embedding", cx: E, y: ARCH.embY, h: BLOCK_H, label: "Input\nEmbedding" },
  { id: "enc-mha", role: "attention", cx: E, y: 572, h: BLOCK_H, label: "Multi-Head\nAttention" },
  { id: "enc-norm1", role: "norm", cx: E, y: 512, h: THIN_H, label: "Add & Norm" },
  { id: "enc-ffn", role: "ffn", cx: E, y: 438, h: BLOCK_H, label: "Feed\nForward" },
  { id: "enc-norm2", role: "norm", cx: E, y: 386, h: THIN_H, label: "Add & Norm" },
  { id: "dec-emb", role: "embedding", cx: D, y: ARCH.embY, h: BLOCK_H, label: "Output\nEmbedding" },
  { id: "dec-mmha", role: "attention", cx: D, y: 568, h: 52, label: "Masked\nMulti-Head\nAttention" },
  { id: "dec-norm1", role: "norm", cx: D, y: 512, h: THIN_H, label: "Add & Norm" },
  { id: "dec-xattn", role: "attention", cx: D, y: 404, h: BLOCK_H, label: "Multi-Head\nAttention" },
  { id: "dec-norm2", role: "norm", cx: D, y: 350, h: THIN_H, label: "Add & Norm" },
  { id: "dec-ffn", role: "ffn", cx: D, y: 276, h: BLOCK_H, label: "Feed\nForward" },
  { id: "dec-norm3", role: "norm", cx: D, y: 216, h: THIN_H, label: "Add & Norm" },
  { id: "linear", role: "linear", cx: D, y: 128, h: THIN_H, label: "Linear" },
  { id: "softmax", role: "softmax", cx: D, y: 76, h: THIN_H, label: "Softmax" },
];

const geom = (id: ArchPart) => PARTS.find((p) => p.id === id)!;
const top = (id: ArchPart) => geom(id).y;
const bottom = (id: ArchPart) => geom(id).y + geom(id).h;
const middle = (id: ArchPart) => geom(id).y + geom(id).h / 2;

/** Where the input fans out into the three attention inputs (Q, K, V), below each self-attention block. */
const FAN_Y = 642;
const FAN_DX = 45;
/** y where a residual leaves the main line below each N× group. */
const TAP_Y = 668;

/**
 * The full Figure 1: blocks, the two ⊕ adders with their positional-encoding circles, the main data path, residual
 * lines, the encoder output that feeds the decoder's cross-attention, and the two N× groups. Step numbers come from
 * `steps` (by shape id; default 1). Text annotations (inputs, outputs, captions) are left to the spec.
 */
export function architectureShapes(steps: Partial<Record<string, number>> = {}) {
  const at = (s: LayoutShape): LayoutShape => (steps[s.id] ? { ...s, step: steps[s.id] } : s);
  const blocks = PARTS.map((p) => block(p.id, p.role, p.cx - BLOCK_W / 2, p.y, { h: p.h, label: p.label }));
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const circle = (id: string, x: number, symbol: "plus" | "sine", w: number): LayoutShape => ({
    id,
    type: "circle",
    x,
    y: ARCH.addY,
    w,
    symbol,
    tone: "neutral",
    label: symbol === "plus" ? "Add" : "Positional encoding",
  });
  const arrow = (id: string, from: string, to: string): LayoutShape => ({ id, type: "arrow", x: 0, y: 0, from, to });
  /** A free arrow (or plain line) from (x, y) by (w, h), with an optional label pill at its middle. */
  const free = (id: string, x: number, y: number, w: number, h: number, head = true, label?: string): LayoutShape => ({
    id,
    type: "arrow",
    x,
    y,
    w,
    h,
    head: head ? undefined : false,
    label,
  });
  /** The input to a self-attention block: up from the ⊕, then a fan of three arrows (queries, keys, values). */
  const fan = (pre: string, cx: number, add: string, target: ArchPart): LayoutShape[] => {
    const rise = bottom(target) + 4 - FAN_Y;
    return [
      { id: `${pre}-trunk`, type: "arrow", x: cx, y: FAN_Y, w: 0, h: 0, from: add, head: false },
      free(`${pre}-q`, cx, FAN_Y, -FAN_DX, rise),
      free(`${pre}-k`, cx, FAN_Y, 0, rise),
      free(`${pre}-v`, cx, FAN_Y, FAN_DX, rise),
    ];
  };

  const shapes: LayoutShape[] = [
    ...blocks,
    circle("enc-add", E, "plus", 22),
    circle("enc-pe", E - 75, "sine", 28),
    circle("dec-add", D, "plus", 22),
    circle("dec-pe", D + 75, "sine", 28),
    // Encoder: embedding + position, self-attention, Add & Norm, feed-forward, Add & Norm.
    arrow("enc-emb>add", "enc-emb", "enc-add"),
    arrow("enc-pe>add", "enc-pe", "enc-add"),
    ...fan("enc-in", E, "enc-add", "enc-mha"),
    residual("enc-res1", [E, TAP_Y], byId.get("enc-norm1")!, ARCH.encResidualX),
    arrow("enc-mha>norm1", "enc-mha", "enc-norm1"),
    arrow("enc-norm1>ffn", "enc-norm1", "enc-ffn"),
    residual("enc-res2", [E, (top("enc-norm1") + bottom("enc-ffn")) / 2], byId.get("enc-norm2")!, ARCH.encResidualX),
    arrow("enc-ffn>norm2", "enc-ffn", "enc-norm2"),
    // The encoder's output goes up, across and down into the decoder's cross-attention as keys and values.
    {
      id: "enc-out",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [E, top("enc-norm2") - 4],
        [E, ARCH.bridgeTopY],
        [ARCH.bridgeX, ARCH.bridgeTopY],
        [ARCH.bridgeX, ARCH.crossY],
      ],
    },
    free("enc-out-kv", ARCH.bridgeX, ARCH.crossY, D - 15 - ARCH.bridgeX, 0, false, "K, V"),
    free("enc-out-k", D - FAN_DX, ARCH.crossY, 0, bottom("dec-xattn") + 4 - ARCH.crossY),
    free("enc-out-v", D - 15, ARCH.crossY, 0, bottom("dec-xattn") + 4 - ARCH.crossY),
    // Decoder: embedding + position, masked self-attention, Add & Norm, cross-attention, Add & Norm, FFN, Add & Norm.
    arrow("dec-emb>add", "dec-emb", "dec-add"),
    arrow("dec-pe>add", "dec-pe", "dec-add"),
    ...fan("dec-in", D, "dec-add", "dec-mmha"),
    residual("dec-res1", [D, TAP_Y], byId.get("dec-norm1")!, ARCH.decResidualX),
    arrow("dec-mmha>norm1", "dec-mmha", "dec-norm1"),
    // Queries come up from the decoder's own Add & Norm.
    free("dec-q", D + FAN_DX, top("dec-norm1") - 4, 0, bottom("dec-xattn") + 8 - top("dec-norm1"), true, "Q"),
    residual("dec-res2", [D + FAN_DX, top("dec-norm1") - 12], byId.get("dec-norm2")!, ARCH.decResidualX),
    arrow("dec-xattn>norm2", "dec-xattn", "dec-norm2"),
    arrow("dec-norm2>ffn", "dec-norm2", "dec-ffn"),
    residual("dec-res3", [D, (top("dec-norm2") + bottom("dec-ffn")) / 2], byId.get("dec-norm3")!, ARCH.decResidualX),
    arrow("dec-ffn>norm3", "dec-ffn", "dec-norm3"),
    arrow("dec-norm3>linear", "dec-norm3", "linear"),
    arrow("linear>softmax", "linear", "softmax"),
  ];
  const groups = [
    {
      id: "encoder",
      title: "Encoder × 6",
      tone: ROLE_TONE.block,
      ...ARCH.encGroup,
      h: ARCH.groupBottom - ARCH.encGroup.y,
    },
    {
      id: "decoder",
      title: "Decoder × 6",
      tone: ROLE_TONE.block,
      ...ARCH.decGroup,
      h: ARCH.groupBottom - ARCH.decGroup.y,
    },
  ];
  return { shapes: shapes.map(at), groups };
}

/** Vertical middle of a Figure 1 part, for specs that place text beside it. */
export const partMiddle = (id: ArchPart) => middle(id);

/**
 * A small, unlabelled copy of Figure 1 with its top-left at (x, y) and the given width: the "you are here" locator
 * next to a zoomed panel. The parts in `ring` are drawn solid with a pulsing ring.
 */
export function miniMap(
  id: string,
  x: number,
  y: number,
  opts: { width?: number; ring?: ArchPart[]; step?: number } = {}
): LayoutShape[] {
  // Crop to the blocks: from the encoder group's left edge to the decoder's right, Softmax to the embeddings.
  const cropX = ARCH.encGroup.x;
  const cropY = top("softmax");
  const s = (opts.width ?? 150) / (ARCH.decGroup.x + ARCH.decGroup.w - cropX);
  const px = (v: number) => Math.round((x + (v - cropX) * s) * 10) / 10;
  const py = (v: number) => Math.round((y + (v - cropY) * s) * 10) / 10;
  const line = (name: string, points: Point[], dashed = false): LayoutShape => ({
    id: `${id}-${name}`,
    type: "path",
    x: 0,
    y: 0,
    points: points.map(([a, b]) => [px(a), py(b)]),
    dashed: dashed || undefined,
    step: opts.step,
  });
  const frame = (name: string, g: { x: number; y: number; w: number }): LayoutShape =>
    line(
      name,
      [
        [g.x, g.y],
        [g.x + g.w, g.y],
        [g.x + g.w, ARCH.groupBottom],
        [g.x, ARCH.groupBottom],
        [g.x, g.y],
      ],
      true
    );
  const ring = new Set(opts.ring ?? []);
  return [
    frame("enc-frame", ARCH.encGroup),
    frame("dec-frame", ARCH.decGroup),
    line("enc-line", [
      [E, middle("enc-emb")],
      [E, middle("enc-norm2")],
    ]),
    line("dec-line", [
      [D, middle("dec-emb")],
      [D, middle("softmax")],
    ]),
    line("bridge", [
      [E, middle("enc-norm2")],
      [E, ARCH.bridgeTopY],
      [ARCH.bridgeX, ARCH.bridgeTopY],
      [ARCH.bridgeX, ARCH.crossY],
      [D, ARCH.crossY],
    ]),
    ...PARTS.map((p): LayoutShape => ({
      id: `${id}-${p.id}`,
      type: "box",
      x: px(p.cx - BLOCK_W / 2),
      y: py(p.y),
      w: Math.round(BLOCK_W * s * 10) / 10,
      h: Math.round(p.h * s * 10) / 10,
      tone: ROLE_TONE[p.role],
      fill: "pastel",
      highlight: ring.has(p.id) || undefined,
      step: opts.step,
    })),
  ];
}
