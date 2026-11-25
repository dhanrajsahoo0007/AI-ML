import { describe, expect, it } from "vitest";
import {
  FLASH_SALE,
  ORDER,
  PATTERN_TONE,
  SHOP,
  optionColumns,
  optionColumnsSize,
} from "@/components/diagrams/presets/patterns";
import { REFUND_CASE } from "@/components/diagrams/presets/production";
import { lintSpec } from "@/components/diagrams/spec-lint";
import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

const specOf = (shapes: LayoutShape[], width: number, height: number): LayoutSpec => ({
  kind: "layout",
  title: "t",
  width,
  height,
  shapes,
});

const tonesOf = (shapes: LayoutShape[]) =>
  new Set(shapes.map((s) => s.tone ?? "neutral").filter((t) => t !== "neutral"));

describe("patterns presets: legend and running example", () => {
  it("keeps the nine roles of the legend, one tone each", () => {
    expect(PATTERN_TONE).toEqual({
      traffic: "orange",
      compute: "teal",
      store: "violet",
      data: "blue",
      pattern: "green",
      check: "lime",
      id: "pink",
      fail: "red",
      infra: "neutral",
    });
    expect(new Set(Object.values(PATTERN_TONE)).size).toBe(9);
  });

  it("computes the shop's numbers from their working", () => {
    expect(SHOP.shoppersPerDay * SHOP.pagesPerShopper).toBe(SHOP.pageViewsPerDay);
    expect(Math.round(SHOP.pageViewsPerDay / SHOP.secondsPerDay)).toBe(SHOP.averageReadsPerSecond);
    expect(Math.round((SHOP.averageReadsPerSecond * SHOP.peakFactor) / 100) * 100).toBe(SHOP.peakReadsPerSecond);
    expect(Math.round((SHOP.ordersPerDay / SHOP.secondsPerDay) * 10) / 10).toBe(SHOP.averageOrdersPerSecond);
    expect(FLASH_SALE.hotKeyShare * SHOP.peakReadsPerSecond).toBeCloseTo(FLASH_SALE.hotKeyReadsPerSecond);
  });

  it("follows the same order as the production pages", () => {
    expect(ORDER.orderId).toBe(REFUND_CASE.orderId);
    expect(ORDER.price).toBe(REFUND_CASE.price);
    expect(ORDER.label).toBe("order 4471, a kettle, £42");
  });
});

describe("optionColumns", () => {
  const opts = {
    rowLabels: ["Lag", "Database load"],
    columns: [
      { id: "a", title: "Polling", tone: PATTERN_TONE.compute, rows: [{ label: "0.5 s" }, { label: "1 query/s" }] },
      {
        id: "b",
        title: "Log tailing",
        tone: PATTERN_TONE.pattern,
        rows: [{ label: "about 50 ms" }, { label: "Slot holds WAL", tone: PATTERN_TONE.fail }],
      },
    ],
  };

  it("lints clean and stays within four tones", () => {
    const { width, height } = optionColumnsSize(opts);
    const shapes = optionColumns("o", 10, 10, opts);
    expect(lintSpec(specOf(shapes, width + 20, height + 20))).toEqual([]);
    expect(tonesOf(shapes).size).toBeLessThanOrEqual(4);
    expect(shapes.filter((s) => s.type === "box")).toHaveLength(6);
  });

  it("refuses a label that would not fit its box", () => {
    expect(() =>
      optionColumns("o", 0, 0, {
        colW: 80,
        columns: [{ id: "a", title: "A title far too long", tone: PATTERN_TONE.data, rows: [] }],
      })
    ).toThrow(/does not fit/);
  });
});
