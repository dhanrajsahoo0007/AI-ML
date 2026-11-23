import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Display math in the content is a `$$` line, the formula, and a closing `$$` line, with nothing else between them.
// A list marker or a blank line inside the block (what reformatting a page into bullets does) ends the math early, so
// MDX reads the formula's braces as JavaScript and the page fails to compile: "Could not parse expression with
// acorn". `npm run build` stops on it, which kept every deploy of development from reaching staging.

function mdxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? mdxFiles(p) : e.name.endsWith(".mdx") ? [p] : [];
  });
}

/** Problems with the `$$` blocks of one document, as "line N: what". */
export function mathBlockProblems(text: string): string[] {
  const problems: string[] = [];
  let openedAt = 0;
  text.split("\n").forEach((line, i) => {
    if (/^\s*\$\$\s*$/.test(line)) {
      openedAt = openedAt ? 0 : i + 1;
    } else if (openedAt && line.trim() === "") {
      problems.push(`line ${i + 1}: blank line inside the $$ block opened at line ${openedAt}`);
    } else if (openedAt && /^\s*([-*+]|\d+\.)\s/.test(line)) {
      problems.push(`line ${i + 1}: list marker inside the $$ block opened at line ${openedAt}`);
    }
  });
  if (openedAt) problems.push(`line ${openedAt}: $$ block is never closed`);
  return problems;
}

describe("display math blocks", () => {
  it("flags a bullet and blank lines inside a block, and an unclosed block", () => {
    const broken = ["2. Objective", "", "   $$", "", "- \\max_{\\pi}\\; v(x)", "", "   $$"].join("\n");
    expect(mathBlockProblems(broken)).toEqual([
      "line 4: blank line inside the $$ block opened at line 3",
      "line 5: list marker inside the $$ block opened at line 3",
      "line 6: blank line inside the $$ block opened at line 3",
    ]);
    expect(mathBlockProblems("$$\nx = 1")).toEqual(["line 1: $$ block is never closed"]);
  });

  it("accepts a block inside a list item and two blocks in a row", () => {
    const ok = ["5. GRPO", "", "   $$", "   A_i = \\frac{r_i - m}{s}", "   $$", "", "   $$", "   J = 1", "   $$"].join(
      "\n"
    );
    expect(mathBlockProblems(ok)).toEqual([]);
  });

  it("holds in every page of the content", () => {
    const content = path.join(process.cwd(), "content");
    const found = mdxFiles(content).flatMap((f) =>
      mathBlockProblems(fs.readFileSync(f, "utf8")).map((p) => `${path.relative(content, f)} ${p}`)
    );
    expect(found).toEqual([]);
  });
});
