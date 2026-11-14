import { expect, type Page } from "@playwright/test";

// Reads the section entries the site header offers, the way a visitor sees them: on desktop every visible section
// is its own item in the top bar (a link, or a non-link "coming soon" item, with the full label as its title),
// followed by plain links such as Pricing; on mobile, the sheet.

export interface HeaderEntry {
  label: string;
  /** null for "coming soon" entries, which have no link. */
  href: string | null;
}

export async function desktopHeaderEntries(page: Page): Promise<HeaderEntry[]> {
  // 1440px: the desktop bar starts here when it has eight or more sections (BAR_SIZES in site-header.tsx); below that
  // width the header is the phone menu.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const bar = page.locator("header nav[aria-label='Main'] > div").nth(0);
  const items = bar.locator(":scope > [aria-haspopup='true'], :scope > span[title], :scope > a[href]");
  await expect(items.first()).toBeVisible();
  const entries: HeaderEntry[] = [];
  for (const item of await items.all()) {
    const title = await item.getAttribute("title");
    const label = (title ?? (await item.innerText())).trim();
    entries.push({ label, href: await item.getAttribute("href") });
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
