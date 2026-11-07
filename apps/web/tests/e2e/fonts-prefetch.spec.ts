import { expect, test, type Page } from "@playwright/test";

// Plan §6 P6 and P8: pages load only Inter and JetBrains Mono (Inter preloaded), and section pages carry a
// Speculation Rules script that prefetches same-section links. Runs against a production build.

const ARTICLE = "/system-design/databases/b-trees"; // has h2s and a code block, no math (KaTeX fonts are separate)
const HUB = "/system-design";
const ALLOWED_FAMILIES = ["Inter", "JetBrains Mono"];

/** Maps every @font-face src URL in the page's stylesheets to its family name. */
function fontFaceFamilies(page: Page) {
  return page.evaluate(() => {
    const out: Record<string, string> = {};
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const family = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
        for (const m of rule.style.getPropertyValue("src").matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
          out[new URL(m[1], location.href).pathname] = family;
        }
      }
    }
    return out;
  });
}

test.describe("fonts @core", () => {
  for (const path of ["/", HUB, ARTICLE]) {
    test(`${path} loads only Inter and JetBrains Mono`, async ({ page }) => {
      const fontRequests: string[] = [];
      page.on("request", (req) => {
        if (req.resourceType() === "font") fontRequests.push(new URL(req.url()).pathname);
      });
      await page.goto(path, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState("networkidle");

      const families = await fontFaceFamilies(page);
      const declared = new Set(Object.values(families));
      expect([...declared].sort(), "declared @font-face families").toEqual(ALLOWED_FAMILIES);

      expect(fontRequests.length, "font requests").toBeGreaterThan(0);
      for (const url of fontRequests) {
        expect(ALLOWED_FAMILIES, `family of ${url}`).toContain(families[url]);
      }

      // Only Inter is preloaded.
      const preloads = await page
        .locator('link[rel="preload"][as="font"]')
        .evaluateAll((links) => links.map((l) => new URL((l as HTMLLinkElement).href).pathname));
      expect(preloads.length, "font preloads").toBeGreaterThan(0);
      for (const url of preloads) expect(families[url], `family of preload ${url}`).toBe("Inter");
    });
  }

  test("headings and body use Inter, code uses JetBrains Mono", async ({ page }) => {
    await page.goto(ARTICLE);
    const family = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(await family("h1")).toMatch(/^['"]?Inter\b/);
    expect(await family("article h2")).toMatch(/^['"]?Inter\b/);
    expect(await family("article p")).toMatch(/^['"]?Inter\b/);
    expect(await family("article pre code")).toMatch(/^['"]?JetBrains Mono\b/);
  });
});

interface Rule {
  source: string;
  eagerness: string;
  where: unknown;
}

async function speculationRules(page: Page): Promise<{ prefetch: Rule[] }[]> {
  const scripts = await page.locator('script[type="speculationrules"]').allTextContents();
  return scripts.map((text) => JSON.parse(text) as { prefetch: Rule[] });
}

test.describe("speculation rules @core", () => {
  for (const path of [HUB, ARTICLE]) {
    test(`${path} prefetches same-section links on hover`, async ({ page }) => {
      await page.goto(path);
      const rules = await speculationRules(page);
      expect(rules).toHaveLength(1);
      const [rule] = rules[0].prefetch;
      expect(rule).toMatchObject({ source: "document", eagerness: "moderate" });

      const where = JSON.stringify(rule.where);
      expect(where).toContain(`"href_matches":"${HUB}/*"`);
      expect(where).toContain('a[rel~=\\"prev\\"]');
      for (const excluded of ["/api", "/account", "/pricing"]) {
        expect(where).toContain(`{"not":{"href_matches":"${excluded}/*"}}`);
      }
      // Relative patterns only: nothing points at another origin.
      expect(where).not.toMatch(/https?:/);
    });
  }

  test("pages outside a docs section have none", async ({ page }) => {
    await page.goto("/");
    expect(await speculationRules(page)).toEqual([]);
  });
});
