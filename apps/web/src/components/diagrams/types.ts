// Declarative specs for the diagrams in assets/diagrams/animated. Coordinates are in viewBox units.
//
// Three kinds share one asset location and one <AnimatedDiagram> MDX tag (./diagram.tsx dispatches on `kind`):
// - architecture (DiagramSpec, the default): zones, nodes and edges with packets and build steps
// - sequence (SequenceSpec): lanes with lifelines and messages drawn top to bottom
// - layout (LayoutSpec): static shapes (cells, boxes, arrows) with step reveal and highlight rings

export type Tone = "blue" | "green" | "orange" | "red" | "violet" | "teal" | "neutral";

export const CLOUD_PROVIDERS = ["aws", "gcp", "azure"] as const;
export type CloudProvider = (typeof CLOUD_PROVIDERS)[number];

/** True for "aws", "gcp" or "azure": the values of <AnimatedDiagram cloud>. */
export function isCloudProvider(value: unknown): value is CloudProvider {
  return (CLOUD_PROVIDERS as readonly unknown[]).includes(value);
}

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

/** An architecture diagram: the original and default kind. */
export interface DiagramSpec {
  /** Omitted means "architecture". */
  kind?: "architecture";
  title: string;
  width: number;
  height: number;
  zones: DiagramZone[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  /** Build steps, in order; step n is steps[n - 1]. */
  steps?: DiagramStep[];
}

// ── Sequence diagrams ──────────────────────────────────────────────────────────────────────────────────────────

export interface SequenceLane {
  id: string;
  label: string;
  /** Glyph from ./glyphs, a key from DIAGRAM_ICONS, or any name from src/lib/icons.ts. */
  icon?: string;
  tone?: Tone;
}

/**
 * How a message is drawn: "call" a solid arrow (default), "return" and "async" dashed arrows, "timeout" a solid
 * arrow with a red bar across it (the call that never answered), "note" a box spanning the two lanes.
 */
export type MessageKind = "call" | "return" | "async" | "timeout" | "note";

export interface SequenceMessage {
  from: string;
  to: string;
  label?: string;
  kind?: MessageKind;
  /** Build step that introduces this message (default 1). */
  step?: number;
  /** Seconds of pause before this message's packet leaves, on top of the previous message finishing. */
  delay?: number;
  /** Seconds the packet takes to cross (default 1.2). */
  duration?: number;
  /** Row order; defaults to the message's index in the array. Rows are drawn top to bottom in ascending order. */
  at?: number;
}

export interface SequenceNote {
  /** Lane the note hangs next to. */
  lane: string;
  text: string;
  /** Build step that introduces this note (default 1). */
  step?: number;
  /** Row order among messages; defaults to after every message. */
  at?: number;
}

export interface SequenceSpec {
  kind: "sequence";
  title: string;
  /** ViewBox width; defaults to room for every lane. Height follows from the number of rows. */
  width?: number;
  lanes: SequenceLane[];
  messages: SequenceMessage[];
  notes?: SequenceNote[];
  steps?: DiagramStep[];
}

// ── Layout diagrams ────────────────────────────────────────────────────────────────────────────────────────────

export type ShapeType = "box" | "cell" | "circle" | "text" | "arrow";

export interface LayoutShape {
  id: string;
  type: ShapeType;
  /**
   * box, cell, text: top-left corner (text is centred inside its w × h box). circle: centre, w is the diameter.
   * arrow without from/to: start point; w and h are the vector to the end point.
   */
  x: number;
  y: number;
  w?: number;
  h?: number;
  label?: string;
  /** Second, smaller line under the label (box and cell). */
  sub?: string;
  tone?: Tone;
  /** Build step that introduces this shape (default 1). */
  step?: number;
  /** Pulsing ring in the shape's tone, for the element the paragraph is about. */
  highlight?: boolean;
  /** Arrow endpoints by shape id; the line starts and ends at the shapes' borders. */
  from?: string;
  to?: string;
  /** Intermediate points of an arrow, as [x, y] pairs. */
  via?: [number, number][];
  /** Arrow: dashed line, and a dot travelling along it. */
  dashed?: boolean;
  packet?: boolean;
}

export interface LayoutSpec {
  kind: "layout";
  title: string;
  width: number;
  height: number;
  shapes: LayoutShape[];
  /** Dotted groups behind the shapes, drawn like architecture zones. */
  groups?: DiagramZone[];
  steps?: DiagramStep[];
}

export type AnySpec = DiagramSpec | SequenceSpec | LayoutSpec;

/** The kind of a spec, with the architecture default applied. */
export function specKind(spec: AnySpec): "architecture" | "sequence" | "layout" {
  return spec.kind ?? "architecture";
}
