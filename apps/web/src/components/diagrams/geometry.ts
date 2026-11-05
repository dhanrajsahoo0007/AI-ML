import type { DiagramEdge, DiagramNode } from "./types";

export const NODE_W = 116;
export const NODE_H = 58;
/** Size of the drawing in a glyph node. */
export const GLYPH_SIZE = 54;

type Point = [number, number];

// Area an edge must stay out of, relative to the node centre. A glyph node's label hangs below the
// drawing, so its box reaches further down than up.
export function nodeBox(node: DiagramNode) {
  if (node.variant === "glyph") {
    const half = (node.w ?? 76) / 2;
    return { left: half, right: half, top: (node.h ?? GLYPH_SIZE) / 2, bottom: 62 };
  }
  const w = (node.w ?? NODE_W) / 2;
  const h = (node.h ?? NODE_H) / 2;
  return { left: w, right: w, top: h, bottom: h };
}

// Point where the ray from the node centre towards `to` leaves the node's box (plus a small gap).
function boxExit(node: DiagramNode, to: Point): Point {
  const b = nodeBox(node);
  const gap = 4;
  const dx = to[0] - node.x;
  const dy = to[1] - node.y;
  if (dx === 0 && dy === 0) return [node.x, node.y];
  const tx = dx > 0 ? (b.right + gap) / dx : dx < 0 ? -(b.left + gap) / dx : Infinity;
  const ty = dy > 0 ? (b.bottom + gap) / dy : dy < 0 ? -(b.top + gap) / dy : Infinity;
  const t = Math.min(tx, ty);
  return [node.x + dx * t, node.y + dy * t];
}

export function edgePoints(edge: DiagramEdge, from: DiagramNode, to: DiagramNode): Point[] {
  const via = edge.via ?? [];
  const start = boxExit(from, via[0] ?? [to.x, to.y]);
  const end = boxExit(to, via[via.length - 1] ?? [from.x, from.y]);
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
