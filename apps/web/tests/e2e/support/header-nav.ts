import { expect, type Page } from "@playwright/test";

// Reads the section entries the site header offers, the way a visitor sees them: the desktop mega-menu (each
// group's panel lists its sections in the left column) and the mobile sheet. The header renders its menus only
// when opened, so the server HTML alone doesn't show them.

export interface HeaderEntry {
  label: string;
  /** null for "coming soon" entries, which have no link. */
  href: string | null;
}

export async function desktopHeaderEntries(page: Page): Promise<HeaderEntry[]> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const groups = page.locator("header nav button[aria-haspopup='true']");
  await expect(groups.first()).toBeVisible();
  const entries: HeaderEntry[] = [];
  for (let i = 0; i < (await groups.count()); i++) {
    await groups.nth(i).focus();
    const column = page.locator("header ul").first();
    await expect(column).toBeVisible();
    for (const item of await column.locator(":scope > li").all()) {
      const link = item.locator(":scope > a");
      const label = (await item.innerText()).replace(/\s*Soon\s*$/i, "").trim();
      entries.push({ label, href: (await link.count()) ? await link.getAttribute("href") : null });
    }
    await page.keyboard.press("Escape");
  }
  // Groups that are a single plain link (More → Pricing) are links in the bar itself.
  for (const link of await page.locator("header nav > div:first-of-type > a[href]").all()) {
    entries.push({ label: (await link.innerText()).trim(), href: await link.getAttribute("href") });
  }
  return entries;
}

export async function mobileMenu(page: Page): Promise<{ hrefs: string[]; text: string }> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  const hrefs = await sheet.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  return { hrefs, text: await sheet.innerText() };
}
