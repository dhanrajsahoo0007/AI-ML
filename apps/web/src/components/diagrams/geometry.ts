import type { DiagramEdge, DiagramNode, DiagramSpec, LayoutShape } from "./types";

export const NODE_W = 116;
export const NODE_H = 58;
/** Size of the drawing in a glyph node. */
export const GLYPH_SIZE = 54;

/** Default sizes of layout shapes (viewBox units). */
const SHAPE_W = { box: 120, cell: 40, circle: 40, text: 80, arrow: 0 } as const;
const SHAPE_H = { box: 48, cell: 40, circle: 40, text: 20, arrow: 0 } as const;

export type Point = [number, number];

/** Axis-aligned box as absolute coordinates. */
export interface Bounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Area an edge must stay out of, relative to the node centre. A glyph node's label hangs below the
// drawing, so its box reaches further down than up.
function nodeBox(node: DiagramNode) {
  if (node.variant === "glyph") {
    const half = (node.w ?? 76) / 2;
    return { left: half, right: half, top: (node.h ?? GLYPH_SIZE) / 2, bottom: 62 };
  }
  const w = (node.w ?? NODE_W) / 2;
  const h = (node.h ?? NODE_H) / 2;
  return { left: w, right: w, top: h, bottom: h };
}

/** The node's box in absolute coordinates. */
export function nodeBounds(node: DiagramNode): Bounds {
  const b = nodeBox(node);
  return { x1: node.x - b.left, y1: node.y - b.top, x2: node.x + b.right, y2: node.y + b.bottom };
}

/** Where a layout shape sits: box, cell and text are anchored top-left, a circle at its centre. */
export function shapeBounds(shape: LayoutShape): Bounds {
  const w = shape.w ?? SHAPE_W[shape.type];
  const h = shape.h ?? SHAPE_H[shape.type];
  if (shape.type === "circle") {
    const r = w / 2;
    return { x1: shape.x - r, y1: shape.y - r, x2: shape.x + r, y2: shape.y + r };
  }
  if (shape.type === "arrow") {
    return {
      x1: Math.min(shape.x, shape.x + w),
      y1: Math.min(shape.y, shape.y + h),
      x2: Math.max(shape.x, shape.x + w),
      y2: Math.max(shape.y, shape.y + h),
    };
  }
  return { x1: shape.x, y1: shape.y, x2: shape.x + w, y2: shape.y + h };
}

export const boundsCentre = (b: Bounds): Point => [(b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2];

/** True when the two boxes share any area (touching edges do not count). */
export function boundsOverlap(a: Bounds, b: Bounds) {
  return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
}

// Point where the ray from `origin` (inside the box) towards `to` leaves the box (plus a small gap). The origin
// is the node's own centre, which for a glyph node sits above the middle of its box because the label hangs below.
function boundsExit(b: Bounds, origin: Point, to: Point, gap = 4): Point {
  const [cx, cy] = origin;
  const dx = to[0] - cx;
  const dy = to[1] - cy;
  if (dx === 0 && dy === 0) return [cx, cy];
  const tx = dx > 0 ? (b.x2 - cx + gap) / dx : dx < 0 ? -(cx - b.x1 + gap) / dx : Infinity;
  const ty = dy > 0 ? (b.y2 - cy + gap) / dy : dy < 0 ? -(cy - b.y1 + gap) / dy : Infinity;
  const t = Math.min(tx, ty);
  return [cx + dx * t, cy + dy * t];
}

export function edgePoints(edge: DiagramEdge, from: DiagramNode, to: DiagramNode): Point[] {
  const via = edge.via ?? [];
  const start = boundsExit(nodeBounds(from), [from.x, from.y], via[0] ?? [to.x, to.y]);
  const end = boundsExit(nodeBounds(to), [to.x, to.y], via[via.length - 1] ?? [from.x, from.y]);
  return [start, ...via, end];
}

/** Polyline from the border of `from` to the border of `to`, through `via` (layout arrows between shapes). */
export function routeBetween(from: Bounds, to: Bounds, via: Point[]): Point[] {
  const start = boundsExit(from, boundsCentre(from), via[0] ?? boundsCentre(to));
  const end = boundsExit(to, boundsCentre(to), via[via.length - 1] ?? boundsCentre(from));
  return [start, ...via, end];
}

export function pathD(points: Point[]) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

// Point at fraction `t` of the polyline's total length.
export function pointAt(points: Point[], t: number): Point {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let target = lengths.reduce((a, b) => a + b, 0) * t;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? Math.min(1, target / lengths[i]) : 0;
      const [a, b] = [points[i], points[i + 1]];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    target -= lengths[i];
  }
  return points[0];
}

interface ComposePart {
  spec: DiagramSpec;
  /** Offset added to every coordinate of the part. */
  dx: number;
  dy: number;
  /** Prefix for the part's node and zone ids (and the edges that name them), to avoid clashes with the base. */
  prefix?: string;
  /**
   * Build step of the base in which the whole part appears. Without it the part's own node and edge steps are kept,
   * so they must fit the base's steps.
   */
  step?: number;
}

/**
 * Merges architecture specs into one drawing: the base keeps its title, size and steps; each part's zones, nodes
 * and edges are appended, shifted by (dx, dy) and optionally id-prefixed. The base's canvas grows if a part
 * reaches past it. A case study can draw a pattern's diagram inside one of its own steps this way.
 */
export function composeSpecs(base: DiagramSpec, parts: ComposePart[]): DiagramSpec {
  const out: DiagramSpec = {
    ...base,
    zones: [...base.zones],
    nodes: [...base.nodes],
    edges: [...base.edges],
  };
  for (const { spec, dx, dy, prefix, step } of parts) {
    const id = (s: string) => (prefix ? `${prefix}${s}` : s);
    out.zones.push(...spec.zones.map((z) => ({ ...z, id: id(z.id), x: z.x + dx, y: z.y + dy })));
    out.nodes.push(...spec.nodes.map((n) => ({ ...n, id: id(n.id), x: n.x + dx, y: n.y + dy, step: step ?? n.step })));
    out.edges.push(
      ...spec.edges.map((e) => ({
        ...e,
        from: id(e.from),
        to: id(e.to),
        via: e.via?.map(([x, y]): Point => [x + dx, y + dy]),
        step: step ?? e.step,
        // A part placed in one step shows all its edges from then on.
        until: step === undefined ? e.until : undefined,
      }))
    );
    out.width = Math.max(out.width, spec.width + dx);
    out.height = Math.max(out.height, spec.height + dy);
  }
  return out;
}
