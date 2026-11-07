import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// @core accessibility (plan §12.1): WCAG 2.2 AA checks on representative templates. Every violation is attached to
// the report; the test fails only on serious or critical violations that are not in the known baseline below.
const PAGES = [
  { name: "home", url: "/" },
  { name: "section hub", url: "/system-design" },
  { name: "article", url: "/ai-system-design/genai-system-design/advanced-rag" },
];

// Pre-existing serious/critical violations on `development` (2026-11-07), by axe rule id. Fix them, then delete the
// entry; new rules showing up here fail the test.
const KNOWN_VIOLATIONS: Record<string, string[]> = {};

for (const { name, url } of PAGES) {
  test(`a11y: ${name} (${url}) @core`, async ({ page }, testInfo) => {
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      examples: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
    }));
    await testInfo.attach("axe-violations.json", {
      body: JSON.stringify(summary, null, 2),
      contentType: "application/json",
    });
    for (const v of summary) {
      testInfo.annotations.push({ type: `axe:${v.impact}`, description: `${v.id} (${v.nodes} nodes): ${v.help}` });
    }

    const known = new Set(KNOWN_VIOLATIONS[url] ?? []);
    const blocking = summary.filter((v) => (v.impact === "serious" || v.impact === "critical") && !known.has(v.id));
    expect(blocking, `new serious/critical axe violations on ${url}`).toEqual([]);
  });
}
