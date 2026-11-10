import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import matter from "gray-matter";
import yaml from "js-yaml";
import { frontmatterSchema } from "../../src/features/sections/schema";
import { extractInterviewQuestions } from "../../src/lib/question-answer";
import { dbE2E, loginAs, origin, reseed, SKIP_REASON } from "../fixtures/users";
import {
  canSign,
  expiredEntitlement,
  foreignKidEntitlement,
  paywallBuilt,
  premiumManifest,
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

/**
 * Premium interview answers that contain a diagram (plan §6.2), found the way the suite finds premium content:
 * the build's premium manifest lists the routes of every `access: premium` category in
 * content/question-bank/taxonomy.yaml. Each answer comes from the category's YAML file or from an article
 * filed under it in articles.yaml. `text` is a run of plain words from the answer, so it is matched as is in
 * HTML and in RSC payloads.
 */
function premiumDiagramAnswers(): { routes: string[]; answers: { id: string; text: string }[] } {
  const content = path.resolve(__dirname, "../../content");
  const bank = path.join(content, "question-bank");
  const read = (file: string) => (fs.existsSync(file) ? yaml.load(fs.readFileSync(file, "utf8")) : undefined);
  const taxonomy = (read(path.join(bank, "taxonomy.yaml")) ?? []) as { slug: string; access?: string }[];
  const premium = new Set(taxonomy.filter((c) => c.access === "premium").map((c) => c.slug));
  const sections = (read(path.join(content, "sections.yaml")) ?? []) as { kind?: string; href?: string }[];
  const bankHref = sections.find((s) => s.kind === "question-bank")?.href;
  if (!bankHref) return { routes: [], answers: [] };
  // Routes look like <bank href>/<category> and <bank href>/<category>/<subsection>.
  const categoryOf = (route: string) => route.slice(bankHref.length).split("/")[1] ?? "";
  const routes = premiumManifest().routes.filter((r) => r.startsWith(`${bankHref}/`) && premium.has(categoryOf(r)));
  const built = new Set(routes.map(categoryOf));

  const sources: { id: string; a: string }[] = [];
  for (const slug of built) {
    const rows = (read(path.join(bank, `${slug}.yaml`)) ?? []) as { id: string; a?: string }[];
    sources.push(...rows.map((r) => ({ id: `${slug}.yaml ${r.id}`, a: r.a ?? "" })));
  }
  const articles = (read(path.join(bank, "articles.yaml")) ?? {}) as Record<string, string>;
  for (const [href, target] of Object.entries(articles)) {
    const file = path.join(content, `${href}.mdx`);
    if (!built.has(target.split("/")[0]) || !fs.existsSync(file)) continue;
    for (const q of extractInterviewQuestions(matter(fs.readFileSync(file, "utf8")).content)) {
      sources.push({ id: `${href} ${q.question}`, a: q.answer });
    }
  }
  const answers = sources.flatMap(({ id, a }) => {
    if (!a.includes("<AnimatedDiagram")) return [];
    const prose = a.replace(/<[A-Z][^>]*>/g, " ");
    const text = (prose.match(/[A-Za-z0-9][A-Za-z0-9 ]{22,}[A-Za-z0-9]/g) ?? []).sort((x, y) => y.length - x.length)[0];
    return text ? [{ id, text }] : [];
  });
  return { routes, answers };
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

  test("premium interview answers with diagrams: no answer text and no diagram SVG without Pro", async ({
    request,
  }) => {
    const { routes, answers } = premiumDiagramAnswers();
    test.skip(
      answers.length === 0,
      "no premium interview answer with an <AnimatedDiagram> in this build; the locked path is unit-tested in src/components/mdx/question-bank.test.ts"
    );
    const hits: Hit[] = [];
    for (const visitor of [...NON_ENTITLED_VISITORS, ...(await signedVisitors())]) {
      for (const url of routes) {
        for (const s of await fetchPageSurfaces(request, url, visitor)) {
          const where = `${visitor.name} ${s.surface} ${s.url}`;
          expect(s.status, where).toBe(200);
          // Locked answers render no diagram at all, so no diagram node may be in the page.
          hits.push(...scanText(s.body, /data-node=/, `${where} (diagram SVG)`));
          for (const a of answers) hits.push(...scanText(s.body, a.text, `${where} (answer ${a.id})`));
        }
      }
    }
    expect(report(hits)).toEqual([]);

    // With Pro the same answers are in the category pages, so the checks above can't pass by looking for text
    // that never renders.
    if (!canSign()) return;
    const pro: Visitor = { name: "pro", headers: { cookie: await signedEntitlement({ tier: "pro" }) } };
    const pages = await Promise.all(routes.map((url) => request.get(url, { headers: pro.headers })));
    const html = (await Promise.all(pages.map((r) => r.text()))).join("\n");
    expect(html).toContain("data-node=");
    for (const a of answers) expect(html, a.id).toContain(a.text);
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
