import { describe, expect, it } from "vitest";
import { PAST_STEP_OPACITY, stepCount, stepsUsed, svgAtStep, svgComplete } from "./svg-steps";

const SVG = `<svg viewBox="0 0 10 10"><rect id="base"/><g data-step="1"><circle/></g><g class="x" data-step="2"><path/></g><path data-step="3" d="M0 0"/></svg>`;

describe("svg build-up steps", () => {
  it("counts steps on any element, including ones SVGO collapsed onto a lone child", () => {
    expect(stepsUsed(SVG)).toEqual([1, 2, 3]);
    expect(stepCount(SVG)).toBe(3);
    expect(stepCount("<svg><g/></svg>")).toBe(0);
  });

  it("hides later steps, fades earlier ones, marks the current one, keeps unmarked content", () => {
    const at2 = svgAtStep(SVG, 2);
    expect(at2).toContain('<rect id="base"/>');
    expect(at2).toContain(`<g data-step="1" opacity="${PAST_STEP_OPACITY}">`);
    expect(at2).toContain('<g class="x" data-step="2" data-step-current="true">');
    expect(at2).toContain('<path data-step="3" d="M0 0" display="none"/>');
  });

  it("step-only content shows at its own step and nowhere else", () => {
    const svg = `<svg><text data-step-only="1">one</text><text data-step-only="2">two</text><g data-step="2"/></svg>`;
    expect(stepsUsed(svg)).toEqual([1, 2]);
    const at1 = svgAtStep(svg, 1);
    expect(at1).toContain('<text data-step-only="1">one</text>');
    expect(at1).toContain('<text data-step-only="2" display="none">two</text>');
    expect(svgAtStep(svg, 2)).toContain('<text data-step-only="1" display="none">one</text>');
  });

  it("the last step shows everything", () => {
    expect(svgAtStep(SVG, 3)).not.toContain('display="none"');
  });

  it("the complete figure draws every step unfaded, with only the last step's caption", () => {
    const svg = `<svg><g data-step="1"/><g data-step="2"/><text data-step-only="1">one</text><text data-step-only="2">two</text></svg>`;
    const all = svgComplete(svg);
    expect(all).not.toContain("opacity=");
    expect(all).toContain('<g data-step="1"/>');
    expect(all).toContain('<text data-step-only="1" display="none">one</text>');
    expect(all).toContain('<text data-step-only="2">two</text>');
    expect(svgComplete("<svg><g/></svg>")).toBe("<svg><g/></svg>");
  });
});
