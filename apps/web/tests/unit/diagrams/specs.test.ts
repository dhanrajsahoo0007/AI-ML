import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { lintSpec } from "@/components/diagrams/spec-lint";
import { buildView } from "@/components/diagrams/build-view";
import { ANIMATED_SPECS } from "@/components/diagrams/animated-specs";
import type { AnySpec } from "@/components/diagrams/types";

// Every spec under assets/diagrams/animated must pass lintSpec, and every one must be in the generated registry.

const ROOT = path.join(process.cwd(), "assets/diagrams/animated");

function specFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return specFiles(p);
    return e.name.endsWith(".ts") ? [p] : [];
  });
}

const files = specFiles(ROOT).sort();
const idOf = (file: string) =>
  `diagrams/animated/${path.relative(ROOT, file).replace(/\.ts$/, "").split(path.sep).join("/")}`;

describe("animated diagram specs", () => {
  it("finds the spec files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [idOf(f), f]))("%s passes lintSpec", async (_id, file) => {
    const mod = (await import(pathToFileURL(file).href)) as { default: AnySpec };
    expect(lintSpec(mod.default)).toEqual([]);
  });

  it("each architecture spec with steps shows something new at every step", () => {
    for (const [id, spec] of Object.entries(ANIMATED_SPECS)) {
      if (spec.kind === "sequence" || spec.kind === "layout") continue;
      (spec.steps ?? []).forEach((_, i) => {
        const view = buildView(spec, i + 1);
        const fresh = [...view.nodes, ...view.edges].filter((v) => v.phase === "new");
        expect(fresh.length, `${id} step ${i + 1}`).toBeGreaterThan(0);
      });
    }
  });
});
