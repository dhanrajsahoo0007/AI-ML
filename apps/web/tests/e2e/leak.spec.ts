import fs from "node:fs";
import { expect, test } from "@playwright/test";
import matter from "gray-matter";
import { frontmatterSchema } from "../../src/features/sections/schema";
import { dbE2E, loginAs, origin, reseed, SKIP_REASON } from "../fixtures/users";
import {
  canSign,
  expiredEntitlement,
  foreignKidEntitlement,
  paywallBuilt,
  signedEntitlement,
} from "../fixtures/paywall";
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
  type Visitor,
} from "./support/leak-scan";

// @leak paywall leak suite (plan §9.4, §12.4). The premium fixture article in tests/fixtures/content/ carries a
// canary in its premium body and is built into every non-production build. Without a valid Pro entitlement
// (no cookie, a forged cookie, an expired or free-tier cookie, a cookie from an unknown key, and free and
// expired-Pro sessions when E2E_DB=1), the canary must not appear in any HTML, RSC or prefetch response, direct
// .html/.rsc/.txt paths, the preview, the sitemap, robots.txt, OG images or any public build output; with a
// valid Pro cookie it must appear, so the suite can't pass by never rendering premium bodies.

const CANARY = readCanary();
const FIXTURE_ROUTE = "/system-design/leak-canary/premium-article";
const { ok } = loadBuiltRoutes();
const fixtureBuilt = ok.includes(FIXTURE_ROUTE);

const report = (hits: Hit[]) => hits.map((h) => `${h.where}: …${h.excerpt}…`);

/** Signed-cookie visitors need the server's ENTITLEMENT_SECRET; added only when the run has it. */
async function signedVisitors(): Promise<Visitor[]> {
  if (!canSign()) return [];
  return [
    { name: "expired signed cookie", headers: { cookie: await expiredEntitlement() } },
    { name: "free-tier cookie", headers: { cookie: await signedEntitlement({ tier: "free" }) } },
    { name: "unknown-kid cookie", headers: { cookie: await foreignKidEntitlement() } },
  ];
}

/** Paths around the fixture that must never carry its premium body. */
const EXTRA_PATHS = [
  `${FIXTURE_ROUTE}/_preview`,
  `${FIXTURE_ROUTE}.html`,
  `${FIXTURE_ROUTE}.rsc`,
  `${FIXTURE_ROUTE}.txt`,
  `${FIXTURE_ROUTE}/index.rsc`,
  "/system-design/opengraph-image",
  `${FIXTURE_ROUTE}/opengraph-image`,
  "/_next/data/leak/system-design/leak-canary/premium-article.json",
  "/cdn-cgi/_next_cache/",
  "/api/markdown/system-design/leak-canary/premium-article",
];

test.describe("paywall leak suite @leak @core", () => {
  test("the fixture is a premium article with a canary in its premium body", () => {
    const { data, content } = matter(fs.readFileSync(LEAK_FIXTURE, "utf8"));
    expect(frontmatterSchema.parse(data).access).toBe("premium");
    expect(CANARY).toMatch(ANY_CANARY);
    const premiumBody = content.slice(content.indexOf("## Premium body"));
    expect(premiumBody).toContain(CANARY);
  });

  test("the fixture is built exactly where the paywall is on (never in production)", () => {
    test.skip(!!process.env.E2E_BASE_URL, "needs a local build");
    expect(fixtureBuilt).toBe(paywallBuilt());
  });

  test("no canary in any public build output (.next/static, public/, .open-next/assets)", () => {
    test.skip(!!process.env.E2E_BASE_URL, "needs a local build");
    expect(report(publicOutputDirs().flatMap((dir) => scanDir(dir, ANY_CANARY)))).toEqual([]);
  });

  test("non-entitled visitors: the fixture route, its side paths and site files never carry the canary", async ({
    request,
  }) => {
    const hits: Hit[] = [];
    for (const visitor of [...NON_ENTITLED_VISITORS, ...(await signedVisitors())]) {
      for (const s of await fetchPageSurfaces(request, FIXTURE_ROUTE, visitor)) {
        if (fixtureBuilt) expect(s.status, `${visitor.name} ${s.surface}`).toBe(200);
        hits.push(...scanText(s.body, ANY_CANARY, `${visitor.name} ${s.surface} ${s.url} (${s.status})`));
      }
      for (const url of EXTRA_PATHS) {
        const res = await request.get(url, { headers: visitor.headers });
        hits.push(...scanText(await res.text(), ANY_CANARY, `${visitor.name} ${url} (${res.status()})`));
      }
      for (const url of SITE_FILES) {
        const res = await request.get(url, { headers: visitor.headers });
        expect(res.status(), url).toBe(200);
        hits.push(...scanText(await res.text(), ANY_CANARY, `${visitor.name} ${url}`));
      }
    }
    expect(report(hits)).toEqual([]);
  });

  test("free and expired-Pro sessions never see the canary", async ({ browser }) => {
    test.skip(!dbE2E || !fixtureBuilt, SKIP_REASON);
    reseed("free", "pro_expired");
    for (const key of ["free", "pro_expired"] as const) {
      const context = await browser.newContext();
      await loginAs(context, key);
      await context.request.post("/api/entitlements/refresh", { headers: { origin: origin() } });
      const cookie = (await context.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
      const hits: Hit[] = [];
      for (const s of await fetchPageSurfaces(context.request, FIXTURE_ROUTE, { name: key, headers: { cookie } })) {
        hits.push(...scanText(s.body, ANY_CANARY, `${key} ${s.surface}`));
      }
      await context.close();
      expect(report(hits)).toEqual([]);
    }
  });

  test("Pro: the canary IS in the page, its RSC payload and prefetch", async ({ request, page, context }) => {
    test.skip(!fixtureBuilt || !canSign(), "needs the fixture build and ENTITLEMENT_SECRET");
    const pro: Visitor = { name: "pro", headers: { cookie: await signedEntitlement({ tier: "pro" }) } };
    for (const s of await fetchPageSurfaces(request, FIXTURE_ROUTE, pro)) {
      expect(s.status, s.surface).toBe(200);
      expect(s.body, `${s.surface} must carry the canary for Pro`).toContain(CANARY);
    }
    await context.setExtraHTTPHeaders(pro.headers);
    await page.goto(FIXTURE_ROUTE);
    await expect(page.getByText(CANARY)).toBeVisible();
  });

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
