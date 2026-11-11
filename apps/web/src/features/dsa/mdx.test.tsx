import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sectionOfKind } from "../sections/registry";
import { problemEditorial, problemStatement } from "./mdx";
import { loadDsaItems, validProblems } from "./source";

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
