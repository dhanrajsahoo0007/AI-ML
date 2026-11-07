import { expect, test, type Page } from "@playwright/test";
import { loadBuiltRoutes } from "./support/built-routes";

// @core route crawl (plan §12.2): every URL in the build returns 200 and renders a real page.
const { ok, notFound, hidden } = loadBuiltRoutes();

// Guard against a broken manifest silently producing an empty or tiny crawl.
test("the build lists the expected pages @core", () => {
  expect(ok.length).toBeGreaterThan(100);
  for (const hub of ["/", "/ai-system-design", "/system-design", "/interviews", "/companies"]) {
    expect(ok).toContain(hub);
  }
});

// Console errors that are known and tracked elsewhere; each one is recorded as a test annotation instead of
// failing the crawl. Keep this empty: React #418 (hydration mismatch under load) was listed here until it was
// fixed on 2026-11-07 (root layout: THEME_SCRIPT from a plain module + HydrationSlot around the late RSC rows; see
// tests/unit/client-boundary.test.ts). Add an entry only with a linked issue and an owner.
const KNOWN_CONSOLE_ERRORS: RegExp[] = [];

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  const record = (text: string) => {
    if (KNOWN_CONSOLE_ERRORS.some((re) => re.test(text))) {
      test.info().annotations.push({ type: "known-issue", description: text.slice(0, 200) });
    } else {
      errors.push(text);
    }
  };
  page.on("console", (msg) => {
    if (msg.type() === "error") record(msg.text());
  });
  page.on("pageerror", (err) => record(err.message));
  return errors;
}

test.describe("routes.crawl @core", () => {
  for (const url of ok) {
    test(`200 ${url}`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const response = await page.goto(url, { waitUntil: "load" });

      expect(response?.status(), `status of ${url}`).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      expect((await page.title()).trim(), `<title> of ${url}`).not.toBe("");
      // Let client components (Mermaid, motion) finish so their errors are caught too.
      await page.waitForLoadState("networkidle");
      expect(errors, `console errors on ${url}`).toEqual([]);
    });
  }

  for (const url of notFound) {
    test(`404 ${url} (section switched off)`, async ({ request }) => {
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status()).toBe(404);
    });
  }

  for (const url of hidden) {
    test(`404 ${url} (hidden section, anonymous)`, async ({ request }) => {
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status()).toBe(404);
    });
  }

  test("unknown URLs return the 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-e2e");
    expect(response?.status()).toBe(404);
  });
});
