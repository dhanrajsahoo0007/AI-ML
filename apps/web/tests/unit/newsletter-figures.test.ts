import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { figures as evals } from "../../design/newsletter-figures/evals-for-llm-apps";
import { figures as tuning } from "../../design/newsletter-figures/is-fine-tuning-dead";
import { figures as jepa } from "../../design/newsletter-figures/jepa-explained";
import { figures as harness } from "../../design/newsletter-figures/harness-engineering";
import { figures as loop } from "../../design/newsletter-figures/loop-engineering";
import { wrap } from "../../design/newsletter-figures/kit";
import { sidecarSchema } from "../../src/lib/asset-schema";
import { stepsUsed } from "../../src/lib/svg-steps";

// Newsletter figures are generated from design/newsletter-figures/<issue>.ts (content/newsletter/FIGURES.md).
// The committed SVGs must match the code, so nobody hand-edits a generated file and loses it on the next run.

const ISSUES = {
  "harness-engineering": harness,
  "loop-engineering": loop,
  "evals-for-llm-apps": evals,
  "is-fine-tuning-dead": tuning,
  "jepa-explained": jepa,
};
const DIR = path.join(process.cwd(), "assets", "diagrams", "svg", "newsletter");

describe("newsletter figures", () => {
  for (const [issue, figs] of Object.entries(ISSUES)) {
    for (const f of figs) {
      it(`${issue}/${f.slug} is up to date with its code (npm run figures:newsletter -w web)`, () => {
        const file = path.join(DIR, issue, `${f.slug}.svg`);
        expect(fs.readFileSync(file, "utf8")).toBe(f.svg());
      });

      it(`${issue}/${f.slug} has a valid sidecar and readable text`, () => {
        const meta = sidecarSchema.parse(
          yaml.load(fs.readFileSync(path.join(DIR, issue, `${f.slug}.meta.yaml`), "utf8"))
        );
        expect(meta.alt && meta.caption).toBeTruthy();
        const svg = f.svg();
        // Phone-readable: no text under 24 px on the 1080-wide canvas.
        const sizes = [...svg.matchAll(/font-size="(\d+)"/g)].map((m) => Number(m[1]));
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24);
        // Steps, when used, run 1…n with no gaps.
        const steps = stepsUsed(svg);
        expect(steps).toEqual(steps.map((_, i) => i + 1));
      });
    }
  }

  it("wraps text at word boundaries", () => {
    expect(wrap("the harness checks the proposal", 14)).toEqual(["the harness", "checks the", "proposal"]);
  });
});
