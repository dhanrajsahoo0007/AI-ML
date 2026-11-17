import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { slugify } from "./doc-headings";
import { CASE_STUDIES, PRINCIPLES, PRINCIPLES_PAGE, principlesFor } from "./genai-principles";

const CONTENT = path.join(process.cwd(), "content");
const fileFor = (href: string) => path.join(CONTENT, href.slice(1) + ".mdx");
const read = (href: string) => fs.readFileSync(fileFor(href), "utf8");
const isOutline = (href: string) => /^status:\s*outline/m.test(read(href));
const used = [...new Set(PRINCIPLES.flatMap((p) => p.caseStudies))];

// The "### GenAI principles" table of a case study (plan §4.2 section 17).
const principlesTable = (text: string) => {
  const start = text.indexOf("\n### GenAI principles\n");
  if (start < 0) return "";
  const next = text.slice(start + 5).search(/\n##+ /);
  return next < 0 ? text.slice(start) : text.slice(start, start + 5 + next);
};

describe("GenAI principles catalog", () => {
  it("numbers the principles P1… in order with unique names and anchors", () => {
    expect(PRINCIPLES.map((p) => p.id)).toEqual(PRINCIPLES.map((_, i) => `P${i + 1}`));
    expect(new Set(PRINCIPLES.map((p) => p.name)).size).toBe(PRINCIPLES.length);
    expect(new Set(PRINCIPLES.map((p) => p.anchor)).size).toBe(PRINCIPLES.length);
    for (const p of PRINCIPLES) {
      expect(p.anchor, p.id).toBe(slugify(`${p.id} ${p.name}`));
      expect(p.line.length, p.id).toBeLessThanOrEqual(140);
      expect(p.teach.length, p.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("teaches each principle on concept pages that exist and are written", () => {
    const hrefs = [...new Set(PRINCIPLES.flatMap((p) => p.teach))];
    expect(hrefs.filter((h) => !fs.existsSync(fileFor(h)))).toEqual([]);
    expect(hrefs.filter((h) => isOutline(h))).toEqual([]);
  });

  it("lists only written case studies of the hub", () => {
    expect(used.filter((h) => !CASE_STUDIES.includes(h))).toEqual([]);
    expect(used.filter((h) => !fs.existsSync(fileFor(h)) || isOutline(h))).toEqual([]);
  });

  it("gives every written case study at least five principles, matching its GenAI principles table", () => {
    const violations: string[] = [];
    for (const href of CASE_STUDIES) {
      if (!fs.existsSync(fileFor(href)) || isOutline(href)) continue;
      const text = read(href);
      if (!/^updated:/m.test(text)) continue; // an old-format page, not converted yet
      const want = principlesFor(href).map((p) => p.anchor);
      if (want.length < 5) violations.push(`${href}: ${want.length} principles in the catalog (need 5+)`);
      const table = principlesTable(text);
      const linked = [...table.matchAll(new RegExp(`${PRINCIPLES_PAGE}#([a-z0-9-]+)\\)`, "g"))].map((m) => m[1]);
      for (const a of want) if (!linked.includes(a)) violations.push(`${href}: catalog lists #${a}, table does not`);
      for (const a of linked) if (!want.includes(a)) violations.push(`${href}: table links #${a}, catalog does not`);
    }
    expect(violations).toEqual([]);
  });

  it("has a heading on the principles page for every principle once that page is written", () => {
    if (!fs.existsSync(fileFor(PRINCIPLES_PAGE)) || isOutline(PRINCIPLES_PAGE)) return;
    const anchors = read(PRINCIPLES_PAGE)
      .split("\n")
      .filter((l) => /^#{2,3} /.test(l))
      .map((l) => slugify(l.replace(/^#+ /, "")));
    expect(PRINCIPLES.filter((p) => !anchors.includes(p.anchor)).map((p) => p.id)).toEqual([]);
  });

  it("uses every principle in at least two case studies once all eleven are written", () => {
    if (used.length < CASE_STUDIES.length) return;
    expect(PRINCIPLES.filter((p) => p.caseStudies.length < 2).map((p) => p.id)).toEqual([]);
  });
});
