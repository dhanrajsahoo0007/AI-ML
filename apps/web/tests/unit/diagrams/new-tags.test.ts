import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnimatedDiagram } from "@/components/diagrams/animated-diagram";
import { buildView, layoutView } from "@/components/diagrams/build-view";
import { LayoutDiagram } from "@/components/diagrams/layout-diagram.client";
import {
  TAG_H,
  TAG_W,
  architectureTags,
  layoutTags,
  placeNewTags,
  type Obstacles,
} from "@/components/diagrams/new-tags";
import type { Bounds } from "@/components/diagrams/geometry";
import type { DiagramSpec, LayoutSpec } from "@/components/diagrams/types";

const ring = (x1: number, y1: number, x2: number, y2: number): Bounds => ({ x1, y1, x2, y2 });
const none: Obstacles = { boxes: [], text: [] };
const tagBox = (s: { x: number; y: number }): Bounds => ({ x1: s.x, y1: s.y, x2: s.x + TAG_W, y2: s.y + TAG_H });
const hits = (a: Bounds, b: Bounds) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

describe("placeNewTags", () => {
  it("puts the tag on the ring's top-right corner when nothing is there", () => {
    expect(placeNewTags([{ ring: ring(100, 100, 220, 160) }], none, 600, 400)).toEqual([
      { x: 220 - TAG_W, y: 100 - TAG_H / 2 },
    ]);
  });

  it("moves to the next free corner when a neighbour's label sits on the default spot", () => {
    // A label just above the top-right corner: the tag goes to the top-left corner instead.
    const label = ring(170, 80, 230, 96);
    const [spot] = placeNewTags([{ ring: ring(100, 100, 220, 160) }], { boxes: [], text: [label] }, 600, 400);
    expect(spot).toEqual({ x: 100, y: 100 - TAG_H / 2 });
    expect(hits(tagBox(spot!), label)).toBe(false);
  });

  it("tries the corners, then the edge middles, then the sides, and never covers text when a spot is free", () => {
    const r = ring(100, 100, 220, 160);
    // Text over every corner and both edge middles: the right side is the first free spot.
    const text = [ring(90, 80, 230, 102), ring(90, 150, 230, 175)];
    const [spot] = placeNewTags([{ ring: r }], { boxes: [], text }, 600, 400);
    expect(spot).toEqual({ x: 222, y: 130 - TAG_H / 2 });
    for (const t of text) expect(hits(tagBox(spot!), t)).toBe(false);
  });

  it("falls back to the spot that covers least, preferring a box edge to text", () => {
    const r = ring(100, 100, 220, 160);
    // Everything around is covered: boxes on the right, text everywhere else.
    const obstacles: Obstacles = {
      boxes: [ring(200, 60, 300, 200)],
      text: [ring(0, 60, 200, 102), ring(0, 150, 200, 200), ring(40, 102, 99, 150), ring(100, 60, 300, 82)],
    };
    const [spot] = placeNewTags([{ ring: r }], obstacles, 600, 400);
    // The cheapest spot only covers the box on the right, no text.
    for (const t of obstacles.text) expect(hits(tagBox(spot!), t)).toBe(false);
    expect(hits(tagBox(spot!), obstacles.boxes[0])).toBe(true);
  });

  it("keeps the tag inside the canvas, allowing the band above it", () => {
    // A ring hugging the right edge: its top-right corner fits, flush with the edge.
    const [right] = placeNewTags([{ ring: ring(500, 40, 600, 90) }], none, 600, 400);
    expect(right!.x + TAG_W).toBeLessThanOrEqual(600);
    // A ring at the very top may put its tag into the band above the drawing (y < 0), but no higher than 12.
    const [top] = placeNewTags([{ ring: ring(100, -3, 200, 50) }], none, 600, 400);
    expect(top!.y).toBeLessThan(0);
    expect(top!.y).toBeGreaterThanOrEqual(-12);
  });

  it("gives touching rings one tag between them, and keeps separate tags apart", () => {
    // Three cells side by side (rings touching) and one far away.
    const cells = [0, 1, 2].map((i) => ({ ring: ring(100 + i * 44, 100, 148 + i * 44, 148) }));
    const spots = placeNewTags([...cells, { ring: ring(400, 100, 448, 148) }], none, 600, 400);
    expect(spots.filter(Boolean)).toHaveLength(2);
    expect(spots[1]).toBeNull();
    expect(spots[2]).toBeNull();
    // Two neighbours whose rings do not touch but whose default tags would: the second moves off the first.
    const pair = placeNewTags([{ ring: ring(100, 100, 160, 140) }, { ring: ring(170, 100, 230, 140) }], none, 600, 400);
    expect(hits(tagBox(pair[0]!), tagBox(pair[1]!))).toBe(false);
  });

  it("is deterministic: the same input always gives the same spots", () => {
    const targets = [{ ring: ring(100, 100, 220, 160) }, { ring: ring(240, 100, 360, 160) }];
    const obstacles: Obstacles = { boxes: [ring(150, 20, 400, 90)], text: [ring(180, 85, 330, 99)] };
    expect(placeNewTags(targets, obstacles, 600, 400)).toEqual(placeNewTags(targets, obstacles, 600, 400));
  });
});

// A step view where the default top-right tag of the new node would sit on the bottom of the node just above it:
// "above" spans y 61..119, the new node's ring starts at 124, so its default tag spans 115..133.
const crowded: DiagramSpec = {
  title: "Crowded",
  width: 600,
  height: 300,
  zones: [],
  nodes: [
    { id: "above", label: "Rate limiter", x: 300, y: 90, w: 150 },
    { id: "fresh", label: "Cache", x: 300, y: 160, w: 150, step: 2 },
  ],
  edges: [],
  steps: [{ title: "One" }, { title: "Two" }],
};

describe("architectureTags", () => {
  it("keeps the new node's tag off the node above it", () => {
    const spot = architectureTags(buildView(crowded, 2), crowded.width, crowded.height).get("fresh")!;
    expect(spot).not.toEqual({ x: 382 - TAG_W, y: 124 - TAG_H / 2 });
    expect(hits(tagBox(spot!), ring(225, 61, 375, 119))).toBe(false);
  });

  it("moves the tag when an edge label pill sits on the default corner", () => {
    const spec: DiagramSpec = {
      ...crowded,
      nodes: [
        { id: "left", label: "Client", x: 100, y: 112, w: 116 },
        { id: "right", label: "Server", x: 500, y: 112, w: 116 },
        { id: "fresh", label: "Cache", x: 300, y: 150, w: 150, step: 2 },
      ],
      // The pill sits at the middle of the edge, (300, 112): right over the new node's top-right corner.
      edges: [{ from: "left", to: "right", label: "requests and replies" }],
    };
    const spot = architectureTags(buildView(spec, 2), spec.width, spec.height).get("fresh")!;
    const pill = ring(300 - 70, 102, 300 + 70, 122);
    expect(hits(tagBox(spot!), pill)).toBe(false);
  });
});

describe("layoutTags", () => {
  const cells: LayoutSpec = {
    kind: "layout",
    title: "A row of cells",
    width: 400,
    height: 160,
    shapes: [
      { id: "head", type: "text", x: 40, y: 20, w: 200, label: "Bucket counts" },
      ...[0, 1, 2, 3].map((i) => ({
        id: `c${i}`,
        type: "cell" as const,
        x: 40 + i * 44,
        y: 60,
        label: String(i),
        step: 2,
      })),
      { id: "far", type: "box" as const, x: 300, y: 60, w: 80, label: "Index", step: 2 },
    ],
    steps: [{ title: "Heading" }, { title: "Cells" }],
  };

  it("gives a row of new cells one tag and keeps it off the heading above", () => {
    const tags = layoutTags(layoutView(cells, 2), cells.width, cells.height);
    const spots = ["c0", "c1", "c2", "c3"].map((id) => tags.get(id));
    expect(spots.filter(Boolean)).toHaveLength(1);
    expect(tags.get("far")).toBeTruthy();
  });

  it("draws one NEW for the row in the rendered SVG, the same on every render", () => {
    const render = () => renderToStaticMarkup(createElement(LayoutDiagram, { spec: cells, step: 2, idBase: "t" }));
    const html = render();
    expect(html.match(/data-new="true"/g)).toHaveLength(5);
    expect(html.match(/data-new-tag="true"/g)).toHaveLength(2);
    expect(render()).toBe(html);
  });
});

describe("rendered tags", () => {
  it("draws the architecture tag where architectureTags put it, identically on every render", () => {
    const render = () => renderToStaticMarkup(createElement(AnimatedDiagram, { spec: crowded, step: 2, idBase: "t" }));
    const html = render();
    const spot = architectureTags(buildView(crowded, 2), crowded.width, crowded.height).get("fresh")!;
    expect(html).toContain(`x="${spot.x}" y="${spot.y}" width="${TAG_W}" height="${TAG_H}"`);
    expect(render()).toBe(html);
  });
});
