import { expect, test, type Page } from "@playwright/test";

// Copy protection layer 1 and crawler rules (plan §11.10). Runs against a production build (`next start`).

const ARTICLE = "/ai-system-design/genai-system-design/tokenization";
const LEGAL = "/legal/terms";
const NOTICE = /^Content © Origins AI Learn\. Read it at http.+\/ai-system-design\/genai-system-design\/tokenization$/;

async function open(page: Page, path: string) {
  await page.goto(path);
  // The island attaches its listeners after hydration; it sets the print notice when it has.
  await expect(page.locator("body")).toHaveAttribute("data-print-notice", /Read it at/);
}

/** Dispatches a cancelable event on the first match and returns whether the page cancelled it. */
function dispatch(page: Page, selector: string, type: "contextmenu" | "dragstart") {
  return page
    .locator(selector)
    .first()
    .evaluate((el, t) => {
      const ev = new MouseEvent(t, { bubbles: true, cancelable: true });
      return !el.dispatchEvent(ev);
    }, type);
}

test.describe("content protection", () => {
  test("text on an article can't be selected", async ({ page }) => {
    await open(page, ARTICLE);
    const paragraph = page.locator("article p").first();
    await paragraph.click({ clickCount: 3 });
    const box = (await paragraph.boundingBox())!;
    await page.mouse.move(box.x + 2, box.y + 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 2, box.y + box.height - 2, { steps: 5 });
    await page.mouse.up();
    expect(await page.evaluate(() => getSelection()?.toString() ?? "")).toBe("");
    await expect(paragraph).toHaveCSS("user-select", "none");
  });

  test("copying puts the notice on the clipboard instead of the content", async ({ page }) => {
    await open(page, ARTICLE);
    const result = await page
      .locator("article p")
      .first()
      .evaluate((el) => {
        const data = new DataTransfer();
        const ev = new ClipboardEvent("copy", { bubbles: true, cancelable: true, clipboardData: data });
        el.dispatchEvent(ev);
        return { cancelled: ev.defaultPrevented, text: data.getData("text/plain") };
      });
    expect(result.cancelled).toBe(true);
    expect(result.text).toMatch(NOTICE);
  });

  test("Ctrl/⌘ + C, A, S and P show the protected toast", async ({ page }) => {
    await open(page, ARTICLE);
    await page.locator("article p").first().click();
    for (const key of ["c", "a", "s", "p"]) {
      const cancelled = await page.evaluate((k) => {
        const ev = new KeyboardEvent("keydown", { key: k, ctrlKey: true, bubbles: true, cancelable: true });
        document.querySelector("article p")!.dispatchEvent(ev);
        return ev.defaultPrevented;
      }, key);
      expect(cancelled, `Ctrl+${key}`).toBe(true);
    }
    await expect(page.getByRole("status").filter({ hasText: "protected" })).toBeVisible();
  });

  test("printing hides the article and prints a notice", async ({ page }) => {
    await open(page, ARTICLE);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("main")).toBeHidden();
    for (const article of await page.locator("article").all()) await expect(article).toBeHidden();
    const after = await page.evaluate(() => getComputedStyle(document.body, "::after").content);
    expect(after).toContain("Content © Origins AI Learn. Read it at");
  });

  test("right-click and drag are blocked on content only", async ({ page }) => {
    await open(page, ARTICLE);
    expect(await dispatch(page, "article p", "contextmenu")).toBe(true);
    expect(await dispatch(page, "article p", "dragstart")).toBe(true);
    expect(await dispatch(page, "header", "contextmenu")).toBe(false);
    // The footer (contact details) stays copyable, even where a content layout renders it inside <main>.
    expect(await dispatch(page, "footer", "contextmenu")).toBe(false);
    // Links inside content keep their menu (open in new tab). A premium article's preview (paywall on) may end
    // before its first link; the production-profile run always checks it.
    if ((await page.locator("article a[href]").count()) > 0) {
      expect(await dispatch(page, "article a[href]", "contextmenu")).toBe(false);
    }
  });

  test("search boxes on content pages stay usable", async ({ page }) => {
    await open(page, "/interviews/llm-foundations");
    const search = page.getByRole("searchbox").first();
    await search.fill("tokenizer");
    await search.press("ControlOrMeta+a");
    expect(await search.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe(9);
  });

  test("legal pages stay selectable, copyable and printable", async ({ page }) => {
    await open(page, LEGAL);
    const paragraph = page.locator(".prose-editorial p").nth(1);
    await paragraph.click({ clickCount: 3 });
    expect(await page.evaluate(() => getSelection()?.toString() ?? "")).not.toBe("");
    expect(await dispatch(page, ".prose-editorial p", "contextmenu")).toBe(false);
    await page.emulateMedia({ media: "print" });
    await expect(paragraph).toBeVisible();
  });

  test("the tdm-reservation meta is in the head", async ({ page }) => {
    await page.goto(ARTICLE);
    await expect(page.locator('head meta[name="tdm-reservation"]')).toHaveAttribute("content", "1");
  });
});

test.describe("crawler controls", () => {
  /** robots.txt groups: each group's user agents and its rules. */
  async function robotsGroups(page: Page) {
    const res = await page.request.get("/robots.txt");
    expect(res.ok()).toBe(true);
    return (await res.text())
      .split(/\n\s*\n/)
      .map((block) => {
        const lines = block.split("\n").map((l) => l.trim());
        const field = (name: string) =>
          lines.filter((l) => l.toLowerCase().startsWith(`${name}:`)).map((l) => l.slice(name.length + 1).trim());
        return { agents: field("user-agent"), allow: field("allow"), disallow: field("disallow"), lines };
      })
      .filter((g) => g.agents.length);
  }

  test("robots.txt refuses AI crawlers and allows Googlebot and Bingbot", async ({ page }) => {
    const groups = await robotsGroups(page);
    const groupOf = (agent: string) => groups.find((g) => g.agents.includes(agent));
    for (const bot of [
      "GPTBot",
      "ChatGPT-User",
      "CCBot",
      "ClaudeBot",
      "anthropic-ai",
      "Google-Extended",
      "PerplexityBot",
      "Bytespider",
    ]) {
      expect(groupOf(bot)?.disallow, bot).toContain("/");
    }
    for (const bot of ["Googlebot", "Bingbot"]) {
      expect(groupOf(bot)?.allow, bot).toContain("/");
      expect(groupOf(bot)?.disallow, bot).not.toContain("/");
    }
    const all = await (await page.request.get("/robots.txt")).text();
    expect(all).toMatch(/^Sitemap: https?:\/\/.+\/sitemap\.xml$/m);
  });

  test("well-known files are served", async ({ page }) => {
    const tdm = await page.request.get("/.well-known/tdmrep.json");
    expect(await tdm.json()).toEqual([{ location: "/", "tdm-reservation": 1 }]);
    const security = await (await page.request.get("/.well-known/security.txt")).text();
    expect(security).toMatch(/^Contact: mailto:/m);
    expect(security).toMatch(/^Expires: \d{4}-\d\d-\d\dT/m);
  });
});
