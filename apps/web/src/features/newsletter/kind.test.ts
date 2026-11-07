import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { sectionOfKind } from "../sections/registry";
import { NEWSLETTER_KIND, newsletterKind } from "./kind";
import { isBuilt, loadIssues, readIssueFile } from "./source";

const section = sectionOfKind(NEWSLETTER_KIND);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "newsletter-kind-"));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

function fixture(name: string, year: string, frontmatter: string, body = "Hello.\n") {
  const dir = path.join(tmp, year);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.mdx`);
  fs.writeFileSync(file, `---\n${frontmatter.trim()}\n---\n\n${body}`);
  return readIssueFile(section, file, year);
}

const base = (extra = "") => `title: "T"\ndate: "2026-11-07"\nsummary: "S"\naccess: free\naudience: all\n${extra}`;
const messages = async (issue: ReturnType<typeof fixture>) =>
  (await newsletterKind.validate(section, [issue])).map((e) => `${e.level}: ${e.message}`);

describe("newsletter kind", () => {
  it("the sample issue is valid and links to existing articles", async () => {
    const items = await newsletterKind.load(section);
    expect(items.length).toBeGreaterThan(0);
    const errors = (await newsletterKind.validate(section, items)).filter((e) => e.level === "error");
    expect(errors).toEqual([]);
  });

  it("sitemap and search list sent issues only; search carries the summary, not the body", () => {
    const sent = fixture("sent-one", "2026", base("status: sent"), "Body text that must stay out.\n");
    const draft = fixture("draft-one", "2026", base("status: draft"));
    expect(newsletterKind.sitemap(section, [sent, draft]).map((e) => e.url)).toEqual([section.href, sent.href]);
    const docs = newsletterKind.search(section, [sent, draft]);
    expect(docs).toEqual([{ href: sent.href, title: "T", description: "S", section: section.key }]);
    expect(JSON.stringify(docs)).not.toContain("Body text");
    expect(newsletterKind.counts([sent, draft])).toEqual({ written: 1, outline: 1 });
  });

  it("drafts get a review page outside production only", () => {
    const draft = fixture("draft-two", "2026", base("status: draft"));
    expect(isBuilt(draft, "preview")).toBe(true);
    expect(isBuilt(draft, "production")).toBe(false);
    expect(isBuilt({ status: "sent" }, "production")).toBe(true);
  });

  it("access comes from frontmatter, else the section default", () => {
    const premium = fixture("premium-one", "2026", base("status: sent").replace("access: free", "access: premium"));
    expect(newsletterKind.access(section, premium)).toBe("premium");
  });

  it("reports invalid frontmatter", async () => {
    const bad = fixture("bad-fm", "2026", `title: "T"\ndate: "7 Nov"\nstatus: published\nextra: 1`);
    const out = await messages(bad);
    expect(out.some((m) => m.includes("date"))).toBe(true);
    expect(out.some((m) => m.includes("status"))).toBe(true);
    expect(out.some((m) => m.includes("summary"))).toBe(true);
    expect(out.some((m) => /extra/.test(m))).toBe(true);
  });

  it("scheduled issues need a sendAt in the future", async () => {
    expect(await messages(fixture("no-send-at", "2026", base("status: scheduled")))).toContainEqual(
      expect.stringContaining("scheduled issues need sendAt")
    );
    const past = fixture("past", "2026", base(`status: scheduled\nsendAt: "2020-01-01T09:00:00Z"`));
    expect((await messages(past)).join("\n")).toMatch(
      /error: scheduled for 2020-01-01T09:00:00.000Z, which has passed/
    );
    const future = fixture("future", "2026", base(`status: scheduled\nsendAt: "2999-01-01T09:00:00Z"`));
    expect(await messages(future)).toEqual([]);
  });

  it("internal links must resolve; images must be PNG; only Markdown", async () => {
    const issue = fixture(
      "links",
      "2026",
      base("status: draft"),
      [
        "[ok](/system-design/databases/b-trees) [home](/) [pricing](/pricing#plans)",
        "[broken](/system-design/no-such-page)",
        "[insecure](http://example.com)",
        "![diagram](/img/diagram.svg) ![ok](https://cdn.example/x.png)",
        "<Callout>hi</Callout>",
        "```tsx\n<NotRendered />\n```",
      ].join("\n\n")
    );
    const out = await messages(issue);
    expect(out).toEqual([
      "error: <Callout> is not allowed in an issue: issues are Markdown so they render to email too",
      "error: image /img/diagram.svg must be a PNG (email clients)",
      "error: broken internal link /system-design/no-such-page",
      "error: link http://example.com must use https",
    ]);
  });

  it("checks the year folder and duplicate slugs", async () => {
    const a = fixture("same", "2025", base("status: draft"));
    const b = fixture("same", "2026", base("status: draft"));
    const out = (await newsletterKind.validate(section, [a, b])).map((e) => e.message);
    expect(out).toContain("date 2026-11-07 is not in the 2025 folder");
    expect(out.some((m) => m.startsWith("slug same is also used by"))).toBe(true);
  });

  it("nav groups issues by year with draft status", () => {
    const items = loadIssues(section);
    const nav = newsletterKind.nav(section, items);
    expect(nav.href).toBe(section.href);
    expect(nav.comingSoon).toBeUndefined();
    expect(nav.groups.flatMap((g) => g.items ?? []).length).toBe(items.filter((i) => isBuilt(i)).length);
  });
});
