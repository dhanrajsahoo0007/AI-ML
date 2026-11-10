import { describe, expect, it } from "vitest";
import { NEWSLETTER_KIND } from "./kind";
import { issueSeo } from "./seo";
import { loadIssues } from "./source";
import { sectionOfKind } from "../sections/registry";
import { absoluteUrl } from "../seo/site";

describe("newsletter issue SEO", () => {
  const section = sectionOfKind(NEWSLETTER_KIND);
  const issues = loadIssues(section);

  it("shares every issue with its own cover card, not the site's", () => {
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      const { metadata } = issueSeo(section, issue);
      const expected = absoluteUrl(`${issue.href}/opengraph-image`);
      expect(metadata.openGraph?.images).toMatchObject([{ url: expected, width: 1200, height: 630 }]);
      expect(metadata.twitter?.images).toMatchObject([{ url: expected }]);
    }
  });
});
