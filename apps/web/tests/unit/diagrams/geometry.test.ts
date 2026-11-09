import { describe, expect, it } from "vitest";
import {
  boundsCentre,
  boundsOverlap,
  composeSpecs,
  edgePoints,
  nodeBounds,
  routeBetween,
  shapeBounds,
} from "@/components/diagrams/geometry";
import type { DiagramSpec } from "@/components/diagrams/types";
import { arch } from "./fixtures";

const limiter: DiagramSpec = {
  title: "Rate limiter",
  width: 300,
  height: 200,
  zones: [{ id: "rl", title: "Limiter", tone: "orange", x: 10, y: 30, w: 280, h: 150 }],
  nodes: [
    { id: "gate", label: "Gate", x: 80, y: 100 },
    { id: "lb", label: "Buckets", x: 220, y: 100, step: 2 },
  ],
  edges: [{ from: "gate", to: "lb", via: [[150, 60]] }],
  steps: [{ title: "Own step one" }, { title: "Own step two" }],
};

describe("node and shape bounds", () => {
  it("centres a card node on its x, y", () => {
    expect(nodeBounds({ id: "a", label: "A", x: 100, y: 50 })).toEqual({ x1: 42, y1: 21, x2: 158, y2: 79 });
  });

  it("anchors boxes and cells top-left and circles at the centre", () => {
    expect(shapeBounds({ id: "c", type: "cell", x: 10, y: 20 })).toEqual({ x1: 10, y1: 20, x2: 50, y2: 60 });
    expect(shapeBounds({ id: "o", type: "circle", x: 100, y: 100, w: 30 })).toEqual({
      x1: 85,
      y1: 85,
      x2: 115,
      y2: 115,
    });
    expect(shapeBounds({ id: "a", type: "arrow", x: 50, y: 50, w: -20, h: 10 })).toEqual({
      x1: 30,
      y1: 50,
      x2: 50,
      y2: 60,
    });
  });

  it("treats touching boxes as not overlapping", () => {
    expect(boundsOverlap({ x1: 0, y1: 0, x2: 10, y2: 10 }, { x1: 10, y1: 0, x2: 20, y2: 10 })).toBe(false);
    expect(boundsOverlap({ x1: 0, y1: 0, x2: 10, y2: 10 }, { x1: 9, y1: 9, x2: 20, y2: 20 })).toBe(true);
  });
});

describe("routes", () => {
  it("starts and ends an edge just outside both node boxes", () => {
    const [start, end] = edgePoints({ from: "client", to: "lb" }, arch.nodes[0], arch.nodes[1]);
    expect(start[0]).toBeCloseTo(100 + 58 + 4);
    expect(end[0]).toBeCloseTo(250 - 58 - 4);
    expect(start[1]).toBe(150);
  });

  it("routes a layout arrow between two shapes' borders through via points", () => {
    const a = { x1: 0, y1: 0, x2: 40, y2: 40 };
    const b = { x1: 100, y1: 0, x2: 140, y2: 40 };
    expect(boundsCentre(a)).toEqual([20, 20]);
    const pts = routeBetween(a, b, [[70, 80]]);
    expect(pts).toHaveLength(3);
    expect(pts[1]).toEqual([70, 80]);
    expect(pts[0][1]).toBeCloseTo(44);
    expect(pts[2][1]).toBeCloseTo(44);
  });
});

describe("composeSpecs", () => {
  it("appends a part's zones, nodes and edges shifted by the offset with prefixed ids", () => {
    const out = composeSpecs(arch, [{ spec: limiter, dx: 600, dy: 100, prefix: "rl-" }]);
    expect(out.title).toBe(arch.title);
    expect(out.steps).toBe(arch.steps);
    expect(out.nodes.slice(arch.nodes.length).map((n) => [n.id, n.x, n.y, n.step])).toEqual([
      ["rl-gate", 680, 200, undefined],
      ["rl-lb", 820, 200, 2],
    ]);
    expect(out.zones.at(-1)).toMatchObject({ id: "rl-rl", x: 610, y: 130 });
    expect(out.edges.at(-1)).toMatchObject({ from: "rl-gate", to: "rl-lb", via: [[750, 160]] });
  });

  it("puts the whole part in one build step of the base when step is set", () => {
    const out = composeSpecs(arch, [{ spec: limiter, dx: 600, dy: 100, prefix: "rl-", step: 2 }]);
    const added = out.nodes.slice(arch.nodes.length);
    expect(added.map((n) => n.step)).toEqual([2, 2]);
    expect(out.edges.at(-1)).toMatchObject({ step: 2, until: undefined });
  });

  it("grows the canvas to fit the part and leaves the base untouched", () => {
    const out = composeSpecs(arch, [{ spec: limiter, dx: 600, dy: 200 }]);
    expect(out.width).toBe(900);
    expect(out.height).toBe(400);
    expect(arch.nodes).toHaveLength(4);
    expect(arch.width).toBe(800);
  });

  it("keeps ids as they are without a prefix and merges several parts in order", () => {
    const out = composeSpecs(arch, [
      { spec: limiter, dx: 0, dy: 300, prefix: "a-" },
      { spec: limiter, dx: 400, dy: 300 },
    ]);
    expect(out.nodes.map((n) => n.id).slice(4)).toEqual(["a-gate", "a-lb", "gate", "lb"]);
  });
});
