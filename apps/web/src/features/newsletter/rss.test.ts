import { describe, expect, it } from "vitest";
import { buildRss } from "./rss";
import { loadIssues } from "./source";
import { sectionOfKind } from "../sections/registry";
import { NEWSLETTER_KIND } from "./kind";

const BODY_CANARY = "canary-body-text-7f3a";

const issues = [
  {
    title: "Sent <one>",
    href: "/n/sent-one",
    date: "2026-11-01",
    summary: "Summary & more",
    status: "sent" as const,
    body: BODY_CANARY,
  },
  {
    title: "Draft two",
    href: "/n/draft-two",
    date: "2026-11-08",
    summary: "Not yet",
    status: "draft" as const,
    body: BODY_CANARY,
  },
  {
    title: "Scheduled",
    href: "/n/scheduled",
    date: "2026-11-09",
    summary: "Soon",
    status: "scheduled" as const,
    body: BODY_CANARY,
  },
];

describe("newsletter RSS", () => {
  const xml = buildRss({ title: "Feed", description: "Desc", path: "/n" }, issues);

  it("lists sent issues only", () => {
    expect(xml.match(/<item>/g)).toHaveLength(1);
    expect(xml).not.toContain("Draft two");
    expect(xml).not.toContain("Scheduled");
  });

  it("carries titles, links and summaries, never the body", () => {
    expect(xml).toContain("<title>Sent &lt;one&gt;</title>");
    expect(xml).toContain("<description>Summary &amp; more</description>");
    expect(xml).not.toContain(BODY_CANARY);
    expect(xml).not.toMatch(/content:encoded/);
  });

  it("has no body text of any real issue", () => {
    const section = sectionOfKind(NEWSLETTER_KIND);
    const real = loadIssues(section).map((i) => ({ ...i, status: "sent" as const }));
    const feed = buildRss({ title: "Feed", description: "Desc", path: section.href }, real);
    for (const issue of real) {
      // A distinctive sentence from the body (the first long paragraph line) must not appear.
      const line = issue.body.split("\n").find((l) => l.trim().length > 60 && !l.startsWith("#"));
      expect(line).toBeDefined();
      expect(feed).not.toContain(line!.trim().slice(0, 50));
      expect(feed).toContain(issue.title.replace(/&/g, "&amp;"));
    }
  });
});
