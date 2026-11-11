import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sectionOfKind } from "../sections/registry";
import { outlineStatement, problemEditorial, problemStatement } from "./mdx";
import { loadDsaItems, validOutlines, validProblems } from "./source";

// Every problem's statement AND editorial compile and render with the components mdx.tsx provides. Pages compile
// premium editorials for nobody, so without this a broken premium editorial would only fail when it is released.

const problems = validProblems(loadDsaItems(sectionOfKind("problems")));

describe("problem MDX compiles", () => {
  for (const p of problems) {
    it(`${p.slug}: statement and editorial`, async () => {
      expect(renderToStaticMarkup(await problemStatement(p)).length, "statement").toBeGreaterThan(0);
      const editorial = await problemEditorial(p);
      expect(editorial, "editorial after <PremiumBreak/>").not.toBeNull();
      expect(renderToStaticMarkup(editorial!).length, "editorial").toBeGreaterThan(0);
    });
  }
});

// Outlines are generated from the owner's notes, so their text is escaped by a script: every one must compile.
describe("outline MDX compiles", () => {
  const outlines = validOutlines(loadDsaItems(sectionOfKind("problems")));
  it(`all ${outlines.length} outlines compile and render`, async () => {
    const failed: string[] = [];
    for (const o of outlines) {
      try {
        if (renderToStaticMarkup(await outlineStatement(o.file)).length === 0) failed.push(`${o.slug}: empty`);
      } catch (e) {
        failed.push(`${o.slug}: ${(e as Error).message.split("\n")[0]}`);
      }
    }
    expect(failed).toEqual([]);
  }, 120_000);
});
