import { expect, test, type Page } from "@playwright/test";
import { paywallBuilt, premiumManifest } from "../fixtures/paywall";

// @core regional pricing (plan §9.5): middleware serves /pricing's prerendered variant for the visitor's price tier,
// from the `tts_region` cookie (the region switcher) first, then `cf-ipcountry` (set by Cloudflare; spoofed here, which
// works only against `next start`, since Cloudflare overwrites the header). /pricing stays the canonical URL.
//
// Local and preview builds show sample prices ($9 / $90 base) until config/business.ts has real ones; staging and
// production say "Price announced at launch" for every tier.

const env = premiumManifest().env;
const samplePrices = env === "local" || env === "preview";
/** Middleware serves the checkout-open variants when the paywall is on and the server has DODO_API_KEY. */
const checkoutLive = paywallBuilt() && Boolean(process.env.DODO_API_KEY);

const CASES = [
  { country: "US", tier: "A", monthly: "$9", yearly: "$90" },
  { country: "DE", tier: "A", monthly: "$9", yearly: "$90" },
  { country: "PL", tier: "B", monthly: "$6", yearly: "$63" },
  { country: "IN", tier: "C", monthly: "$4", yearly: "$40" },
  { country: "BR", tier: "C", monthly: "$4", yearly: "$40" },
] as const;

const proCard = (page: Page) => page.locator("section[data-price-tier]");

async function expectCanonicalPricing(page: Page) {
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(new URL(canonical!).pathname).toBe("/pricing");
}

test.describe("regional pricing @core", () => {
  for (const c of CASES) {
    test.describe(`visitor from ${c.country}`, () => {
      test.use({ extraHTTPHeaders: { "cf-ipcountry": c.country } });

      test(`gets tier ${c.tier} at /pricing, never shared-cached`, async ({ page }) => {
        const res = await page.goto("/pricing");
        expect(res?.status()).toBe(200);
        expect(new URL(page.url()).pathname).toBe("/pricing");
        await expect(proCard(page)).toHaveAttribute("data-price-tier", c.tier);
        // Middleware also sets `Vary: Cookie, CF-IPCountry`; `next start` replaces Vary with its own RSC list (see
        // paywall.spec.ts). `private` is what keeps shared caches from serving one region's page to another.
        expect(res?.headers()["cache-control"]).toMatch(/private/);
        await expectCanonicalPricing(page);

        const heading = page.locator("#plan-pro");
        if (samplePrices) {
          await expect(heading).toContainText(`${c.monthly}/month`);
          await expect(heading).toContainText(`${c.yearly}/year`);
          await expect(page.getByTestId("price-estimate")).toContainText("confirmed at checkout");
        } else {
          await expect(heading).toHaveText("Price announced at launch");
        }
        await expect(page.getByTestId("regional-note")).toContainText("A VPN changes only this estimate");
        expect(await page.content()).not.toContain("TODO");
      });

      test(`tier ${c.tier} keeps the build's Go Pro state (live × tier)`, async ({ page }) => {
        await page.goto("/pricing");
        await expect(proCard(page)).toHaveAttribute("data-price-tier", c.tier);
        if (checkoutLive) {
          await expect(page.getByTestId("go-pro-pro_monthly")).toHaveAttribute("href", "/checkout?plan=pro_monthly");
        } else {
          await expect(page.getByRole("button", { name: /Go Pro · Launching soon/ })).toBeDisabled();
          await expect(page.getByTestId("go-pro-pro_monthly")).toHaveCount(0);
        }
      });
    });
  }

  test.describe("the region switcher", () => {
    test.use({ extraHTTPHeaders: { "cf-ipcountry": "US" } });

    test("overrides the IP country with a cookie, and goes back to it", async ({ page, context }) => {
      await page.goto("/pricing");
      await expect(proCard(page)).toHaveAttribute("data-price-tier", "A");
      const select = page.getByLabel("Show prices for");
      await expect(select).toHaveValue("");

      await select.selectOption({ label: "India" });
      // Choosing alone doesn't reload (WCAG 3.2.2); the button does.
      await expect(proCard(page)).toHaveAttribute("data-price-tier", "A");
      await page.getByRole("button", { name: "Update prices" }).click();
      await expect(proCard(page)).toHaveAttribute("data-price-tier", "C");
      expect(new URL(page.url()).pathname).toBe("/pricing");
      expect((await context.cookies()).find((k) => k.name === "tts_region")?.value).toBe("IN");
      await expect(page.getByLabel("Show prices for")).toHaveValue("IN");
      if (samplePrices) await expect(page.locator("#plan-pro")).toContainText("$4/month");

      await page.getByLabel("Show prices for").selectOption({ label: "Poland" });
      await page.getByRole("button", { name: "Update prices" }).click();
      await expect(proCard(page)).toHaveAttribute("data-price-tier", "B");

      await page.getByLabel("Show prices for").selectOption({ label: "Your location" });
      await page.getByRole("button", { name: "Update prices" }).click();
      await expect(proCard(page)).toHaveAttribute("data-price-tier", "A");
      expect((await context.cookies()).find((k) => k.name === "tts_region")).toBeUndefined();
    });

    test("is a labelled form control that works from the keyboard", async ({ page }) => {
      await page.goto("/pricing");
      const select = page.getByLabel("Show prices for");
      await select.focus();
      await select.selectOption("BR");
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Update prices" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(proCard(page)).toHaveAttribute("data-price-tier", "C");
    });
  });

  test("a malformed region cookie falls back to the IP country", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ extraHTTPHeaders: { "cf-ipcountry": "IN" } });
    await context.addCookies([{ name: "tts_region", value: "not-a-country", url: baseURL! }]);
    const page = await context.newPage();
    await page.goto("/pricing");
    await expect(proCard(page)).toHaveAttribute("data-price-tier", "C");
    await context.close();
  });

  test("/pricing stays canonical: variants point to it and are noindex at their own URLs", async ({
    page,
    request,
  }) => {
    await page.goto("/pricing");
    await expectCanonicalPricing(page);
    // /pricing is indexable whichever variant middleware serves there (preview builds are noindex site-wide).
    for (const country of ["US", "IN"]) {
      const res = await request.get("/pricing", { headers: { "cf-ipcountry": country } });
      const html = await res.text();
      expect(html, country).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/pricing"\/>/);
      expect(html, country).not.toMatch(/<meta name="robots" content="[^"]*noindex/);
      if (env === "production") expect(res.headers()["x-robots-tag"] ?? "", country).not.toMatch(/noindex/);
    }

    for (const path of ["/pricing/b", "/pricing/c", "/pricing/live", "/pricing/live/b", "/pricing/live/c"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["x-robots-tag"], path).toMatch(/noindex/);
      const html = await res.text();
      expect(html, path).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/pricing"\/>/);
    }
    expect((await request.get("/pricing/a")).status()).toBe(404);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toMatch(/<loc>[^<]+\/pricing<\/loc>/);
    expect(sitemap).not.toMatch(/\/pricing\/(?:live|b|c)\b/);
  });
});
