import { expect, test, type Page } from "@playwright/test";
import { TEMPLATE_PAGES } from "./support/templates";

// @core visual regression (plan §12.1): the key templates in light and dark, at desktop and mobile widths.
// Runs only in the `visual` Playwright project. Baselines are Linux screenshots made in the official Playwright
// Docker image (same fonts and rendering as CI): update them with `npm run e2e:visual:update -w web`, never from
// a Mac, and commit the changed PNGs with the change that caused them.
//
// Stability: fonts are self-hosted by next/font (no network fonts); animations and transitions are disabled,
// reduced motion is on, the caret is hidden, the clock is fixed, and <time> elements (relative "updated" dates)
// are masked. Screenshots are of the viewport, not the full page, so long articles stay reviewable.

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1280, height: 800 }, isMobile: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true },
] as const;

const SCHEMES = ["light", "dark"] as const;

async function settle(page: Page, url: string) {
  await page.clock.setFixedTime(new Date("2026-11-07T12:00:00Z"));
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

for (const vp of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    test.describe(`${vp.name} ${scheme} @core`, () => {
      test.use({
        viewport: vp.viewport,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
        deviceScaleFactor: 1,
        colorScheme: scheme,
        reducedMotion: "reduce",
      });

      for (const p of TEMPLATE_PAGES) {
        test(`${p.name} (${p.url})`, async ({ page }) => {
          await settle(page, p.url);
          await expect(page.locator("html")).toHaveClass(scheme === "dark" ? /\bdark\b/ : /^(?!.*\bdark\b)/);
          await expect(page).toHaveScreenshot(`${p.name}-${vp.name}-${scheme}.png`, {
            mask: [page.locator("time")],
          });

          if (p.diagram) {
            // The first build-time Mermaid SVG, in the theme being tested.
            const diagram = page.locator("article svg[aria-roledescription]:visible").first();
            await diagram.scrollIntoViewIfNeeded();
            // The diagram is taller than the viewport, so the sticky site header would land on it at a scroll
            // offset that varies; hide it for this shot.
            await page.addStyleTag({ content: "header.sticky { visibility: hidden !important; }" });
            await expect(diagram).toHaveScreenshot(`${p.name}-diagram-${vp.name}-${scheme}.png`);
          }
        });
      }
    });
  }
}
