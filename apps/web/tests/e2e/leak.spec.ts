import fs from "node:fs";
import { expect, test } from "@playwright/test";
import matter from "gray-matter";
import { frontmatterSchema } from "../../src/features/sections/schema";
import { loadBuiltRoutes } from "./support/built-routes";
import {
  ANY_CANARY,
  fetchPageSurfaces,
  LEAK_FIXTURE,
  NON_ENTITLED_VISITORS,
  publicOutputDirs,
  readCanary,
  scanDir,
  scanText,
  SITE_FILES,
  type Hit,
} from "./support/leak-scan";

// @leak paywall leak suite, scaffold (plan §12.4). Today no premium article is gated yet (Phase 5), so the fixture
// premium article in tests/fixtures/leak-canary/ is not part of the build: these tests prove the scanners cover
// every public surface and that no canary reaches it. In Phase 5 the seed builds the fixture into a premium
// section with a fresh canary, and the "pro user" half below is switched on.

const CANARY = readCanary();
/** Where the seed will publish the fixture in Phase 5. Requested now too: it must not exist or leak. */
const FIXTURE_ROUTE = "/system-design/leak-canary/premium-article";
const { ok } = loadBuiltRoutes();

const report = (hits: Hit[]) => hits.map((h) => `${h.where}: …${h.excerpt}…`);

test.describe("paywall leak suite (scaffold) @leak @core", () => {
  test("the fixture is a premium article with a canary in its premium body", () => {
    const { data, content } = matter(fs.readFileSync(LEAK_FIXTURE, "utf8"));
    expect(frontmatterSchema.parse(data).access).toBe("premium");
    expect(CANARY).toMatch(ANY_CANARY);
    const premiumBody = content.slice(content.indexOf("## Premium body"));
    expect(premiumBody).toContain(CANARY);
  });

  test("no canary in any public build output (.next/static, public/, .open-next/assets)", () => {
    test.skip(!!process.env.E2E_BASE_URL, "needs a local build");
    expect(report(publicOutputDirs().flatMap((dir) => scanDir(dir, ANY_CANARY)))).toEqual([]);
  });

  for (const visitor of NON_ENTITLED_VISITORS) {
    test(`${visitor.name}: the fixture route and site files never carry the canary`, async ({ request }) => {
      const hits: Hit[] = [];
      for (const s of await fetchPageSurfaces(request, FIXTURE_ROUTE, visitor)) {
        hits.push(...scanText(s.body, ANY_CANARY, `${s.surface} ${s.url} (${s.status})`));
      }
      for (const url of SITE_FILES) {
        const res = await request.get(url, { headers: visitor.headers });
        expect(res.status(), url).toBe(200);
        hits.push(...scanText(await res.text(), ANY_CANARY, url));
      }
      expect(report(hits)).toEqual([]);
    });
  }

  // Every built page through every surface, anonymous and with a forged cookie.
  const CHUNK = 50;
  for (let i = 0; i < ok.length; i += CHUNK) {
    const urls = ok.slice(i, i + CHUNK);
    test(`pages ${i + 1}–${i + urls.length} of ${ok.length}: HTML, RSC and prefetch carry no canary`, async ({
      request,
    }) => {
      const hits: Hit[] = [];
      for (const url of urls) {
        for (const visitor of NON_ENTITLED_VISITORS) {
          for (const s of await fetchPageSurfaces(request, url, visitor)) {
            expect(s.status, `${visitor.name} ${s.surface} ${s.url}`).toBe(200);
            hits.push(...scanText(s.body, ANY_CANARY, `${visitor.name} ${s.surface} ${s.url}`));
          }
        }
      }
      expect(report(hits)).toEqual([]);
    });
  }

  // Phase 5: sign in as the seeded pro user (test login, plan §12.3) and assert the canary IS on the page, so the
  // suite can't pass by never rendering premium bodies at all.
  test.fixme("pro user: the fixture article shows the canary", async ({ page }) => {
    await page.goto(FIXTURE_ROUTE);
    await expect(page.getByText(CANARY)).toBeVisible();
  });
  test.fixme("free and expired-pro users: no canary on any surface", async () => {});
});

test.describe("no ways to copy or export article content (plan §11.10) @leak @core", () => {
  const ARTICLE = ok.find((r) => r.split("/").length >= 4 && r.startsWith("/ai-system-design/")) ?? "/";

  test("articles have no Copy-for-LLM or copy-markdown control", async ({ page }) => {
    await page.goto(ARTICLE);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /copy (for llm|as markdown|markdown|page)/i })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /copy (for llm|as markdown|markdown|page)|view markdown/i })
    ).toHaveCount(0);
    expect(await page.content()).not.toMatch(/copy for llm/i);
  });

  test("the raw-markdown endpoints are gone", async ({ request }) => {
    const slug = ARTICLE.replace(/^\//, "");
    for (const url of ["/api/markdown", `/api/markdown/${slug}`, `/api/markdown?path=${ARTICLE}`, `${ARTICLE}.md`]) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(404);
    }
  });
});
