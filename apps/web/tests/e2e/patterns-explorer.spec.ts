import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The use-case explorer at the top of the patterns hub highlights the matching cards in the grid below and dims
// the rest (src/components/patterns/). Clear restores every card, and nothing stays dimmed after leaving the hub.
const HUB = "/system-design/patterns";
const card = (page: import("@playwright/test").Page, slug: string) => page.locator(`a[href="${HUB}/${slug}"]`).last();

test("a use case highlights its patterns and dims the rest @core", async ({ page }) => {
  await page.goto(HUB);
  await page.waitForLoadState("networkidle");
  const explorer = page.getByRole("group", { name: "Use cases" });
  await explorer.getByRole("button", { name: "Flash sale & seat booking" }).click();

  await expect(card(page, "concurrency-and-locking").locator('[data-pattern-match="hit"]')).toHaveCount(1);
  await expect(card(page, "load-balancing").locator('[data-pattern-match="dim"]')).toHaveCount(1);
  await expect(page.getByText(/\d+ patterns highlighted/)).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator("[data-pattern-match]")).toHaveCount(0);
});

test("the tier filter marks the advanced cards and leaves no dimming behind on another page @core", async ({
  page,
}) => {
  await page.goto(HUB);
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("group", { name: "Pattern tier" })
    .getByRole("button", { name: /^Advanced/ })
    .click();
  await expect(card(page, "outbox-and-cdc").locator('[data-pattern-match="hit"]')).toHaveCount(1);
  await expect(card(page, "caching").locator('[data-pattern-match="dim"]')).toHaveCount(1);

  await page.locator('a[href="/system-design"]').first().click();
  await page.waitForURL((url) => url.pathname === "/system-design");
  await expect(page.locator("[data-pattern-match]")).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("group", { name: "Use cases" })).toBeVisible();
  await expect(page.locator("[data-pattern-match]")).toHaveCount(0);
});
