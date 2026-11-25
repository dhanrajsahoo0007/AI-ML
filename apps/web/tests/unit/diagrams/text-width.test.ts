import { describe, expect, it } from "vitest";
import { boundaryTabWidth, pillWidth, zoneTabWidth } from "@/components/diagrams/diagram-style";
import { FONTS, measureText } from "@/components/diagrams/text-width";

// Calibration pin: widths of real diagram labels measured in Chromium with getBBox() (Inter from next/font, in a
// `.dg` SVG, viewBox units) and, in brackets, the largest of the full-size and phone-scale (0.6 and 0.45) widths.
// Measured on 2026-11-23 against every label in the specs; the model's table comes from the same session. If the
// font or its features change, re-measure and update both.
const MEASURED: [keyof typeof FONTS, string, number][] = [
  // The sweep's overflows: "→" and "%" in edge pills, capitals in a sequence label, zone titles at phone scale.
  ["pill", "10% → 50% → 100%", 117.3],
  ["pill", "90% → 50% → 0%", 107.6],
  ["message", "DEADLINE_EXCEEDED", 123.1],
  ["zoneTab", "Engine on each node", 141.3],
  ["zoneTab", "Drivers and garages", 136.3],
  ["zoneTab", "Machines and people", 144.5],
  // Node labels and sub lines the old per-character estimate passed only by loosening its factors.
  ["label", "Session registry", 105.8],
  ["label", "Internal page", 85.8],
  ["label", "Socket gateway", 103.8],
  ["sub", "100 reads : 1 write", 97.7],
  ["sub", "bulk upserts, idempotent", 135.0],
  // Capitals and underscores in relation names.
  ["pill", "FROM_SOURCE", 86.5],
  ["pill", "OWNED_BY", 65.0],
  ["shapeSub", "TASK_STATE_INPUT_REQUIRED", 165.3],
  // Layout cells and the other styles.
  ["shape", "[MASK]", 48.6],
  ["shape", "Fundamentals", 88.7],
  ["shape", "+3,000/s", 58.2],
  ["boundaryTab", "Network account", 109.4],
  ["subnet", "PEOPLE", 47.9],
];

describe("measureText", () => {
  it.each(MEASURED)("%s %j is within a unit of its measured width", (font, text, measured) => {
    const w = measureText(text, FONTS[font]);
    // Kerning is ignored, so the estimate may run a little wide; it must never be more than a unit narrow.
    expect(w).toBeGreaterThan(measured - 1);
    expect(w).toBeLessThan(measured + 3.6);
  });

  it("tells narrow letters, wide capitals, digits and symbols apart", () => {
    const at = (s: string) => measureText(s, FONTS.label) / s.length;
    expect(at("iiiii")).toBeLessThan(4);
    expect(at("MMMMM")).toBeGreaterThan(12);
    expect(at("00000")).toBeCloseTo(8.91, 1);
    expect(measureText("→", FONTS.pill)).toBeCloseTo(12.3, 1);
    expect(measureText("%", FONTS.pill)).toBeCloseTo(11.4, 1);
  });

  it("interpolates the weight, scales with the size and adds letter spacing per character", () => {
    const regular = measureText("Gateway", { size: 10 });
    const bold = measureText("Gateway", { size: 10, weight: 700 });
    expect(measureText("Gateway", { size: 10, weight: 550 })).toBeCloseTo((regular + bold) / 2, 6);
    expect(measureText("Gateway", { size: 20 })).toBeCloseTo(regular * 2, 6);
    expect(measureText("NEW", { size: 10, letterSpacing: 0.6 })).toBeCloseTo(measureText("NEW", { size: 10 }) + 1.8, 6);
  });

  it("gives characters outside the table a fallback width and combining marks none", () => {
    expect(measureText("ā", { size: 10 })).toBeCloseTo(measureText("Ā", { size: 10 }) + 0, 0);
    expect(measureText("Ā", { size: 10 })).toBeCloseTo(measureText("A", { size: 10 }), 6);
    expect(measureText("☃", { size: 10 })).toBeCloseTo(7.2, 6);
  });
});

describe("renderer widths", () => {
  it("sizes pills, zone tabs and region tabs to hold their text", () => {
    // The pill pads 7 each side, so its text clears the border.
    expect(pillWidth("10% → 50% → 100%")).toBeGreaterThan(117.3 + 12);
    // A zone tab pads its title by 14 each side.
    expect(zoneTabWidth("Engine on each node")).toBeGreaterThan(141.3 + 26);
    expect(boundaryTabWidth("Network account")).toBeGreaterThan(109.4 + 22);
  });
});
