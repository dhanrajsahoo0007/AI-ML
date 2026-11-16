import { describe, expect, it } from "vitest";
import {
  ARCH,
  ROLE_TONE,
  architectureShapes,
  block,
  matrix,
  miniMap,
  partMiddle,
  residual,
  vector,
} from "@/components/diagrams/presets/transformer";
import { lintSpec } from "@/components/diagrams/spec-lint";
import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

const specOf = (shapes: LayoutShape[], width = 400, height = 300): LayoutSpec => ({
  kind: "layout",
  title: "t",
  width,
  height,
  shapes,
});

describe("transformer presets", () => {
  it("keeps the fixed legend", () => {
    expect(ROLE_TONE).toMatchObject({
      embedding: "pink",
      attention: "orange",
      ffn: "blue",
      norm: "lime",
      linear: "violet",
      softmax: "green",
    });
  });

  it("draws a block as a pastel box in its role's tone with the default label", () => {
    expect(block("a", "attention", 10, 20)).toMatchObject({
      type: "box",
      x: 10,
      y: 20,
      w: 150,
      h: 44,
      tone: "orange",
      fill: "pastel",
      label: "Multi-Head\nAttention",
    });
    expect(block("n", "norm", 0, 0, { h: 30, label: "RMSNorm" }).label).toBe("RMSNorm");
  });

  it("lays vectors and matrices out as touching cells that pass lint", () => {
    const v = vector("q", 10, 10, 4, ROLE_TONE.query, { values: [0, 0.5, 1, 0.25] });
    expect(v.map((c) => [c.id, c.x, c.weight])).toEqual([
      ["q-0", 10, 0],
      ["q-1", 24, 0.5],
      ["q-2", 38, 1],
      ["q-3", 52, 0.25],
    ]);
    const col = vector("k", 10, 40, 3, ROLE_TONE.key, { vertical: true });
    expect(col.map((c) => c.y)).toEqual([40, 54, 68]);
    expect(col[0].fill).toBe("pastel");
    const m = matrix(
      "w",
      80,
      140,
      [
        [0.7, 0.2, 0.1],
        [1.4, -1, 0.5],
      ],
      ROLE_TONE.weight,
      { rowLabels: ["Ich", "liebe"], colLabels: ["I", "love", "tea"], showValues: true, digits: 1, cell: 36 }
    );
    expect(m.find((s) => s.id === "w-1-0")?.weight).toBe(1);
    expect(m.find((s) => s.id === "w-1-1")?.weight).toBe(0);
    expect(m.find((s) => s.id === "w-0-0")?.label).toBe(".7");
    expect(m.filter((s) => s.type === "text").map((s) => s.label)).toEqual(["Ich", "liebe", "I", "love", "tea"]);
    expect(lintSpec(specOf([...v, ...col, ...m]))).toEqual([]);
  });

  it("routes a residual out to the side and into the target's middle", () => {
    const target = block("norm", "norm", 100, 40, { h: 30 });
    expect(residual("r", [175, 200], target, 80)).toMatchObject({
      type: "arrow",
      x: 175,
      y: 200,
      to: "norm",
      via: [
        [80, 200],
        [80, 55],
      ],
    });
  });

  it("draws Figure 1 so that it lints, with the steps it is given", () => {
    const { shapes, groups } = architectureShapes({ "enc-mha": 2 });
    const spec: LayoutSpec = {
      ...specOf(shapes, ARCH.width, ARCH.height),
      groups,
      steps: [{ title: "a" }, { title: "b" }],
    };
    expect(lintSpec(spec)).toEqual([]);
    expect(shapes.find((s) => s.id === "enc-mha")?.step).toBe(2);
    expect(shapes.filter((s) => s.type === "box")).toHaveLength(14);
    expect(groups.map((g) => g.title)).toEqual(["Encoder × 6", "Decoder × 6"]);
    expect(partMiddle("linear")).toBe(143);
  });

  it("draws a small unlabelled locator that lints and rings the chosen parts", () => {
    const map = miniMap("m", 10, 10, { width: 150, ring: ["dec-xattn"] });
    expect(lintSpec(specOf(map, 200, 200))).toEqual([]);
    const boxes = map.filter((s) => s.type === "box");
    expect(boxes.every((b) => b.label === undefined)).toBe(true);
    expect(boxes.filter((b) => b.highlight).map((b) => b.id)).toEqual(["m-dec-xattn"]);
    const right = Math.max(...boxes.map((b) => b.x + (b.w ?? 0)));
    expect(right).toBeLessThanOrEqual(160);
  });
});
