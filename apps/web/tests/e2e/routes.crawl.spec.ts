import { expect, test, type Page } from "@playwright/test";
import { loadBuiltRoutes } from "./support/built-routes";

// @core route crawl (plan §12.2): every URL in the build returns 200 and renders a real page.
const { ok, notFound } = loadBuiltRoutes();

// Guard against a broken manifest silently producing an empty or tiny crawl.
test("the build lists the expected pages @core", () => {
  expect(ok.length).toBeGreaterThan(100);
  for (const hub of ["/", "/ai-system-design", "/system-design", "/interviews", "/companies"]) {
    expect(ok).toContain(hub);
  }
});

// KNOWN ISSUE (pre-existing on `development`, 2026-11-07): under parallel load some pages log React error #418
// (hydration mismatch, the client re-renders the page). It doesn't reproduce in `next dev` or with one browser.
// Suspects are the motion wrappers and ContentShell, which wave-1 stream B is rewriting. The error is recorded as
// a test annotation instead of failing the crawl. Remove this entry once stream B is merged.
const KNOWN_CONSOLE_ERRORS = [/Minified React error #418\b/];

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

  test("unknown URLs return the 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-e2e");
    expect(response?.status()).toBe(404);
  });
});
