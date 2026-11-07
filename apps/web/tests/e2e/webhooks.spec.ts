import { expect, test } from "@playwright/test";
import { dbE2E, reseed, SKIP_REASON } from "../fixtures/users";
import { dodoSubscription, testWebhookSecret } from "../fixtures/billing/dodo";
import { postWebhook, query, userId, webhookSecret } from "../fixtures/billing/e2e";

// @core webhooks (plan §12.2): signed fixture events posted to the running server's webhook endpoint.

test.describe("billing webhooks @core", () => {
  test.skip(() => !dbE2E || !webhookSecret(), `${SKIP_REASON}, plus DODO_WEBHOOK_SECRET`);
  test.describe.configure({ mode: "serial" });

  let user: string;
  test.beforeAll(async () => {
    reseed("free");
    user = await userId("free");
  });
  const subId = () => `sub_e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const status = async (id: string) =>
    (await query<{ status: string }>(`select status from subscription where provider_subscription_id = $1`, [id]))[0]
      ?.status;

  test("valid → 200 and the subscription is recorded", async ({ request }) => {
    const id = subId();
    const res = await postWebhook(
      request,
      "subscription.active",
      dodoSubscription({ subscriptionId: id, userId: user })
    );
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ received: true, status: "processed" });
    expect(await status(id)).toBe("active");
    expect(res.headers()["cache-control"]).toBe("no-store");
  });

  test("bad signature → 401 and no state change", async ({ request }) => {
    const id = subId();
    const res = await postWebhook(
      request,
      "subscription.active",
      dodoSubscription({ subscriptionId: id, userId: user }),
      {
        secret: testWebhookSecret(),
      }
    );
    expect(res.status()).toBe(401);
    expect(await status(id)).toBeUndefined();
  });

  test("stale timestamp → 401", async ({ request }) => {
    const id = subId();
    const res = await postWebhook(
      request,
      "subscription.active",
      dodoSubscription({ subscriptionId: id, userId: user }),
      {
        timestamp: Math.floor(Date.now() / 1000) - 10 * 60,
      }
    );
    expect(res.status()).toBe(401);
    expect(await status(id)).toBeUndefined();
  });

  test("the same event twice → processed once", async ({ request }) => {
    const id = subId();
    const data = dodoSubscription({ subscriptionId: id, userId: user });
    const eventId = `msg_${id}`;
    expect(await (await postWebhook(request, "subscription.active", data, { id: eventId })).json()).toMatchObject({
      status: "processed",
    });
    expect(await (await postWebhook(request, "subscription.active", data, { id: eventId })).json()).toMatchObject({
      status: "duplicate",
    });
    const [{ count }] = await query<{ count: string }>(`select count(*) from webhook_event where event_id = $1`, [
      eventId,
    ]);
    expect(count).toBe("1");
  });

  test("out of order (renewed before active) → the renewed period wins", async ({ request }) => {
    const id = subId();
    const t0 = Date.now() - 60_000;
    await postWebhook(
      request,
      "subscription.renewed",
      dodoSubscription({ subscriptionId: id, userId: user, periodEndDays: 60 }),
      { at: new Date(t0 + 30_000) }
    );
    await postWebhook(
      request,
      "subscription.active",
      dodoSubscription({ subscriptionId: id, userId: user, periodEndDays: 30 }),
      { at: new Date(t0) }
    );
    const [row] = await query<{ current_period_end: Date }>(
      `select current_period_end from subscription where provider_subscription_id = $1`,
      [id]
    );
    expect(new Date(row.current_period_end).getTime()).toBeGreaterThan(Date.now() + 59 * 86_400_000);
  });

  test("the webhook needs no Origin header but rejects unknown providers", async ({ request }) => {
    expect((await request.post("/api/billing/webhook/unknown", { data: "{}" })).status()).toBe(404);
  });
});
