import type { buildView, layoutView } from "./build-view";
import { boundaryTabWidth, pillWidth, zoneTabWidth } from "./diagram-style";
import {
  GLYPH_SIZE,
  NODE_W,
  arrowPoints,
  boundsCentre,
  boundsOverlap,
  edgePoints,
  nodeBounds,
  pointAt,
  shapeBounds,
  type Bounds,
} from "./geometry";
import { FONTS, measureText, type TextFont } from "./text-width";
import type { DiagramNode, LayoutGroup, LayoutShape } from "./types";

// Placement of the green "NEW" tags on the elements a build step adds. A tag sits on its element's dashed ring;
// the default spot is the ring's top-right corner, and when that would cover another element's text or box the
// tag moves to the first free spot among the other corners and edges; when no spot is free it takes the one that
// covers least. New elements whose rings touch (a row of cells added together) share one tag, placed on one of
// their rings, so a block of new cells shows one NEW, not a pile.
// Pure and order-stable: the same spec and step always give the same placement, so SSR matches hydration.

export const TAG_W = 40;
export const TAG_H = 18;
/** Rings closer than this (viewBox units) count as touching and share a tag. */
const CLUSTER_GAP = 4;
/**
 * How far above the drawing a tag may sit. The frame keeps a 48px band above the SVG for the play button, and at
 * least 12px of padding under reduced motion, so a tag up to 12 units above the canvas stays visible.
 */
const TOP_ROOM = 12;

/** An element the step added: its ring (the dashed outline, pad included) and the text drawn inside it. */
interface TagTarget {
  ring: Bounds;
  /** The element's own text boxes: the tag may cover the element's border but not its own label. */
  text?: Bounds[];
}

/** What a tag should stay off: element boxes, and text (labels, pills, tabs), which counts three times as much. */
export interface Obstacles {
  boxes: Bounds[];
  text: Bounds[];
}
const TEXT_WEIGHT = 3;
/** Another NEW tag is the worst neighbour: two tags on top of each other read as one blob. */
const TAG_WEIGHT = 6;

/** Where to draw a tag: the top-left corner of its 40 × 18 pill, or null when a neighbour's tag covers this ring. */
export type TagSpot = { x: number; y: number } | null;

const overlapArea = (a: Bounds, b: Bounds) =>
  Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));

const near = (a: Bounds, b: Bounds, gap: number) =>
  boundsOverlap({ x1: a.x1 - gap, y1: a.y1 - gap, x2: a.x2 + gap, y2: a.y2 + gap }, b);

/** Candidate tag corners on a ring, most preferred first: the four corners, the top and bottom middles, the sides. */
function candidates(r: Bounds): { x: number; y: number }[] {
  const midX = (r.x1 + r.x2) / 2 - TAG_W / 2;
  const midY = (r.y1 + r.y2) / 2 - TAG_H / 2;
  const top = r.y1 - TAG_H / 2;
  const bottom = r.y2 - TAG_H / 2;
  return [
    { x: r.x2 - TAG_W, y: top },
    { x: r.x1, y: top },
    { x: r.x2 - TAG_W, y: bottom },
    { x: r.x1, y: bottom },
    { x: midX, y: top },
    { x: midX, y: bottom },
    { x: r.x2 + 2, y: midY },
    { x: r.x1 - TAG_W - 2, y: midY },
    // Clear above the ring (into the band over the drawing for a top-row element).
    { x: r.x2 - TAG_W, y: r.y1 - TAG_H - 2 },
    { x: r.x1, y: r.y1 - TAG_H - 2 },
  ];
}

/**
 * Tag spots for `targets` (in drawing order), avoiding `obstacles` (every other element's text and box bounds) and
 * each other, inside a `width` × `height` canvas. A spot's cost is the area it covers, text weighted over boxes;
 * the first spot that covers nothing wins, else the cheapest. `boxes` are the targets' own boxes: a tag may sit on its own
 * element's border but not on another new element. Returns one spot per target; the members of a touching group
 * after the first get null.
 */
export function placeNewTags(
  targets: TagTarget[],
  obstacles: Obstacles,
  width: number,
  height: number,
  boxes: (Bounds | undefined)[] = []
): TagSpot[] {
  // Group touching rings (union-find in drawing order, so the result does not depend on anything but the spec).
  const parent = targets.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (let i = 0; i < targets.length; i++)
    for (let j = i + 1; j < targets.length; j++)
      if (near(targets[i].ring, targets[j].ring, CLUSTER_GAP)) parent[root(j)] = root(i);

  const groups = new Map<number, number[]>();
  targets.forEach((_, i) => {
    const r = root(i);
    groups.set(r, [...(groups.get(r) ?? []), i]);
  });

  const out: TagSpot[] = targets.map(() => null);
  const placed: Bounds[] = [];
  for (const members of [...groups.values()].sort((a, b) => a[0] - b[0])) {
    // A group's tag sits on one of its members' rings, so it never floats in the empty corner of an L-shaped group:
    // the top member first (rightmost among equals), as a lone element's tag prefers the top-right.
    const rings = members.map((i) => targets[i].ring).sort((a, b) => a.y1 - b.y1 || b.x2 - a.x2 || a.x1 - b.x1);
    const own = members.flatMap((i) => targets[i].text ?? []);
    const inGroup = (i: number) => root(i) === root(members[0]);
    const otherBoxes = boxes.filter((b, i): b is Bounds => !!b && !inGroup(i));
    const otherText = targets.flatMap((t, i) => (inGroup(i) ? [] : (t.text ?? [])));
    let best: { x: number; y: number } | undefined;
    let bestCost = Infinity;
    for (const c of rings.flatMap(candidates)) {
      const tag = { x1: c.x, y1: c.y, x2: c.x + TAG_W, y2: c.y + TAG_H };
      // Leaving the canvas sideways or below, or rising past the room above it, is worse than any overlap.
      const outside =
        Math.max(0, -tag.x1) +
        Math.max(0, tag.x2 - width) +
        Math.max(0, -TOP_ROOM - tag.y1) +
        Math.max(0, tag.y2 - height);
      let cost = outside * 1e4;
      for (const o of [...obstacles.boxes, ...otherBoxes]) cost += overlapArea(tag, o);
      for (const o of [...obstacles.text, ...otherText, ...own]) cost += overlapArea(tag, o) * TEXT_WEIGHT;
      for (const p of placed) cost += overlapArea(tag, p) * TAG_WEIGHT;
      if (cost < bestCost) {
        best = c;
        bestCost = cost;
        if (cost === 0) break;
      }
    }
    const spot = best!;
    placed.push({ x1: spot.x, y1: spot.y, x2: spot.x + TAG_W, y2: spot.y + TAG_H });
    out[members[0]] = spot;
  }
  return out;
}

// ── Obstacles and targets per diagram kind ──────────────────────────────────────────────────────────────────────

const grow = (b: Bounds, pad: number): Bounds => ({ x1: b.x1 - pad, y1: b.y1 - pad, x2: b.x2 + pad, y2: b.y2 + pad });

/** Box of one line of text drawn at `x` (start, middle or end anchor) on `baseline`. */
export function textBounds(
  text: string,
  font: TextFont,
  x: number,
  baseline: number,
  anchor: "start" | "middle" = "middle"
): Bounds {
  const w = measureText(text, font);
  const x1 = anchor === "start" ? x : x - w / 2;
  // Inter's ascent and descent: the box the browser reports for a line of text.
  return { x1, y1: baseline - font.size * 0.97, x2: x1 + w, y2: baseline + font.size * 0.24 };
}

/** A label pill centred on (x, y), as LabelPill draws it. */
const pillBounds = (text: string, x: number, y: number): Bounds => {
  const w = pillWidth(text);
  return { x1: x - w / 2, y1: y - 10, x2: x + w / 2, y2: y + 10 };
};

/** The text of an architecture node (positions as in animated-diagram.tsx). */
function nodeText(node: DiagramNode): Bounds[] {
  const out: Bounds[] = [];
  if (node.variant === "glyph") {
    const top = node.y + GLYPH_SIZE / 2;
    out.push(textBounds(node.label, FONTS.label, node.x, top + 17));
    if (node.sub) out.push(textBounds(node.sub, FONTS.sub, node.x, top + 32));
    return out;
  }
  const x = node.icon ? node.x - (node.w ?? NODE_W) / 2 + 52 : node.x;
  const anchor = node.icon ? "start" : "middle";
  out.push(textBounds(node.label, FONTS.label, x, node.sub ? node.y - 3 : node.y + 4.5, anchor));
  if (node.sub) out.push(textBounds(node.sub, FONTS.sub, x, node.y + 13, anchor));
  return out;
}

/** The title tab of a zone or layout group (Zone and BoundaryZone in diagram-shared.client.tsx). */
function zoneTab(zone: LayoutGroup & { kind?: string }): Bounds {
  if (zone.kind === "subnet")
    return textBounds(zone.title.toUpperCase(), FONTS.subnet, zone.x + 12, zone.y + 20, "start");
  if (zone.kind)
    return { x1: zone.x + 14, y1: zone.y - 12, x2: zone.x + 14 + boundaryTabWidth(zone.title), y2: zone.y + 12 };
  return { x1: zone.x + 16, y1: zone.y - 14, x2: zone.x + 16 + zoneTabWidth(zone.title), y2: zone.y + 14 };
}

/** Ring padding of a NewRing around an architecture node (NewRing's default). */
const NODE_RING_PAD = 7;

/**
 * NEW tag spots for an architecture step view, by node id. `display` maps a node to what is drawn (the cloud
 * toggle swaps labels). Obstacles: every other node's box and text, edge label pills and zone title tabs.
 */
export function architectureTags(
  view: ReturnType<typeof buildView>,
  width: number,
  height: number,
  display: (n: DiagramNode) => DiagramNode = (n) => n
): Map<string, TagSpot> {
  const fresh = view.nodes.filter((v) => v.phase === "new").map((v) => display(v.node));
  if (!fresh.length) return new Map();
  const freshIds = new Set(fresh.map((n) => n.id));
  const obstacles: Obstacles = { boxes: [], text: [] };
  for (const v of view.nodes) {
    if (freshIds.has(v.node.id)) continue;
    const n = display(v.node);
    obstacles.boxes.push(nodeBounds(n));
    obstacles.text.push(...nodeText(n));
  }
  for (const e of view.edges) {
    if (!e.edge.label) continue;
    const [x, y] = pointAt(edgePoints(e.edge, e.from, e.to), e.edge.labelAt ?? 0.5);
    obstacles.text.push(pillBounds(e.edge.label, x, y));
  }
  for (const z of view.zones) obstacles.text.push(zoneTab(z.zone));
  // A new node's own box is fair game for its tag (the tag sits on its border), but not the other new nodes' boxes.
  const targets = fresh.map((n) => ({
    ring: grow(nodeBounds(n), NODE_RING_PAD),
    text: nodeText(n),
    box: nodeBounds(n),
  }));
  const spots = placeNewTags(
    targets,
    obstacles,
    width,
    height,
    targets.map((t) => t.box)
  );
  return new Map(fresh.map((n, i) => [n.id, spots[i]]));
}

/** Ring padding of a layout shape's NewRing (layout-diagram.client.tsx). */
export const shapeRingPad = (s: LayoutShape) => (s.type === "cell" ? 4 : 7);

/** The text of a layout shape (positions as in layout-diagram.client.tsx Shape). */
function shapeText(s: LayoutShape): Bounds[] {
  if (s.type === "arrow" || s.type === "path") return [];
  const [cx, cy] = boundsCentre(shapeBounds(s));
  const lines = s.label && !s.symbol ? s.label.split("\n") : [];
  const shift = ((lines.length - 1) * 15) / 2;
  const labelY = (s.sub ? cy - 3 : cy + 4.5) - shift;
  const font = s.type === "text" ? FONTS.shapeText : FONTS.shape;
  const out = lines.map((l, i) => textBounds(l, font, cx, labelY + i * 15));
  if (s.sub) out.push(textBounds(s.sub, FONTS.shapeSub, cx, cy + 13 + shift));
  return out;
}

/**
 * NEW tag spots for a layout step view, by shape id (only the shapes that draw a ring: new, not quiet, not lines).
 * Obstacles: every other shape's box and text and every arrow label pill; group title tabs.
 */
export function layoutTags(view: ReturnType<typeof layoutView>, width: number, height: number): Map<string, TagSpot> {
  const isLine = (s: LayoutShape) => s.type === "arrow" || s.type === "path";
  const fresh = view.shapes.filter((v) => v.phase === "new" && !v.shape.quiet && !isLine(v.shape)).map((v) => v.shape);
  if (!fresh.length) return new Map();
  const freshIds = new Set(fresh.map((s) => s.id));
  const byId = new Map(view.shapes.map((v) => [v.shape.id, v.shape]));
  const obstacles: Obstacles = { boxes: [], text: [] };
  for (const { shape: s } of view.shapes) {
    if (s.type === "arrow") {
      if (s.label) {
        const [x, y] = pointAt(arrowPoints(s, byId), 0.5);
        obstacles.text.push(pillBounds(s.label, x, y));
      }
      continue;
    }
    if (s.type === "path" || freshIds.has(s.id)) continue;
    // A text shape's box is only nominal: its text is the obstacle.
    if (s.type !== "text") obstacles.boxes.push(shapeBounds(s));
    obstacles.text.push(...shapeText(s));
  }
  for (const g of view.groups) obstacles.text.push(zoneTab(g.zone));
  const targets = fresh.map((s) => ({
    ring: grow(shapeBounds(s), shapeRingPad(s)),
    text: shapeText(s),
    box: s.type === "text" ? undefined : shapeBounds(s),
  }));
  const spots = placeNewTags(
    targets,
    obstacles,
    width,
    height,
    targets.map((t) => t.box)
  );
  return new Map(fresh.map((s, i) => [s.id, spots[i]]));
}
