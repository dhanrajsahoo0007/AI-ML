import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { FORMATS } from "../../src/features/newsletter/schema";
import { NEWSLETTER_KIND, newsletterKind } from "../../src/features/newsletter/kind";
import { readIssueFile } from "../../src/features/newsletter/source";
import { sectionOfKind } from "../../src/features/sections/registry";

// content/newsletter/_TEMPLATE.md is what every new issue starts from: it must stay valid, with every heading the
// deep-dive format requires, or new issues start broken.

const TEMPLATE = path.join(process.cwd(), "content", "newsletter", "_TEMPLATE.md");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "newsletter-template-"));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe("newsletter issue template", () => {
  const file = path.join(tmp, "template-check.mdx");
  fs.copyFileSync(TEMPLATE, file);
  const section = sectionOfKind(NEWSLETTER_KIND);
  const issue = readIssueFile(section, file, "2026");

  it("passes the newsletter's checks with no errors or warnings", async () => {
    const problems = await newsletterKind.validate(section, [issue]);
    expect(problems.map((p) => `${p.level}: ${p.message}`)).toEqual([]);
  });

  it("has every heading the deep-dive format requires, in order", () => {
    const headings = [...issue.body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    const found = FORMATS["deep-dive"].requiredHeadings.map((h) => headings.findIndex((x) => x.startsWith(h)));
    expect(found.every((i) => i >= 0)).toBe(true);
    expect(found).toEqual([...found].sort((a, b) => a - b));
  });

  it("is never loaded as an issue", () => {
    expect(path.extname(TEMPLATE)).toBe(".md");
    expect(path.dirname(TEMPLATE).endsWith(path.join("content", "newsletter"))).toBe(true);
  });
});
