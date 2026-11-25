import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { TEMPLATE_PAGES } from "./support/templates";

// @a11y accessibility (plan §12.1): WCAG 2.2 AA checks on the key templates (home, hub, article with diagrams,
// interview subsection, pricing, legal) plus the section indexes, in light and dark. Every violation is attached
// to the report; the test fails only on serious or critical violations that are not in the known list below.
const PAGES = [
  ...TEMPLATE_PAGES,
  { name: "interviews index", url: "/interviews" },
  { name: "companies", url: "/companies" },
  { name: "article", url: "/ai-system-design/genai-system-design/advanced-rag" },
];

// Known serious/critical violations, by URL and axe rule id. Keep empty when clean.
const KNOWN_VIOLATIONS: Record<string, { rule: string; todo: string }[]> = {};

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const { name, url } of PAGES) {
      test(`a11y: ${name} (${url}) @a11y @core`, async ({ page }, testInfo) => {
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

        const known = KNOWN_VIOLATIONS[url] ?? [];
        for (const k of known) {
          testInfo.annotations.push({ type: "known-a11y-issue", description: `${k.rule}: TODO ${k.todo}` });
          if (!summary.some((v) => v.id === k.rule)) {
            testInfo.annotations.push({ type: "fixed?", description: `${k.rule} no longer fires on ${url}` });
          }
        }
        const blocking = summary.filter(
          (v) => (v.impact === "serious" || v.impact === "critical") && !known.some((k) => k.rule === v.id)
        );
        expect(blocking, `new serious/critical axe violations on ${url} (${scheme})`).toEqual([]);
      });
    }
  });
}
