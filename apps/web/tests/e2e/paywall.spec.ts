import { expect, test, type Page } from "@playwright/test";
import { dbE2E, loginAs, origin, reseed, SKIP_REASON } from "../fixtures/users";
import {
  FIXTURE_ROUTE,
  PREMIUM_ARTICLE,
  PREVIEW_OF,
  canSign,
  expiredEntitlement,
  foreignKidEntitlement,
  paywallBuilt,
  signedEntitlement,
} from "../fixtures/paywall";

// @core paywall (plan §9.2, §12.2): who sees a premium page's preview + paywall and who sees the full page.
// Signed `tts_ent` cookies are made with the server's ENTITLEMENT_SECRET; the session cases (free, expired pro,
// pro) use the test login and the refresh endpoint, so they need E2E_DB=1.

const PREVIEW_TEXT = "The paywall preview may show this paragraph to anyone.";
const PREMIUM_HEADING = "Premium body";

async function expectPreview(page: Page) {
  await expect(page.getByTestId("paywall")).toBeVisible();
  await expect(page.getByText(PREVIEW_TEXT)).toBeVisible();
  await expect(page.getByRole("heading", { name: PREMIUM_HEADING })).toHaveCount(0);
  expect(await page.content()).not.toMatch(/LEAK-CANARY-/);
}

async function expectFull(page: Page) {
  await expect(page.getByRole("heading", { name: PREMIUM_HEADING })).toBeVisible();
  await expect(page.getByTestId("paywall")).toHaveCount(0);
}

test.describe("paywall @core", () => {
  test.skip(() => !paywallBuilt(), "this build has the paywall off (production profile)");

  test("anonymous: preview, paywall CTA and the JSON-LD paywall markup", async ({ page }) => {
    const res = await page.goto(FIXTURE_ROUTE);
    expect(res?.status()).toBe(200);
    expect(page.url()).toBe(`${origin()}${FIXTURE_ROUTE}`);
    await expectPreview(page);
    await expect(page.getByRole("link", { name: "See Pro plans" })).toHaveAttribute("href", "/pricing");
    await expect(page.getByRole("link", { name: /Already Pro\? Sign in/ })).toHaveAttribute(
      "href",
      `/sign-in?callbackURL=${encodeURIComponent(FIXTURE_ROUTE)}`
    );
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
    const article = graph["@graph"].find((n: { "@type": string }) => n["@type"] === "Article");
    expect(article).toMatchObject({ isAccessibleForFree: false, hasPart: { cssSelector: ".oa-paywalled" } });
    await expect(page.locator(".oa-paywalled")).toHaveCount(1);
    // Same canonical URL as the full page; the preview isn't a separate page for search engines.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/system-design\/leak-canary\/premium-article$/
    );
    // Middleware also sets `Vary: Cookie`; `next start` replaces Vary with its own RSC list, OpenNext applies the
    // middleware's headers last. `private` is what keeps shared caches from storing either variant.
    expect(res?.headers()["cache-control"]).toMatch(/private/);
  });

  test("a real premium article is previewed too, and the preview URL itself is noindex", async ({ page, request }) => {
    await page.goto(PREMIUM_ARTICLE);
    await expect(page.getByTestId("paywall")).toBeVisible();
    const direct = await request.get(PREVIEW_OF(PREMIUM_ARTICLE));
    expect(direct.status()).toBe(200);
    expect(direct.headers()["x-robots-tag"]).toMatch(/noindex/);
    // Free pages are untouched: no paywall on a hub or an outline article.
    await page.goto("/system-design/databases");
    await expect(page.getByTestId("paywall")).toHaveCount(0);
    await page.goto("/system-design-case-studies/case-studies/dropbox");
    await expect(page.getByTestId("paywall")).toHaveCount(0);
  });

  for (const [name, cookie] of [
    ["forged cookie", async () => "tts_ent=eyJhbGciOiJIUzI1NiJ9.eyJ0aWVyIjoicHJvIn0.forged"],
    ["expired signed cookie", expiredEntitlement],
    ["cookie from an unknown key", foreignKidEntitlement],
    ["valid free-tier cookie", () => signedEntitlement({ tier: "free" })],
  ] as const) {
    test(`${name}: preview`, async ({ page, context }) => {
      test.skip(!canSign(), "needs ENTITLEMENT_SECRET");
      await context.setExtraHTTPHeaders({ cookie: await cookie() });
      await page.goto(FIXTURE_ROUTE);
      await expectPreview(page);
    });
  }

  test("valid Pro cookie: the full article, never cached by shared caches", async ({ page, context }) => {
    test.skip(!canSign(), "needs ENTITLEMENT_SECRET");
    await context.setExtraHTTPHeaders({ cookie: await signedEntitlement({ tier: "pro" }) });
    const res = await page.goto(FIXTURE_ROUTE);
    await expectFull(page);
    expect(res?.headers()["cache-control"]).toBe("private, no-store");
  });

  test("client-side navigation is gated too (RSC requests)", async ({ page, context }) => {
    await page.goto("/system-design/databases");
    await page.locator(`a[href="${PREMIUM_ARTICLE}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${PREMIUM_ARTICLE}$`));
    await expect(page.getByTestId("paywall")).toBeVisible();

    test.skip(!canSign(), "needs ENTITLEMENT_SECRET");
    await context.setExtraHTTPHeaders({ cookie: await signedEntitlement({ tier: "pro" }) });
    await page.goto("/system-design/databases");
    await page.locator(`a[href="${PREMIUM_ARTICLE}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${PREMIUM_ARTICLE}$`));
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByTestId("paywall")).toHaveCount(0);
  });
});

test.describe("paywall with real sessions @core", () => {
  test.skip(() => !paywallBuilt() || !dbE2E, SKIP_REASON);
  test.beforeAll(() => reseed("free", "pro_monthly", "pro_expired", "on_hold"));

  const refresh = (page: Page) => page.request.post("/api/entitlements/refresh", { headers: { origin: origin() } });

  test("free user: preview; refresh issues tier=free", async ({ page, context }) => {
    await loginAs(context, "free");
    expect(await (await refresh(page)).json()).toMatchObject({ tier: "free" });
    await page.goto(FIXTURE_ROUTE);
    await expectPreview(page);
  });

  test("expired Pro: preview", async ({ page, context }) => {
    await loginAs(context, "pro_expired");
    expect(await (await refresh(page)).json()).toMatchObject({ tier: "free" });
    await page.goto(FIXTURE_ROUTE);
    await expectPreview(page);
  });

  test("Pro user: full article after the refresh", async ({ page, context }) => {
    await loginAs(context, "pro_monthly");
    const res = await refresh(page);
    expect(await res.json()).toMatchObject({ tier: "pro", hold: false });
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "tts_ent")).toMatchObject({ httpOnly: true, sameSite: "Lax" });
    await page.goto(FIXTURE_ROUTE);
    await expectFull(page);
  });

  test("a signed-in Pro reader whose cookie expired is let back in from the preview", async ({ page, context }) => {
    await loginAs(context, "pro_monthly");
    await refresh(page);
    // Drop tts_ent but keep the readable hint, as after 15 idle minutes.
    const hint = (await context.cookies()).find((c) => c.name === "tts_ent_hint")!;
    await context.clearCookies({ name: "tts_ent" });
    expect(hint).toBeTruthy();
    await page.goto(FIXTURE_ROUTE);
    await expect(page.getByRole("heading", { name: PREMIUM_HEADING })).toBeVisible({ timeout: 15_000 });
  });

  test("on hold: Pro stays on during the grace period, with the banner", async ({ page, context }) => {
    await loginAs(context, "on_hold");
    expect(await (await refresh(page)).json()).toMatchObject({ tier: "pro", hold: true });
    await page.goto(FIXTURE_ROUTE);
    await expectFull(page);
    await expect(page.getByTestId("on-hold-banner")).toBeVisible();
    await page.goto("/account/billing");
    await expect(page.getByTestId("on-hold-banner")).toContainText("grace period");
  });
});

test.describe("paywall off (production profile) @core", () => {
  test.skip(() => paywallBuilt(), "this build has the paywall on");

  test("every page is fully free and Go Pro is launching soon", async ({ page, request }) => {
    await page.goto(PREMIUM_ARTICLE);
    await expect(page.getByTestId("paywall")).toHaveCount(0);
    expect((await request.get(PREVIEW_OF(PREMIUM_ARTICLE))).status()).toBe(404);
    expect((await request.get(FIXTURE_ROUTE)).status()).toBe(404);
    await page.goto("/pricing");
    await expect(page.getByRole("button", { name: /Go Pro · Launching soon/ })).toBeDisabled();
    expect((await request.get("/checkout")).status()).toBe(404);
  });
});
