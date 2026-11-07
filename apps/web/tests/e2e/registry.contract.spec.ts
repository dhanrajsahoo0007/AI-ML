import { expect, test } from "@playwright/test";
import { desktopHeaderEntries } from "./support/header-nav";
import { builtAppEnv, buildSections, hasRoutes } from "./support/registry";

// @core registry contract, runtime half (plan §5.1): every visible section has a working route and a header
// entry. Sections of a kind without a module yet (DSA, Newsletter) are listed as "coming soon" with no link and
// have no route. The static half (every route folder belongs to a section or a system route) is in
// tests/unit/registry-contract.test.ts.

const env = builtAppEnv();
const visible = buildSections(env).filter((s) => s.state === "on");

test.describe(`registry contract, APP_ENV=${env} @core`, () => {
  for (const s of visible) {
    test(`${s.key}: ${hasRoutes(s) ? "route returns 200" : "coming soon, no route yet"}`, async ({ page }) => {
      const res = await page.goto(s.href);
      if (hasRoutes(s)) {
        expect(res?.status(), s.href).toBe(200);
        await expect(page.locator("h1").first()).toBeVisible();
      } else {
        expect(res?.status(), `${s.href} has no kind module yet`).toBe(404);
      }
    });
  }

  test("every visible section has a header entry", async ({ page }) => {
    const entries = await desktopHeaderEntries(page);
    for (const s of visible) {
      const entry = entries.find((e) => e.label === s.label);
      expect(entry, `header entry for ${s.key}`).toBeDefined();
      expect(entry!.href, `header link for ${s.key}`).toBe(hasRoutes(s) ? s.href : null);
    }
  });
});
