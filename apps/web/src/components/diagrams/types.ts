// Declarative spec for an animated architecture diagram. Coordinates are in viewBox units.

export type Tone = "blue" | "green" | "orange" | "red" | "violet" | "teal" | "neutral";

export interface DiagramZone {
  id: string;
  title: string;
  tone: Tone;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiagramNode {
  id: string;
  label: string;
  /** Second, smaller line under the label. */
  sub?: string;
  /** Glyph from ./glyphs, a key from DIAGRAM_ICONS, or any name from src/lib/icons.ts. */
  icon?: string;
  tone?: Tone;
  /** Solid filled node for the component the diagram is about. */
  accent?: boolean;
  /** "card" (default): boxed node with the icon on the left. "glyph": a large drawing with the label below. */
  variant?: "card" | "glyph";
  /** Build step that introduces this node (default 1). */
  step?: number;
  /** Centre of the node (of the drawing, for glyph nodes). */
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  tone?: Tone;
  /** Dashed line; with `flow` the dashes march from source to target. */
  dashed?: boolean;
  flow?: boolean;
  /** A small dot travels along the edge. */
  packet?: boolean;
  /** Seconds before this edge's packet starts, to sequence a story across edges. */
  delay?: number;
  /** Seconds for one packet trip. */
  duration?: number;
  bidirectional?: boolean;
  /** Intermediate points for routed edges, as [x, y] pairs. */
  via?: [number, number][];
  /** Where along the path (0 to 1) the label sits; defaults to the middle. */
  labelAt?: number;
  /** Build step that introduces this edge (default: the later of its two nodes). */
  step?: number;
  /** Last build step that shows this edge; a later step replaces it. Hidden in the full diagram. */
  until?: number;
}

export interface DiagramStep {
  title: string;
  /** Requirement ids this step satisfies, such as "F1" or "NFR: scale". */
  covers?: string;
}

export interface DiagramSpec {
  title: string;
  width: number;
  height: number;
  zones: DiagramZone[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  /** Build steps, in order; step n is steps[n - 1]. */
  steps?: DiagramStep[];
}
