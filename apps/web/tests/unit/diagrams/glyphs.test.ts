import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GLYPH_NAMES, Glyph, isGlyph, type GlyphName } from "@/components/diagrams/glyphs";

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
    ];
    for (const name of expected) expect(GLYPH_NAMES, name).toContain(name);
  });

  it("isGlyph accepts glyph names and rejects everything else", () => {
    expect(isGlyph("database")).toBe(true);
    expect(isGlyph("ring")).toBe(true);
    expect(isGlyph("not-a-glyph")).toBe(false);
    expect(isGlyph("")).toBe(false);
    expect(isGlyph(undefined)).toBe(false);
    // Prototype keys must not leak through the `in` check.
    expect(isGlyph("toString")).toBe(false);
  });
});
