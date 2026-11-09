// Pure step and emphasis logic shared by the diagram renderers (no React), so it can be unit tested.

import { boundsCentre, shapeBounds } from "./geometry";
import type { DiagramEdge, DiagramNode, DiagramSpec, DiagramZone, LayoutShape, LayoutSpec } from "./types";

/** How an element is drawn at the current build step: added in this step, carried over, or full diagram. */
export type Phase = "new" | "old" | "full";

/** Phase of an element introduced at `introduced` when the diagram shows build `step` (undefined = full). */
export const phaseOf = (introduced: number, step: number | undefined): Phase =>
  step === undefined ? "full" : introduced === step ? "new" : "old";

const nodeStep = (n: DiagramNode) => n.step ?? 1;

interface NodeView {
  node: DiagramNode;
  phase: Phase;
}
interface EdgeView {
  edge: DiagramEdge;
  from: DiagramNode;
  to: DiagramNode;
  phase: Phase;
  /** Packet start, in seconds, after re-basing the new edges of a step view to start together. */
  delay: number;
}
interface ZoneView {
  zone: DiagramZone;
  phase: Phase;
}

const inside = (z: DiagramZone, n: DiagramNode) => n.x >= z.x && n.x <= z.x + z.w && n.y >= z.y && n.y <= z.y + z.h;

/** Which nodes, edges and zones appear at build `step` (undefined = the full diagram), and in which phase. */
export function buildView(
  spec: DiagramSpec,
  step: number | undefined
): { nodes: NodeView[]; edges: EdgeView[]; zones: ZoneView[] } {
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));

  const nodes = spec.nodes
    .filter((n) => step === undefined || nodeStep(n) <= step)
    .map((n) => ({ node: n, phase: phaseOf(nodeStep(n), step) }));
  const shown = new Set(nodes.map((v) => v.node.id));

  const edges = spec.edges.flatMap((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to || !shown.has(from.id) || !shown.has(to.id)) return [];
    const introduced = edge.step ?? Math.max(nodeStep(from), nodeStep(to));
    if (
      step === undefined
        ? edge.until !== undefined
        : introduced > step || (edge.until !== undefined && step > edge.until)
    ) {
      return [];
    }
    return [{ edge, from, to, phase: phaseOf(introduced, step) }];
  });

  // In a step view the packets of the new edges start together, whatever their place in the full story.
  const firstDelay = Math.min(...edges.filter((e) => e.phase === "new").map((e) => e.edge.delay ?? 0));
  const timed = edges.map((e) => ({
    ...e,
    delay: e.phase === "new" ? (e.edge.delay ?? 0) - firstDelay : (e.edge.delay ?? 0),
  }));

  const zones = spec.zones
    .filter((z) => nodes.some((v) => inside(z, v.node)))
    .map((z) => ({
      zone: z,
      phase: step === undefined ? "full" : nodes.some((v) => v.phase === "new" && inside(z, v.node)) ? "new" : "old",
    })) as ZoneView[];

  return { nodes, edges: timed, zones };
}

/**
 * What the `highlight` and `path` props single out. `path` is node ids joined by ">" ("client>lb>cache"); its
 * consecutive pairs are the emphasised edges. With `highlight` alone, an edge stays bright when both of its nodes
 * are highlighted. Returns undefined when neither prop names anything, so nothing is dimmed.
 */
export interface Emphasis {
  nodes: Set<string>;
  /** Edge keys "a>b" from the path, in the written direction. */
  pathEdges: Set<string>;
  hasPath: boolean;
}

export function parseEmphasis(highlight?: string[], path?: string): Emphasis | undefined {
  const ids = (path ?? "")
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);
  const nodes = new Set([...(highlight ?? []).map((s) => s.trim()).filter(Boolean), ...ids]);
  if (nodes.size === 0) return undefined;
  const pathEdges = new Set<string>();
  for (let i = 1; i < ids.length; i++) pathEdges.add(`${ids[i - 1]}>${ids[i]}`);
  return { nodes, pathEdges, hasPath: ids.length > 1 };
}

/** Ids named by `highlight` or `path` that are not nodes of the spec (a typo would dim the whole diagram). */
export function unknownEmphasisIds(spec: DiagramSpec, highlight?: string[], path?: string): string[] {
  const em = parseEmphasis(highlight, path);
  if (!em) return [];
  const ids = new Set(spec.nodes.map((n) => n.id));
  return [...em.nodes].filter((id) => !ids.has(id));
}

export const nodeEmphasised = (em: Emphasis | undefined, id: string) => !em || em.nodes.has(id);

/** An edge is bright when it lies on the path, or (without a path) joins two highlighted nodes. */
export function edgeEmphasised(em: Emphasis | undefined, from: string, to: string) {
  if (!em) return true;
  if (em.hasPath) return em.pathEdges.has(`${from}>${to}`) || em.pathEdges.has(`${to}>${from}`);
  return em.nodes.has(from) && em.nodes.has(to);
}

/** A zone stays bright when it holds a highlighted node. */
export function zoneEmphasised(em: Emphasis | undefined, zone: DiagramZone, nodes: DiagramNode[]) {
  if (!em) return true;
  return nodes.some((n) => em.nodes.has(n.id) && inside(zone, n));
}

// ── Layout diagrams ────────────────────────────────────────────────────────────────────────────────────────────

interface ShapeView {
  shape: LayoutShape;
  phase: Phase;
}

const shapeStep = (s: LayoutShape) => s.step ?? 1;

const inGroup = (g: DiagramZone, s: LayoutShape) => {
  if (s.type === "arrow") return false;
  const [cx, cy] = boundsCentre(shapeBounds(s));
  return cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h;
};

/**
 * Which shapes and groups of a layout spec appear at build `step` (undefined = full drawing). An arrow waits for
 * the shapes it joins; a group shows once a shape inside it does.
 */
export function layoutView(spec: LayoutSpec, step: number | undefined): { shapes: ShapeView[]; groups: ZoneView[] } {
  const visible = spec.shapes.filter((s) => step === undefined || shapeStep(s) <= step);
  const ids = new Set(visible.map((s) => s.id));
  const shapes = visible
    .filter((s) => s.type !== "arrow" || ((!s.from || ids.has(s.from)) && (!s.to || ids.has(s.to))))
    .map((shape) => ({ shape, phase: phaseOf(shapeStep(shape), step) }));
  const groups = (spec.groups ?? [])
    .filter((g) => shapes.some((v) => inGroup(g, v.shape)))
    .map((zone): ZoneView => ({
      zone,
      phase:
        step === undefined ? "full" : shapes.some((v) => v.phase === "new" && inGroup(zone, v.shape)) ? "new" : "old",
    }));
  return { shapes, groups };
}
