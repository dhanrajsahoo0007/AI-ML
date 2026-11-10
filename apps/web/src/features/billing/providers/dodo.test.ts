import { describe, expect, it, vi } from "vitest";
import {
  TEST_PRODUCTS,
  dodoDispute,
  dodoPayment,
  dodoRefund,
  dodoSubscription,
  envelope,
  signedHeaders,
  testWebhookSecret,
} from "../../../../tests/fixtures/billing/dodo";
import { ProviderError, WebhookVerificationError } from "../port";
import { TOLERANCE_SEC, signStandardWebhook, verifyStandardWebhook } from "../standard-webhooks";
import { DODO_HOSTS, dodoProvider, parseDodoEvent } from "./dodo";

const USER = "0190a3b4-0000-7000-8000-000000000001";
const secret = testWebhookSecret();

describe("Standard Webhooks verification", () => {
  const body = envelope("subscription.active", dodoSubscription({ subscriptionId: "sub_1", userId: USER }));

  it("accepts a correctly signed, fresh message and returns its id", async () => {
    const headers = new Headers(await signedHeaders(secret, body, { id: "msg_1" }));
    await expect(verifyStandardWebhook(secret, headers, body)).resolves.toMatchObject({ id: "msg_1" });
  });

  it("accepts any matching signature in a multi-signature header (secret rotation)", async () => {
    const h = await signedHeaders(secret, body);
    h["webhook-signature"] = `v1,AAAA ${h["webhook-signature"]}`;
    await expect(verifyStandardWebhook(secret, new Headers(h), body)).resolves.toBeTruthy();
  });

  it.each([
    ["a tampered body", async (h: Record<string, string>) => ({ h, b: body.replace("active", "expired") })],
    ["another secret", async () => ({ h: await signedHeaders(testWebhookSecret(), body), b: body })],
    ["a missing header", async (h: Record<string, string>) => ({ h: { ...h, "webhook-signature": "" }, b: body })],
    [
      "a non-numeric timestamp",
      async (h: Record<string, string>) => ({ h: { ...h, "webhook-timestamp": "soon" }, b: body }),
    ],
    [
      "a v0 signature",
      async (h: Record<string, string>) => ({
        h: { ...h, "webhook-signature": h["webhook-signature"].replace("v1,", "v0,") },
        b: body,
      }),
    ],
  ])("rejects %s", async (_label, make) => {
    const { h, b } = await make(await signedHeaders(secret, body));
    await expect(verifyStandardWebhook(secret, new Headers(h), b)).rejects.toBeInstanceOf(WebhookVerificationError);
  });

  it("rejects stale and future timestamps beyond 5 minutes (replays)", async () => {
    const now = Math.floor(Date.now() / 1000);
    for (const ts of [now - TOLERANCE_SEC - 1, now + TOLERANCE_SEC + 1]) {
      const h = await signedHeaders(secret, body, { timestamp: ts });
      await expect(verifyStandardWebhook(secret, new Headers(h), body)).rejects.toThrow(/tolerance/);
    }
    const ok = await signedHeaders(secret, body, { timestamp: now - TOLERANCE_SEC + 5 });
    await expect(verifyStandardWebhook(secret, new Headers(ok), body)).resolves.toBeTruthy();
  });

  it("rejects an unusable secret", async () => {
    await expect(signStandardWebhook("whsec_!!", "id", 1, "x")).rejects.toBeInstanceOf(WebhookVerificationError);
  });
});

describe("parseDodoEvent", () => {
  const at = new Date("2026-11-07T12:00:00Z");

  it("maps subscription events to snapshots with our user and plan", () => {
    const body = envelope(
      "subscription.renewed",
      dodoSubscription({
        subscriptionId: "sub_1",
        userId: USER,
        plan: "pro_yearly",
        country: "in",
        currency: "inr",
        amount: 299900,
        now: at,
      }),
      at
    );
    const e = parseDodoEvent(body, "msg_1", TEST_PRODUCTS);
    expect(e).toMatchObject({
      kind: "subscription",
      type: "renewed",
      id: "msg_1",
      occurredAt: at,
      subscription: {
        providerSubscriptionId: "sub_1",
        providerCustomerId: "cus_sub_1",
        userId: USER,
        plan: "pro_yearly",
        status: "active",
        currency: "INR",
        amountMinor: 299900,
        country: "IN",
        cancelAtPeriodEnd: false,
      },
    });
  });

  it("drops a user id that isn't a UUID and products that aren't ours; maps paused to on hold", () => {
    const raw = {
      ...dodoSubscription({ subscriptionId: "s", userId: null }),
      metadata: { user_id: "admin" },
      product_id: "pdt_other",
      status: "paused",
    };
    const e = parseDodoEvent(envelope("subscription.plan_changed", raw), "m", TEST_PRODUCTS);
    expect(e).toMatchObject({ kind: "subscription", subscription: { userId: null, plan: null, status: "on_hold" } });
  });

  it("maps payments, refunds and disputes", () => {
    expect(
      parseDodoEvent(
        envelope("payment.succeeded", dodoPayment({ paymentId: "pay_1", subscriptionId: "sub_1", tax: 81 })),
        "m",
        TEST_PRODUCTS
      )
    ).toMatchObject({
      kind: "payment",
      type: "succeeded",
      payment: {
        providerPaymentId: "pay_1",
        providerSubscriptionId: "sub_1",
        amountMinor: 900,
        taxMinor: 81,
        method: "card",
      },
    });
    expect(
      parseDodoEvent(
        envelope("payment.failed", dodoPayment({ paymentId: "pay_2", status: "failed" })),
        "m",
        TEST_PRODUCTS
      )
    ).toMatchObject({
      kind: "payment",
      type: "failed",
    });
    expect(
      parseDodoEvent(
        envelope("refund.succeeded", dodoRefund({ refundId: "re_1", paymentId: "pay_1", partial: true })),
        "m",
        TEST_PRODUCTS
      )
    ).toMatchObject({
      kind: "refund",
      refund: { providerPaymentId: "pay_1", partial: true, amountMinor: 900 },
    });
    for (const t of ["opened", "won", "lost"] as const) {
      expect(
        parseDodoEvent(
          envelope(`dispute.${t}`, dodoDispute({ disputeId: "dp", paymentId: "pay_1" })),
          "m",
          TEST_PRODUCTS
        )
      ).toMatchObject({
        kind: "dispute",
        type: t,
        dispute: { amountMinor: 900 },
      });
    }
  });

  it("records other events as ignored and refuses malformed bodies", () => {
    expect(parseDodoEvent(envelope("license_key.created", {}), "m", TEST_PRODUCTS)).toMatchObject({
      kind: "ignored",
      type: "license_key.created",
    });
    expect(() => parseDodoEvent("not json", "m", TEST_PRODUCTS)).toThrow(WebhookVerificationError);
    expect(() =>
      parseDodoEvent(envelope("subscription.active", { subscription_id: "x" }), "m", TEST_PRODUCTS)
    ).toThrow();
    expect(() =>
      parseDodoEvent(JSON.stringify({ type: "x", timestamp: "nope", data: {} }), "m", TEST_PRODUCTS)
    ).toThrow();
  });
});

describe("dodoProvider API client (stubbed fetch, never the real API)", () => {
  function stub(responses: Record<string, unknown>, status = 200) {
    return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const key = `${init?.method ?? "GET"} ${new URL(String(url)).pathname}`;
      return new Response(JSON.stringify(responses[key] ?? {}), { status });
    });
  }
  const config = {
    apiKey: "test_key_not_real",
    webhookSecret: secret,
    environment: "test_mode" as const,
    ...TEST_PRODUCTS,
  };

  it("creates a checkout with the server-side user id in metadata, the country and the product", async () => {
    const fetch = stub({
      "POST /checkouts": { session_id: "cks_1", checkout_url: "https://test.checkout.dodopayments.com/cks_1" },
    });
    const p = dodoProvider({ ...config, fetch });
    const res = await p.createCheckout({
      userId: USER,
      email: "a@users.tokenstoscale.test",
      name: "A",
      plan: "pro_yearly",
      country: "DE",
      locale: "de-DE",
      returnUrl: "https://example.test/account/billing?status=success",
    });
    expect(res).toEqual({ url: "https://test.checkout.dodopayments.com/cks_1", sessionId: "cks_1" });
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe(`${DODO_HOSTS.test_mode}/checkouts`);
    expect((init!.headers as Record<string, string>).authorization).toBe("Bearer test_key_not_real");
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({
      product_cart: [{ product_id: TEST_PRODUCTS.DODO_PRODUCT_PRO_YEARLY, quantity: 1 }],
      customer: { email: "a@users.tokenstoscale.test", name: "A" },
      billing_address: { country: "DE" },
      metadata: { user_id: USER, plan: "pro_yearly", locale: "de-DE" },
      return_url: "https://example.test/account/billing?status=success",
    });
  });

  it("reuses an existing customer", async () => {
    const fetch = stub({ "POST /checkouts": { session_id: "c", checkout_url: "https://x.test/c" } });
    await dodoProvider({ ...config, fetch }).createCheckout({
      userId: USER,
      email: "e",
      name: "n",
      plan: "pro_monthly",
      country: null,
      customerId: "cus_9",
      returnUrl: "https://x.test",
    });
    expect(JSON.parse(String(fetch.mock.calls[0][1]!.body)).customer).toEqual({ customer_id: "cus_9" });
  });

  it("opens the portal, gets, lists and cancels subscriptions", async () => {
    const sub = dodoSubscription({ subscriptionId: "sub_1", userId: USER });
    const fetch = stub({
      "POST /customers/cus_1/customer-portal/session": { link: "https://portal.test/x" },
      "GET /subscriptions/sub_1": sub,
      "GET /subscriptions": { items: [sub] },
      "PATCH /subscriptions/sub_1": {},
    });
    const p = dodoProvider({ ...config, baseUrl: "http://127.0.0.1:9/", fetch });
    expect(await p.createPortalSession("cus_1", "https://x.test")).toEqual({ url: "https://portal.test/x" });
    expect((await p.getSubscription("sub_1")).providerSubscriptionId).toBe("sub_1");
    expect(await p.listActiveSubscriptions()).toMatchObject({
      items: [{ providerSubscriptionId: "sub_1" }],
      next: undefined,
    });
    await p.cancel("sub_1");
    const cancel = fetch.mock.calls.find(([, i]) => i?.method === "PATCH")!;
    expect(String(cancel[0])).toBe("http://127.0.0.1:9/subscriptions/sub_1");
    expect(JSON.parse(String(cancel[1]!.body))).toEqual({ status: "cancelled" });
  });

  it("pages through long lists", async () => {
    const items = Array.from({ length: 100 }, (_, i) => dodoSubscription({ subscriptionId: `s${i}`, userId: USER }));
    const p = dodoProvider({ ...config, fetch: stub({ "GET /subscriptions": { items } }) });
    expect((await p.listActiveSubscriptions("2")).next).toBe("3");
  });

  it("fails without echoing the provider's body, without a key, and without a product", async () => {
    const p = dodoProvider({ ...config, fetch: stub({}, 500) });
    await expect(p.getSubscription("sub_1")).rejects.toThrow(/failed with 500/);
    await expect(dodoProvider({ ...config, apiKey: undefined }).getSubscription("s")).rejects.toBeInstanceOf(
      ProviderError
    );
    await expect(
      dodoProvider({ ...config, DODO_PRODUCT_PRO_MONTHLY: undefined }).createCheckout({
        userId: USER,
        email: "e",
        name: "n",
        plan: "pro_monthly",
        country: null,
        returnUrl: "https://x.test",
      })
    ).rejects.toThrow(/No Dodo product/);
  });

  it("verifies webhooks with the configured secret only", async () => {
    const body = envelope("payment.succeeded", dodoPayment({ paymentId: "p" }));
    const headers = new Headers(await signedHeaders(secret, body, { id: "msg_9" }));
    await expect(dodoProvider(config).verifyWebhook({ headers, body })).resolves.toEqual({ eventId: "msg_9" });
    await expect(
      dodoProvider({ ...config, webhookSecret: undefined }).verifyWebhook({ headers, body })
    ).rejects.toBeInstanceOf(WebhookVerificationError);
    expect(dodoProvider(config).parseEvent(body, "msg_9")).toMatchObject({ kind: "payment", id: "msg_9" });
  });
});
