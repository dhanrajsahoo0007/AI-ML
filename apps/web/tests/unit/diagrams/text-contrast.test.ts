import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnimatedDiagram } from "@/components/diagrams/animated-diagram";
import { ANIMATED_SPECS } from "@/components/diagrams/animated-specs";
import { LAYOUT_ONLY_TONES, TONES, toneText } from "@/components/diagrams/diagram-style";
import { LayoutDiagram } from "@/components/diagrams/layout-diagram.client";
import { SequenceDiagram } from "@/components/diagrams/sequence-diagram.client";

// Tone-coloured diagram text is small (10.5 to 14 px), so WCAG AA asks 4.5:1. The strokes (`--dg-<tone>`) are
// below that for several tones in light mode, so text uses `--dg-<tone>-text`. This guards the token values in
// both themes and that no renderer paints text with a stroke token.

const CSS = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const ALL_TONES = [...TONES, ...LAYOUT_ONLY_TONES];
const AA = 4.5;

/** Custom properties of every top-level block with exactly this selector, later blocks winning. */
function themeVars(selector: ":root" | ".dark") {
  const vars = new Map<string, string>();
  const escaped = selector.replace(".", "\\.");
  for (const block of CSS.matchAll(new RegExp(`^${escaped} \\{([^}]*)\\}`, "gm"))) {
    for (const m of block[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars.set(m[1], m[2].trim());
  }
  return vars;
}

const LIGHT = themeVars(":root");
// Dark mode overrides the light values; anything it does not set falls through from :root.
const DARK = new Map([...LIGHT, ...themeVars(".dark")]);

function resolve(vars: Map<string, string>, name: string, seen = new Set<string>()): string {
  const value = vars.get(name);
  if (value === undefined) throw new Error(`${name} is not defined`);
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  if (!ref) return value;
  if (seen.has(name)) throw new Error(`${name} refers to itself`);
  return resolve(vars, ref[1], seen.add(name));
}

function luminance(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`expected a #rrggbb colour, got ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("diagram tone text contrast", () => {
  it("points toneText() at the -text token", () => {
    expect(toneText("orange")).toBe("var(--dg-orange-text)");
  });

  for (const [theme, vars] of [
    ["light", LIGHT],
    ["dark", DARK],
  ] as const) {
    describe(theme, () => {
      const paper = resolve(vars, "--paper");
      for (const tone of ALL_TONES) {
        it(`--dg-${tone}-text is AA on paper and on --dg-${tone}-soft`, () => {
          const text = resolve(vars, `--dg-${tone}-text`);
          const soft = resolve(vars, `--dg-${tone}-soft`);
          expect(contrast(text, paper), `${theme} ${tone} text ${text} on paper ${paper}`).toBeGreaterThanOrEqual(AA);
          expect(contrast(text, soft), `${theme} ${tone} text ${text} on soft ${soft}`).toBeGreaterThanOrEqual(AA);
        });
      }
    });
  }

  it("defines a -text token for every tone in both themes", () => {
    for (const tone of ALL_TONES) {
      expect(themeVars(":root").has(`--dg-${tone}-text`), `light --dg-${tone}-text`).toBe(true);
      expect(themeVars(".dark").has(`--dg-${tone}-text`), `dark --dg-${tone}-text`).toBe(true);
    }
  });
});

describe("diagram renderers", () => {
  // A text element (or the step bar's HTML label) painted with a bare stroke token: `fill:var(--dg-orange)`.
  const STROKE_ON_TEXT = /<(text|tspan|span)\b[^>]*style="[^"]*\b(fill|color):var\(--dg-[a-z]+\)(;|")/g;

  it("never colour text with a stroke token, in any spec", () => {
    const offenders: string[] = [];
    for (const [id, spec] of Object.entries(ANIMATED_SPECS)) {
      const html =
        spec.kind === "sequence"
          ? renderToStaticMarkup(createElement(SequenceDiagram, { spec }))
          : spec.kind === "layout"
            ? renderToStaticMarkup(createElement(LayoutDiagram, { spec }))
            : renderToStaticMarkup(createElement(AnimatedDiagram, { spec }));
      for (const m of html.matchAll(STROKE_ON_TEXT)) offenders.push(`${id}: ${m[0].slice(0, 120)}`);
    }
    expect(offenders).toEqual([]);
  });
});
