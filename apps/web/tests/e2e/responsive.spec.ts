import { expect, test, type Page } from "@playwright/test";
import { TEMPLATE_PAGES } from "./support/templates";

// Responsive & multi-display invariants (@core): verifies zero horizontal overflow, single-row desktop navigation,
// full-width monitor expansion (nav + ContentShell span viewport width on large monitors), tablet drawer fallback
// (< 1024px), single visible footer, and container-aware TOC rail resizing across phones, tablets, laptops, and
// large monitors.

const VIEWPORTS = [
  { name: "mobile-xs", width: 320, height: 568 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop-fhd", width: 1920, height: 1080 },
  { name: "ultrawide", width: 2560, height: 1440 },
] as const;

const EXTRA_ROUTES = [
  { name: "interviews-index", url: "/interviews" },
  { name: "companies", url: "/companies" },
];

const PAGES = [...TEMPLATE_PAGES, ...EXTRA_ROUTES];

async function visibleFooters(page: Page) {
  return page.locator("footer").evaluateAll(
    (els) =>
      els.filter((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.height > 0;
      }).length
  );
}

test.describe("responsive layout invariants @core", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
      // Omit `isMobile` here because Firefox does not support it; viewport sizing still exercises every CSS breakpoint.
      test.use({ viewport: { width: vp.width, height: vp.height } });

      for (const p of PAGES) {
        test(`${p.name} fits without overflow or layout breakage`, async ({ page }) => {
          const errors: string[] = [];
          page.on("pageerror", (err) => errors.push(err.message));

          const res = await page.goto(p.url, { waitUntil: "load" });
          expect(res?.status(), p.url).toBe(200);
          await page.waitForLoadState("networkidle");

          // 1. No horizontal overflow on document root.
          const overflow = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          }));
          expect(overflow.scrollWidth, `horizontal overflow on ${p.url} at ${vp.width}px`).toBeLessThanOrEqual(
            overflow.innerWidth
          );

          // 2. Exactly one visible footer (ContentShell hides root footer at lg+, never zero or two).
          expect(await visibleFooters(page), `visible footers on ${p.url} at ${vp.width}px`).toBe(1);

          // 3. On desktop (1280px+), header nav bar is visible, single-row, non-overlapping, and spans full monitor width.
          if (vp.width >= 1280) {
            const nav = page.locator("header nav[aria-label='Main']");
            await expect(nav).toBeVisible();
            const navBox = (await nav.boundingBox())!;
            expect(Math.abs(navBox.width - vp.width)).toBeLessThan(2);

            const linksBar = nav.locator("> div").nth(0);
            await expect(linksBar).toBeVisible();
            const linkMetrics = await linksBar.locator(":scope > a, :scope > span[title]").evaluateAll((els) =>
              els.map((el) => {
                const r = el.getBoundingClientRect();
                return {
                  text: el.textContent?.trim() ?? "",
                  left: r.left,
                  right: r.right,
                  top: r.top,
                  height: r.height,
                };
              })
            );
            expect(linkMetrics.length).toBeGreaterThan(0);
            const firstTop = linkMetrics[0].top;
            for (let i = 0; i < linkMetrics.length; i++) {
              const cur = linkMetrics[i];
              // Single horizontal line (allow subpixel tolerance).
              expect(Math.abs(cur.top - firstTop), `wrapped header link "${cur.text}"`).toBeLessThan(6);
              expect(cur.height, `tall header link "${cur.text}"`).toBeLessThan(40);
              if (i > 0) {
                expect(cur.left, `overlapping header link "${cur.text}"`).toBeGreaterThanOrEqual(
                  linkMetrics[i - 1].right - 1
                );
              }
            }
          }

          // 4. On desktop and large monitors, ContentShell spans full viewport width so sidebar stays flush left and content expands.
          const shell = page.locator("[data-content-shell]");
          if ((await shell.count()) > 0 && vp.width >= 1280) {
            const shellBox = (await shell.boundingBox())!;
            expect(Math.abs(shellBox.width - vp.width)).toBeLessThan(2);
            if (vp.width >= 1920 && p.name === "article-diagrams") {
              const articleBox = (await page.locator("article").first().boundingBox())!;
              expect(articleBox.width).toBeGreaterThan(1200);
            }
          }

          expect(errors, `page errors on ${p.url}`).toEqual([]);
        });
      }
    });
  }

  test("tablet (768px) uses the Contents drawer instead of cramping articles", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/ai-system-design/genai-system-design/prompt-engineering-types");
    const openNav = page.getByRole("button", { name: "Open navigation" });
    await expect(openNav).toBeVisible();
    await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeHidden();
    await openNav.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("widening the desktop sidebar adapts the On-this-page rail cleanly", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/ai-system-design/genai-system-design/anatomy-of-an-llm-application");

    const desktopToc = page.locator("aside nav[aria-label='On this page']");
    await expect(desktopToc).toBeVisible();

    const separator = page.getByRole("separator", { name: "Resize sidebar" });
    const box = (await separator.boundingBox())!;
    // Drag sidebar wider by 160px -> content pane shrinks from 1000px to 840px (< 940px).
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect(desktopToc).toBeHidden();
    await expect(page.getByRole("button", { name: "On this page" })).toBeVisible();
  });

  test("search dialog fits mobile and desktop viewports cleanly", async ({ page }) => {
    for (const vp of [
      { width: 320, height: 568 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto("/");
      await page
        .getByRole("button", { name: /Search/i })
        .first()
        .click();
      const dialog = page.getByRole("dialog", { name: "Search articles" });
      await expect(dialog).toBeVisible();
      const inputBox = (await dialog.locator("input[type='search']").boundingBox())!;
      expect(inputBox.x).toBeGreaterThanOrEqual(0);
      expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(vp.width);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  });
});
