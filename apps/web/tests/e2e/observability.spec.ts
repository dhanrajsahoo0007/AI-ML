import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Request } from "@playwright/test";

// Observability and analytics (plan §10), against a production build made with every observability variable unset
// (the default, and what CI builds): no third-party monitoring requests, a working /api/vitals endpoint, and the
// error boundary.

const ARTICLE = "/ai-system-design/genai-system-design/tokenization";
const THIRD_PARTY = /sentry|posthog|cloudflareinsights/i;
const nextDir = path.resolve(__dirname, "../../.next");

const validBeacon = {
  route: ARTICLE,
  section: "ai-system-design",
  metrics: [
    { name: "LCP", value: 812, rating: "good", navigation_type: "navigate" },
    { name: "CLS", value: 0.01, rating: "good" },
  ],
};

/** Loads a page, interacts, and waits past the idle callbacks that would start Sentry and PostHog. */
async function visit(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load" });
  await page.mouse.move(10, 10);
  await page.mouse.wheel(0, 400);
  await page.keyboard.press("Tab");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
}

test.describe("observability, everything off @core", () => {
  test("no Sentry, PostHog or Cloudflare Insights requests, scripts or chunks", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (r: Request) => requests.push(r.url()));

    for (const url of ["/", ARTICLE, "/pricing"]) await visit(page, url);
    expect(requests.filter((u) => THIRD_PARTY.test(u))).toEqual([]);
    expect(await page.locator("script[data-cf-beacon]").count()).toBe(0);

    // The SDKs are not in the build at all: no client chunk mentions them.
    const chunks = path.join(nextDir, "static", "chunks");
    const files = fs.readdirSync(chunks, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".js"));
    const withSdk = files.filter((f) =>
      /sentry\.io|@sentry\/|posthog/i.test(fs.readFileSync(path.join(chunks, f), "utf8"))
    );
    expect(withSdk).toEqual([]);
  });

  test("the CSP lists no observability hosts", async ({ request }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy-report-only"] ?? res.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).not.toMatch(THIRD_PARTY);
  });
});

test.describe("web vitals beacon @core", () => {
  test("/api/vitals accepts a valid beacon", async ({ request }) => {
    const res = await request.post("/api/vitals", { data: validBeacon });
    expect(res.status()).toBe(204);
  });

  test("/api/vitals rejects invalid beacons", async ({ request }) => {
    for (const data of [
      { ...validBeacon, metrics: [] },
      { ...validBeacon, metrics: [{ name: "FID", value: 1, rating: "good" }] },
      { ...validBeacon, route: "/pricing?email=someone@example.com" },
      { ...validBeacon, extra: true },
    ]) {
      expect((await request.post("/api/vitals", { data })).status(), JSON.stringify(data)).toBe(400);
    }
    const notJson = await request.post("/api/vitals", { data: "{oops", headers: { "content-type": "text/plain" } });
    expect(notJson.status()).toBe(400);
    expect((await request.post("/api/vitals", { data: { ...validBeacon, pad: "x".repeat(4000) } })).status()).toBe(413);
    expect((await request.get("/api/vitals")).status()).toBe(405);
  });

  test("a sampled page load sends its vitals with route and section", async ({ page }) => {
    // Force the 10% sample.
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await page.goto(ARTICLE, { waitUntil: "load" });
    await page.waitForLoadState("networkidle");
    const beacon = page.waitForRequest((r) => r.url().endsWith("/api/vitals") && r.method() === "POST");
    // What the browser fires when the tab is hidden or closed.
    await page.evaluate(() => dispatchEvent(new Event("pagehide")));
    const body = (await beacon).postDataJSON() as { route: string; section: string; metrics: { name: string }[] };
    expect(body.route).toBe(ARTICLE);
    expect(body.section).toBe("ai-system-design");
    expect(body.metrics.map((m) => m.name)).toContain("TTFB");
  });
});

test.describe("error pages @core", () => {
  test("an error in a page shows app/error.tsx below the header, and Try again re-renders", async ({ page }) => {
    // The home page's stat counters (components/motion/animated-counter.tsx) query reduced motion in an effect;
    // make that one query throw so the page segment fails in the browser.
    await page.addInitScript(() => {
      const w = window as unknown as { __fail: boolean };
      w.__fail = true;
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        if (w.__fail && query === "(prefers-reduced-motion: reduce)") throw new Error("e2e: page error");
        return original(query);
      };
    });
    await page.goto("/", { waitUntil: "load" });
    const alert = page.getByRole("alert").filter({ hasText: "Something went wrong" });
    await expect(alert).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(alert.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");

    await page.evaluate(() => {
      (window as unknown as { __fail: boolean }).__fail = false;
    });
    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(alert).toBeHidden();
    await expect(page.locator("main h1").first()).toBeVisible();
  });

  test("an error outside a page shows app/global-error.tsx", async ({ page }) => {
    // Break the pricing page's client chunk, then navigate there client-side: the router can't load the page's
    // modules, which fails above every segment, so the last-resort boundary replaces the document.
    // /pricing may be served by the /pricing/live variant (checkout open, plan §9.3): break either chunk.
    await page.route(/\/_next\/static\/chunks\/app\/pricing\/(?:live\/)?page-[^/]+\.js$/, (route) =>
      route.fulfill({ contentType: "application/javascript", body: 'throw new Error("e2e: broken chunk")' })
    );
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("banner").getByRole("link", { name: "Pricing" }).click();
    const alert = page.getByRole("alert").filter({ hasText: "Something went wrong" });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(alert.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
  });

  test("unknown URLs show the not-found page", async ({ page }) => {
    const res = await page.goto("/no-such-page-observability-e2e");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  });
});
