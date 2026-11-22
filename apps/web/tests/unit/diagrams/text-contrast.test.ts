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
import { CLOUD_PROVIDERS, specKind, type DiagramSpec } from "@/components/diagrams/types";

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
        it(`--dg-${tone}-text is AA on paper and on every soft fill`, () => {
          const text = resolve(vars, `--dg-${tone}-text`);
          expect(contrast(text, paper), `${theme} ${tone} text ${text} on paper ${paper}`).toBeGreaterThanOrEqual(AA);
          // Its own soft fill (subnet titles) and any other tone's (a label or text shape inside another zone).
          for (const fillTone of ALL_TONES) {
            const soft = resolve(vars, `--dg-${fillTone}-soft`);
            expect(
              contrast(text, soft),
              `${theme} ${tone} text ${text} on ${fillTone} soft ${soft}`
            ).toBeGreaterThanOrEqual(AA);
          }
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
  // An HTML control with paper text on a solid stroke-token background (the cloud toggle).
  const PAPER_ON_STROKE_HTML = /<[a-z]+\b[^>]*\btext-paper\b[^>]*background:var\(--dg-[a-z]+\)(;|")[^>]*>/g;
  const SOLID_STROKE_FILL = /style="[^"]*\bfill:var\(--dg-[a-z]+\)(;|")/;
  const PAPER_TEXT = /^<text\b[^>]*style="[^"]*\bfill:var\(--paper\)/;

  /**
   * SVG groups that hold both a solid shape filled with a stroke token and paper text, as direct children: a tab,
   * tag, accent node or highlighted shape whose label would sit on the stroke colour (below 4.5:1 in light mode).
   * A translucent fill (fill-opacity, such as a weighted cell or the timeout bar) carries ink text and is allowed.
   */
  function paperOnStrokeFills(html: string) {
    const found: string[] = [];
    const stack: { fills: string[]; paperText: boolean }[] = [{ fills: [], paperText: false }];
    for (const [tag] of html.matchAll(/<\/?[a-zA-Z]+\b[^>]*>/g)) {
      if (tag.startsWith("</g")) {
        const frame = stack.pop()!;
        if (frame.paperText && frame.fills.length) found.push(...frame.fills.map((f) => f.slice(0, 120)));
      } else if (/^<g\b/.test(tag) && !tag.endsWith("/>")) {
        stack.push({ fills: [], paperText: false });
      } else if (/^<(rect|circle|ellipse|path|polygon)\b/.test(tag)) {
        if (SOLID_STROKE_FILL.test(tag) && !/fill-opacity/.test(tag)) stack.at(-1)!.fills.push(tag);
      } else if (PAPER_TEXT.test(tag)) {
        stack.at(-1)!.paperText = true;
      }
    }
    return found;
  }

  /** Every spec at its default view and at each build step, so NEW tags and step-only highlights render too. */
  function* renders(): Generator<[string, string]> {
    for (const [id, spec] of Object.entries(ANIMATED_SPECS)) {
      const steps = spec.steps?.length ?? 0;
      for (const step of [undefined, ...Array.from({ length: steps }, (_, i) => i + 1)]) {
        const at = step === undefined ? id : `${id} step ${step}`;
        if (spec.kind === "sequence") yield [at, renderToStaticMarkup(createElement(SequenceDiagram, { spec, step }))];
        else if (spec.kind === "layout") yield [at, renderToStaticMarkup(createElement(LayoutDiagram, { spec, step }))];
        else yield [at, renderToStaticMarkup(createElement(AnimatedDiagram, { spec, step }))];
      }
      // Specs with cloud refs also render with each provider on, so the Services toggle's active chip is checked.
      if (specKind(spec) === "architecture" && (spec as DiagramSpec).nodes.some((n) => n.cloud)) {
        for (const cloud of CLOUD_PROVIDERS) {
          const html = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: spec as DiagramSpec, cloud }));
          yield [`${id} cloud ${cloud}`, html];
        }
      }
    }
  }

  it("never colour text with a stroke token, nor put paper text on a solid stroke fill, in any spec", () => {
    const offenders = new Set<string>();
    let newTags = 0;
    let cloudChips = 0;
    for (const [at, html] of renders()) {
      for (const m of html.matchAll(STROKE_ON_TEXT)) offenders.add(`${at}: text ${m[0].slice(0, 120)}`);
      for (const m of html.matchAll(PAPER_ON_STROKE_HTML)) offenders.add(`${at}: control ${m[0].slice(0, 120)}`);
      for (const fill of paperOnStrokeFills(html)) offenders.add(`${at}: fill under paper text ${fill}`);
      if (html.includes('data-new="true"')) newTags++;
      if (/aria-pressed="true"[^>]*background:var\(--dg-/.test(html)) cloudChips++;
    }
    expect([...offenders]).toEqual([]);
    // The step and provider renders reach the NEW tags and the toggle's active chips, so the checks cover them.
    expect(newTags).toBeGreaterThan(0);
    expect(cloudChips).toBeGreaterThan(0);
  });
});
