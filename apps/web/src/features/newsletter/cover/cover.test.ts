import { describe, expect, it } from "vitest";
import { COVER_MOTIFS, COVER_PALETTES } from "./catalog";
import { MOTIFS } from "./motifs";
import { contrast, PALETTES } from "./palettes";
import { COVER_VARIANTS, renderCover, type CoverVariant } from "./render";
import { rng } from "./rng";

// The generative covers (plan §2): deterministic, complete, valid markup, readable titles.

const VARIANTS = Object.keys(COVER_VARIANTS) as CoverVariant[];

describe("cover renderer", () => {
  it("implements every motif and palette the frontmatter may name", () => {
    expect(Object.keys(MOTIFS).sort()).toEqual([...COVER_MOTIFS].sort());
    expect(Object.keys(PALETTES).sort()).toEqual([...COVER_PALETTES].sort());
  });

  it("the same spec draws the same cover; another seed draws another", () => {
    const spec = { motif: "harness-ring", palette: "dusk", seed: 7 } as const;
    expect(renderCover(spec, "card")).toBe(renderCover(spec, "card"));
    expect(renderCover({ ...spec, seed: 8 }, "card")).not.toBe(renderCover(spec, "card"));
  });

  it("the seeded generator is stable across runs", () => {
    const r = rng(42);
    expect([r(), r(), r()].map((n) => n.toFixed(6))).toEqual(
      (() => {
        const q = rng(42);
        return [q(), q(), q()].map((n) => n.toFixed(6));
      })()
    );
  });

  it("draws every motif × palette × variant as a well-formed SVG of the variant's size", () => {
    for (const motif of COVER_MOTIFS)
      for (const palette of COVER_PALETTES)
        for (const variant of VARIANTS) {
          const svg = renderCover({ motif, palette, seed: 3 }, variant, { grain: true, scrim: true });
          const { width, height } = COVER_VARIANTS[variant];
          expect(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"`)).toBe(true);
          expect(svg).not.toMatch(/NaN|undefined|Infinity/);
          // Every opened element is closed.
          const opens = (svg.match(/<[a-zA-Z][^>]*[^/]>/g) ?? []).length;
          const closes = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).length;
          expect(opens).toBe(closes);
        }
  });

  it("prefixes every id, so several covers can share a page", () => {
    const a = renderCover({ motif: "layers", palette: "sage", seed: 1 }, "card", { idPrefix: "a", grain: true });
    const ids = [...a.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id.startsWith("a-"))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("title text is readable on every palette (WCAG AA large text and better)", () => {
    for (const p of Object.values(PALETTES)) {
      for (const bg of p.bg) {
        expect(contrast(p.text, bg), `${p.name} title on ${bg}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.subtext, bg), `${p.name} subtext on ${bg}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
