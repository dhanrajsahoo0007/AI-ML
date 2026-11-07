import { expect, test, type Page } from "@playwright/test";
import { dbE2E, loginAs, origin, reseed, SKIP_REASON } from "../fixtures/users";
import { dodoPayment, dodoRefund, dodoSubscription } from "../fixtures/billing/dodo";
import { postWebhook, query, userId, webhookSecret } from "../fixtures/billing/e2e";
import { FIXTURE_ROUTE, paywallBuilt, startDodoStub } from "../fixtures/paywall";

// @core billing journey (plan §9.8 exit criteria, §12.2), webhook-driven: no Dodo account exists, so the hosted
// checkout is a local stub (DODO_API_BASE_URL) and the provider's side is played by signed fixture webhooks.
//   pricing → sign in → /checkout consents → hosted checkout → subscription.active → Pro → cancel at period
//   end (access kept) → cancelled with the period over → access removed

const STUB_PORT = Number(process.env.E2E_DODO_STUB_PORT ?? 0);
const PREMIUM_HEADING = "Premium body";

const refresh = (page: Page) => page.request.post("/api/entitlements/refresh", { headers: { origin: origin() } });

test.describe("billing journey @core", () => {
  test.skip(() => !paywallBuilt() || !dbE2E || !webhookSecret(), `${SKIP_REASON}, plus DODO_WEBHOOK_SECRET`);
  test.describe.configure({ mode: "serial" });

  const stub = startDodoStub(STUB_PORT || 3178);
  let user: string;
  test.beforeAll(async () => {
    reseed("free");
    user = await userId("free");
    if (STUB_PORT) await stub.listen();
  });
  test.afterAll(async () => {
    if (STUB_PORT) await stub.close();
  });

  test("signed out, Go Pro leads to sign-in and back to checkout", async ({ page }) => {
    test.skip(!process.env.DODO_API_KEY, "Go Pro opens checkout only with DODO_API_KEY set");
    await page.goto("/pricing");
    await page.getByTestId("go-pro-pro_monthly").click();
    await expect(page).toHaveURL(/\/sign-in\?callbackURL=%2Fcheckout%3Fplan%3Dpro_monthly/);
  });

  test("subscribe: consent → hosted checkout → webhook → Pro → cancel at period end → access ends", async ({
    page,
    context,
  }) => {
    test.skip(!process.env.DODO_API_KEY || !STUB_PORT, "needs DODO_API_KEY, DODO_API_BASE_URL and E2E_DODO_STUB_PORT");
    await loginAs(context, "free");
    await refresh(page);
    await page.goto(FIXTURE_ROUTE);
    await expect(page.getByTestId("paywall")).toBeVisible();

    // Pricing (live variant) → checkout consent step.
    await page.goto("/pricing");
    await page.getByRole("radio", { name: /Yearly/ }).click();
    await page.getByTestId("go-pro-pro_yearly").click();
    await expect(page).toHaveURL(/\/checkout\?plan=pro_yearly$/);
    const go = page.getByRole("button", { name: "Continue to secure checkout" });
    await expect(go).toBeDisabled();
    for (const box of await page.getByRole("checkbox").all()) await box.check();
    await go.click();
    await expect(page.getByRole("heading", { name: "Stub checkout" })).toBeVisible();

    const created = stub.requests.find((r) => r.path === "/checkouts")!;
    expect(created.body).toMatchObject({ metadata: { user_id: user, plan: "pro_yearly" } });
    const consents = await query<{ kind: string; text_version: string }>(
      `select kind, text_version from consent_log where user_id = $1 and kind <> 'age_confirmation'`,
      [user]
    );
    expect(consents.map((c) => c.text_version).sort()).toEqual([
      "checkout-terms-2026-11",
      "money-back-2026-11",
      "withdrawal-waiver-2026-11",
    ]);

    // The provider confirms the payment; the return page only asks the server.
    const subId = `sub_e2e_${Date.now()}`;
    const t = Date.now() - 60_000;
    expect(
      (
        await postWebhook(
          page.request,
          "subscription.active",
          dodoSubscription({
            subscriptionId: subId,
            userId: user,
            plan: "pro_yearly",
            periodEndDays: 365,
            currency: "EUR",
            amount: 9000,
            country: "DE",
          }),
          { at: new Date(t) }
        )
      ).status()
    ).toBe(200);
    await page.goto("/account/billing?status=success");
    await expect(page.getByTestId("checkout-return")).toContainText("You're Pro", { timeout: 15_000 });
    await expect(page.getByTestId("billing-plan")).toHaveText("Pro yearly");
    await expect(page.getByTestId("billing-price")).toContainText("€90.00");
    await expect(page.getByTestId("billing-renewal")).toBeVisible();
    await page.goto(FIXTURE_ROUTE);
    await expect(page.getByRole("heading", { name: PREMIUM_HEADING })).toBeVisible();

    // Cancel at period end: access is kept until then.
    await postWebhook(
      page.request,
      "subscription.renewed",
      dodoSubscription({
        subscriptionId: subId,
        userId: user,
        plan: "pro_yearly",
        periodEndDays: 20,
        cancelAtPeriodEnd: true,
      }),
      { at: new Date(t + 1000) }
    );
    expect(await (await refresh(page)).json()).toMatchObject({ tier: "pro" });
    await page.goto("/account/billing");
    await expect(page.getByText("Pro ends on")).toBeVisible();

    // The period ends (simulated: cancelled with the period end in the past) → access removed.
    await postWebhook(
      page.request,
      "subscription.cancelled",
      dodoSubscription({
        subscriptionId: subId,
        userId: user,
        plan: "pro_yearly",
        status: "cancelled",
        periodEndDays: -1,
      }),
      { at: new Date(t + 2000) }
    );
    expect(await (await refresh(page)).json()).toMatchObject({ tier: "free", stale: true });
    await page.goto(FIXTURE_ROUTE);
    await expect(page.getByTestId("paywall")).toBeVisible();
  });

  test("the portal button opens the provider's customer portal", async ({ page, context }) => {
    test.skip(!process.env.DODO_API_KEY || !STUB_PORT, "needs the Dodo stub");
    await loginAs(context, "free");
    await page.goto("/account/billing");
    await page.getByTestId("billing-manage").click();
    await expect(page.getByRole("heading", { name: "Stub portal" })).toBeVisible();
  });

  test("7-day money-back guarantee: the request link while eligible, and a refund ends access", async ({
    page,
    context,
  }) => {
    reseed("free");
    const id = await userId("free");
    const subId = `sub_refund_${Date.now()}`;
    const payId = `pay_refund_${Date.now()}`;
    const t = Date.now() - 60_000;
    await postWebhook(page.request, "subscription.active", dodoSubscription({ subscriptionId: subId, userId: id }), {
      at: new Date(t),
    });
    await postWebhook(page.request, "payment.succeeded", dodoPayment({ paymentId: payId, subscriptionId: subId }), {
      at: new Date(t + 500),
    });
    await loginAs(context, "free");
    expect(await (await refresh(page)).json()).toMatchObject({ tier: "pro" });
    await page.goto("/account/billing");
    await expect(page.getByTestId("refund-request")).toContainText("7-day money-back guarantee");
    await expect(page.getByRole("link", { name: "Request a refund" })).toHaveAttribute("href", /^mailto:/);

    // The owner issues the refund in the Dodo dashboard; its webhook ends access at once.
    expect(
      (
        await postWebhook(
          page.request,
          "refund.succeeded",
          dodoRefund({ refundId: `re_${Date.now()}`, paymentId: payId }),
          { at: new Date(t + 1000) }
        )
      ).status()
    ).toBe(200);
    expect(await (await refresh(page)).json()).toMatchObject({ tier: "free", stale: true });
    await page.goto(FIXTURE_ROUTE);
    await expect(page.getByTestId("paywall")).toBeVisible();
    // Once per customer: no second request.
    await page.goto("/account/billing");
    await expect(page.getByTestId("refund-request")).toHaveCount(0);
  });

  test("payment failed → on hold with the 7-day grace banner", async ({ page, context }) => {
    reseed("free");
    const id = await userId("free");
    const subId = `sub_hold_${Date.now()}`;
    const t = Date.now() - 60_000;
    await postWebhook(page.request, "subscription.active", dodoSubscription({ subscriptionId: subId, userId: id }), {
      at: new Date(t),
    });
    await postWebhook(
      page.request,
      "subscription.on_hold",
      dodoSubscription({ subscriptionId: subId, userId: id, status: "on_hold", periodEndDays: -1 }),
      { at: new Date(t + 1000) }
    );
    await loginAs(context, "free");
    expect(await (await refresh(page)).json()).toMatchObject({ tier: "pro", hold: true });
    await page.goto("/account/billing");
    await expect(page.getByTestId("on-hold-banner")).toContainText("7-day grace period");
    await page.goto(FIXTURE_ROUTE);
    await expect(page.getByRole("heading", { name: PREMIUM_HEADING })).toBeVisible();
  });
});
