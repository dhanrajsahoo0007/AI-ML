// Declarative spec for an animated architecture diagram. Coordinates are in viewBox units.

export type Tone = "blue" | "green" | "orange" | "red" | "violet" | "teal" | "neutral";

export type CloudProvider = "aws" | "gcp" | "azure";

/** A service on one cloud: a catalog id from src/lib/cloud-catalog (such as "aws-msk"), or a label with an optional id. */
export type CloudRef = string | { id?: string; label: string };

/**
 * How a zone is drawn. Default: a dotted group with a title tab (Clients, Edge, Storage...). For deployment diagrams:
 * "region" is a plain outline, "vpc" a solid tinted network boundary, "subnet" a tinted band with an inline label.
 */
export type ZoneKind = "region" | "vpc" | "subnet";

export interface DiagramZone {
  id: string;
  title: string;
  tone: Tone;
  kind?: ZoneKind;
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
  /** The managed service that plays this role on each cloud; drives the diagram's cloud toggle and mapping table. */
  cloud?: Partial<Record<CloudProvider, CloudRef>>;
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
