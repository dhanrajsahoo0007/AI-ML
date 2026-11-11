import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GLYPH_NAMES, Glyph, isGlyph, type GlyphName } from "@/components/diagrams/glyphs";
import type { Tone } from "@/components/diagrams/types";

const TONES: Tone[] = ["blue", "green", "orange", "red", "violet", "teal", "neutral"];

describe("diagram glyphs", () => {
  it("renders every glyph to SVG with at least one shape", () => {
    for (const name of GLYPH_NAMES) {
      const svg = renderToStaticMarkup(
        createElement(
          "svg",
          { viewBox: "0 0 48 48" },
          createElement(Glyph, { name, tone: "blue", cx: 24, cy: 24, size: 48 })
        )
      );
      expect(svg, name).toMatch(/<(path|rect|circle|ellipse)\b/);
      expect(svg, name).toContain("<g ");
    }
  });

  it("includes the full glyph set", () => {
    const expected: GlyphName[] = [
      "database",
      "cache",
      "queue",
      "blob",
      "cdn",
      "load-balancer",
      "phone",
      "server",
      "chat",
      "registry",
      "presence",
      "bell",
      "workers",
      "users",
      "gateway",
      "media",
      "history",
      "bag",
      "card",
      "dns",
      "lock",
      "key",
      "shield",
      "timer",
      "clock",
      "cpu",
      "gpu",
      "disk",
      "file",
      "folder",
      "log",
      "search",
      "tree",
      "map",
      "chart",
      "link",
      "globe",
      "robot",
      "feed",
      "video",
      "ticket",
      "ledger",
      "browser",
      "api",
      "coordinator",
      "trie",
      "hash",
      "ring",
      // Cloud curriculum batch.
      "firewall",
      "router",
      "nat",
      "tunnel",
      "building",
      "webhook",
      "image",
      "container",
      "pod",
      "node",
      "function",
      "controller",
      "folder-share",
      "appliance",
      "proxy",
      "partition",
      "topic",
      "snapshot",
      "vault",
      "certificate",
      "radar",
      "signal",
      "trace",
      "flag",
      "meter",
      "coin",
      "model",
      "policy",
      "pipeline",
    ];
    for (const name of expected) expect(GLYPH_NAMES, name).toContain(name);
    expect(GLYPH_NAMES).toHaveLength(expected.length);
    expect(new Set(GLYPH_NAMES).size).toBe(GLYPH_NAMES.length);
  });

  it("renders every glyph in every tone without throwing, coloured only through the tone's CSS variables", () => {
    for (const name of GLYPH_NAMES) {
      for (const tone of TONES) {
        const svg = renderToStaticMarkup(createElement(Glyph, { name, tone, cx: 24, cy: 24, size: 48 }));
        const at = `${name} (${tone})`;
        expect(svg, at).toMatch(/<(path|rect|circle|ellipse)\b/);
        // No hard-coded colours: no hex, rgb()/hsl() or named colour, so light and dark mode both work.
        expect(svg, at).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        expect(svg, at).not.toMatch(/\b(rgb|hsl)a?\(/);
        const paints = [...svg.matchAll(/(?:fill|stroke):([^;"]+)/g)].map((m) => m[1]);
        expect(paints.length, at).toBeGreaterThan(0);
        for (const paint of paints) {
          expect([`var(--dg-${tone})`, `var(--dg-${tone}-soft)`, "var(--paper)"], at).toContain(paint);
        }
        for (const [, value] of svg.matchAll(/\s(?:fill|stroke)="([^"]*)"/g)) expect(value, at).toBe("none");
        // Drawn shapes only: letters would not scale or translate with the rest of the glyph set.
        expect(svg, at).not.toContain("<text");
      }
    }
  });

  it("keeps every glyph's coordinates inside the 48 x 48 box", () => {
    for (const name of GLYPH_NAMES) {
      const svg = renderToStaticMarkup(createElement(Glyph, { name, tone: "blue", cx: 24, cy: 24, size: 48 }));
      const numbers = [...svg.matchAll(/\s(?:d|x|y|cx|cy)="([^"]*)"/g)].flatMap((m) =>
        // Arc commands carry radii, a rotation and two flags before the end point: keep the end point only.
        m[1]
          .replace(/A\s*[\d.]+\s+[\d.]+\s+[\d.]+\s+[01]\s+[01]\s+/g, "L")
          .split(/[^0-9.-]+/)
          .filter(Boolean)
          .map(Number)
      );
      expect(numbers.length, name).toBeGreaterThan(0);
      expect(Math.min(...numbers), name).toBeGreaterThanOrEqual(0);
      expect(Math.max(...numbers), name).toBeLessThanOrEqual(48);
    }
  });

  it("isGlyph accepts glyph names and rejects everything else", () => {
    expect(isGlyph("database")).toBe(true);
    expect(isGlyph("ring")).toBe(true);
    expect(isGlyph("folder-share")).toBe(true);
    expect(isGlyph("pipeline")).toBe(true);
    expect(isGlyph("not-a-glyph")).toBe(false);
    expect(isGlyph("")).toBe(false);
    expect(isGlyph(undefined)).toBe(false);
    // Prototype keys must not leak through the `in` check.
    expect(isGlyph("toString")).toBe(false);
  });
});
