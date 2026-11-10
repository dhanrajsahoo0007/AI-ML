import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getTerm } from "@/lib/glossary";

// <Term id="..."> with an id missing from the glossary (content/<section>/glossary.yaml of the section with
// `glossary: true`) fails the production build. This test catches it earlier, in `npm test`.

const CONTENT = path.resolve(__dirname, "../../../content");

function mdxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return mdxFiles(full);
    return e.name.endsWith(".mdx") ? [full] : [];
  });
}

/** Ids used as <Term id="..."> (or id='...') in one MDX source, with their line numbers. */
function termIds(source: string): { id: string; line: number }[] {
  const out: { id: string; line: number }[] = [];
  source.split("\n").forEach((text, i) => {
    for (const m of text.matchAll(/<Term\s+id=["']([^"']+)["']/g)) out.push({ id: m[1], line: i + 1 });
  });
  return out;
}

describe("termIds", () => {
  it("finds every <Term> id on a line", () => {
    expect(termIds(`A <Term id="cache" /> and <Term id='ttl'>expiry</Term>.\n<Terms id="x" />`)).toEqual([
      { id: "cache", line: 1 },
      { id: "ttl", line: 1 },
    ]);
  });
});

describe("<Term> ids in content", () => {
  it("all exist in the glossary", () => {
    const missing: string[] = [];
    for (const file of mdxFiles(CONTENT)) {
      for (const { id, line } of termIds(fs.readFileSync(file, "utf8"))) {
        if (!getTerm(id)) missing.push(`${path.relative(CONTENT, file)}:${line}: unknown glossary id "${id}"`);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });
});
