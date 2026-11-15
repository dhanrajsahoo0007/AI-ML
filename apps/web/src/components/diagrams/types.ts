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
  /** A section tone; architecture zones may also use the diagram-only `pink` and `lime` (see LayoutTone). */
  tone: LayoutTone;
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
  /** Any diagram tone, including the diagram-only `pink` and `lime` (RAG and Transformer legends). */
  tone?: LayoutTone;
  /** Solid filled node for the component the diagram is about. */
  accent?: boolean;
  /**
   * Card background: "paper" (default, an outline card), "soft" the tone's pale tint, or "pastel" a coloured block
   * with ink text (`--dg-<tone>-fill`). Ignored when `accent` is set; not allowed on glyph nodes.
   */
  fill?: ShapeFill;
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
  tone?: LayoutTone;
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

/**
 * Diagram specs (layout shapes and groups, architecture nodes, zones and edges) may also use two diagram-only tones:
 * the Transformer and RAG figures' embedding `pink` and the Add & Norm / ranking `lime`. Sequence lanes and section
 * tints keep `Tone`.
 */
export type LayoutTone = Tone | "pink" | "lime";

export type ShapeType = "box" | "cell" | "circle" | "text" | "arrow" | "path";

/**
 * Fill of a box, cell or circle: "paper" the page background (box default), "soft" the tone's pale tint (cell and
 * circle default), "pastel" a stronger tint that reads as a coloured block (the paper-figure style).
 */
export type ShapeFill = "paper" | "soft" | "pastel";

/** A drawing inside a circle: ⊕ adder, ⊗ multiplier, or one period of a sine wave (positional encoding). */
export type CircleSymbol = "plus" | "times" | "sine";

export interface LayoutShape {
  id: string;
  type: ShapeType;
  /**
   * box, cell, text: top-left corner (text is centred inside its w × h box). circle: centre, w is the diameter.
   * arrow without from/to: start point; w and h are the vector to the end point. path: ignored (use `points`).
   */
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** Up to three lines, separated by "\n" (box, cell, circle, text). */
  label?: string;
  /** Second, smaller line under the label (box and cell). */
  sub?: string;
  tone?: LayoutTone;
  /** Box, cell, circle: background strength. Defaults: box "paper", cell and circle "soft". */
  fill?: ShapeFill;
  /** Circle: a symbol drawn inside it instead of (or as well as) a label. */
  symbol?: CircleSymbol;
  /**
   * 0 to 1. Cell: fill in the tone's stroke colour at this strength over paper (attention weights, heatmaps); the
   * label stays ink, and the opacity is capped per theme so it stays readable. Path: stroke opacity and width
   * (attention arcs).
   */
  weight?: number;
  /** Build step that introduces this shape (default 1). */
  step?: number;
  /** Pulsing ring in the shape's tone, for the element the paragraph is about. */
  highlight?: boolean;
  /**
   * No "NEW" ring and no stepper announcement when the shape appears: for the many cells of a matrix or vector,
   * where one labelled shape in the same step should carry the ring instead.
   */
  quiet?: boolean;
  /** Arrow endpoints by shape id; the line starts and ends at the shapes' borders. */
  from?: string;
  to?: string;
  /** Intermediate points of an arrow, as [x, y] pairs. */
  via?: [number, number][];
  /** Arrow and path: dashed line. Arrow: a dot travelling along it. */
  dashed?: boolean;
  packet?: boolean;
  /** Arrowhead at the end. Arrows default to true (false draws a plain line); paths default to false. */
  head?: boolean;
  /** Path: the points it passes through, in order, as [x, y] pairs (at least two). */
  points?: [number, number][];
  /** Path: a smooth curve through the points instead of straight segments. */
  smooth?: boolean;
}

/** A dotted group behind layout shapes, drawn like an architecture zone. */
export type LayoutGroup = DiagramZone;

export interface LayoutSpec {
  kind: "layout";
  title: string;
  width: number;
  height: number;
  shapes: LayoutShape[];
  /** Dotted groups behind the shapes, drawn like architecture zones. */
  groups?: LayoutGroup[];
  steps?: DiagramStep[];
}

export type AnySpec = DiagramSpec | SequenceSpec | LayoutSpec;

/** The kind of a spec, with the architecture default applied. */
export function specKind(spec: AnySpec): "architecture" | "sequence" | "layout" {
  return spec.kind ?? "architecture";
}
