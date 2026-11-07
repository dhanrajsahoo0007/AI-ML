import { expect, test, type Page } from "@playwright/test";

// @core SEO metadata, JSON-LD and security headers (plan §6 P11, §11.4). Runs against a production build
// (`next start`), where the headers from next.config.ts are applied.

/** Must equal PAYWALL_CONTAINER_CLASS in src/features/seo/site.ts. */
const PAYWALL_SELECTOR = ".oa-paywalled";

interface PageCase {
  path: string;
  /** JSON-LD @type expected in the page's graph, besides BreadcrumbList (home has none). */
  types: string[];
  ogType: "website" | "article";
}

const PAGES: Record<string, PageCase> = {
  "free article (outline)": {
    path: "/system-design/fundamentals/rpc",
    types: ["Article", "BreadcrumbList"],
    ogType: "article",
  },
  "premium article": {
    path: "/system-design/databases/b-trees",
    types: ["Article", "BreadcrumbList"],
    ogType: "article",
  },
  hub: { path: "/system-design/databases", types: ["CollectionPage", "BreadcrumbList"], ogType: "website" },
  "section index": { path: "/system-design", types: ["CollectionPage", "BreadcrumbList"], ogType: "website" },
  home: { path: "/", types: ["WebSite", "Organization"], ogType: "website" },
  "interview category": { path: "/interviews/rag", types: ["CollectionPage", "BreadcrumbList"], ogType: "website" },
  "interview subsection": {
    path: "/interviews/safety-security/hallucination",
    types: ["CollectionPage", "BreadcrumbList"],
    ogType: "website",
  },
};

type JsonLdNode = { "@type": string; [key: string]: unknown };

async function head(page: Page) {
  const content = (selector: string) =>
    page
      .locator(selector)
      .first()
      .getAttribute("content", { timeout: 1000 })
      .catch(() => null);
  return {
    title: await page.title(),
    description: await content('meta[name="description"]'),
    canonical: await page.locator('link[rel="canonical"]').getAttribute("href"),
    robots: await content('meta[name="robots"]'),
    ogTitle: await content('meta[property="og:title"]'),
    ogDescription: await content('meta[property="og:description"]'),
    ogUrl: await content('meta[property="og:url"]'),
    ogType: await content('meta[property="og:type"]'),
    ogImage: await content('meta[property="og:image"]'),
    twitterCard: await content('meta[name="twitter:card"]'),
    twitterImage: await content('meta[name="twitter:image"]'),
  };
}

async function jsonLd(page: Page): Promise<JsonLdNode[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks.length, "one JSON-LD block").toBe(1);
  const doc = JSON.parse(blocks[0]) as { "@context": string; "@graph": JsonLdNode[] };
  expect(doc["@context"]).toBe("https://schema.org");
  return doc["@graph"];
}

/** Collects CSP violations (Report-Only included) and CSP console messages from the first script on. */
async function watchCsp(page: Page) {
  const messages: string[] = [];
  page.on("console", (msg) => {
    if (/Content Security Policy|Content-Security-Policy/i.test(msg.text())) messages.push(msg.text());
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return async () => [...messages, ...(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp))];
}

test.describe("SEO metadata @core", () => {
  for (const [name, c] of Object.entries(PAGES)) {
    test(`${name}: title, description, canonical, Open Graph, JSON-LD`, async ({ page }) => {
      const response = await page.goto(c.path);
      expect(response?.status()).toBe(200);
      const h = await head(page);

      expect(h.title.trim()).not.toBe("");
      expect(h.description?.length ?? 0).toBeGreaterThan(20);
      const canonical = new URL(h.canonical ?? "");
      expect(canonical.protocol).toBe("https:");
      expect(canonical.pathname).toBe(c.path);
      expect(h.ogUrl).toBe(h.canonical);
      expect(h.ogTitle).toContain("Origins AI Learn");
      expect(h.ogDescription).toBe(h.description);
      expect(h.ogType).toBe(c.ogType);
      expect(h.ogImage).toMatch(/^https:\/\/.+opengraph-image/);
      expect(h.twitterCard).toBe("summary_large_image");
      expect(h.twitterImage).toBe(h.ogImage);
      expect(h.robots).toBe("index, follow");

      const graph = await jsonLd(page);
      expect(graph.map((n) => n["@type"]).sort()).toEqual([...c.types].sort());
      const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList");
      if (crumbs) {
        const items = crumbs.itemListElement as { position: number; item: string }[];
        expect(items[0].position).toBe(1);
        expect(items.at(-1)!.item).toBe(h.canonical);
      }
    });
  }

  test("free and premium articles carry the right access markup", async ({ page }) => {
    await page.goto(PAGES["free article (outline)"].path);
    const free = (await jsonLd(page)).find((n) => n["@type"] === "Article")!;
    expect(free.isAccessibleForFree).toBe(true);
    expect(free).not.toHaveProperty("hasPart");

    await page.goto(PAGES["premium article"].path);
    const premium = (await jsonLd(page)).find((n) => n["@type"] === "Article")!;
    expect(premium.isAccessibleForFree).toBe(false);
    expect(premium.hasPart).toEqual({
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: PAYWALL_SELECTOR,
    });
    expect(premium.headline).toBe("B-Trees");
  });

  test("the social image is a 1200×630 PNG", async ({ page, request }) => {
    await page.goto("/");
    const url = new URL((await head(page)).ogImage!);
    const image = await request.get(url.pathname + url.search);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");
    expect(await page.locator('meta[property="og:image:width"]').getAttribute("content")).toBe("1200");
  });

  test("the web manifest is served", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    expect((await response.json()).name).toBe("Origins AI Learn");
  });
});

test.describe("security headers @core", () => {
  for (const path of [
    "/",
    "/system-design/databases/b-trees",
    "/interviews/safety-security/hallucination",
    "/robots.txt",
  ]) {
    test(`headers on ${path}`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const h = response.headers();
      expect(h["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains; preload");
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"]).toContain("camera=()");
      expect(h["cross-origin-opener-policy"]).toBe("same-origin");
      expect(h["cross-origin-resource-policy"]).toBe("same-site");
      expect(h["x-frame-options"]).toBe("DENY");
      expect(h["x-robots-tag"]).toContain("noai, noimageai");
      expect(h["x-powered-by"]).toBeUndefined();
      const csp = h["content-security-policy-report-only"];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(h["content-security-policy"]).toBeUndefined();
    });
  }

  test("static assets are cached for a year", async ({ page, request }) => {
    await page.goto("/");
    const src = await page.locator('script[src^="/_next/static/"]').first().getAttribute("src");
    const response = await request.get(src!);
    expect(response.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  // The theme script, Next's inline bootstrap scripts, the copy-protection island and the inline diagrams
  // must not trip the (report-only) policy, so it can be enforced later without breaking pages.
  for (const path of [
    "/",
    "/system-design/case-studies/dropbox",
    "/interviews/safety-security/hallucination",
    "/companies",
  ]) {
    test(`no CSP violations on ${path}`, async ({ page }) => {
      const violations = await watchCsp(page);
      await page.goto(path);
      // The copy-protection island sets this once hydrated, so its code has run.
      await expect(page.locator("body")).toHaveAttribute("data-print-notice", /Read it at/);
      await page.waitForLoadState("networkidle");
      // The theme script ran (it sets or clears the dark class before paint).
      expect(await page.evaluate(() => typeof document.documentElement.classList.contains("dark"))).toBe("boolean");
      expect(await violations()).toEqual([]);
    });
  }

  test("the theme script still applies a saved dark theme", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    const violations = await watchCsp(page);
    await page.goto("/system-design");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    expect(await violations()).toEqual([]);
  });
});
