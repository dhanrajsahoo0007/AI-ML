import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { call, setupAuthTestEnv, testLoginAs } from "@/features/auth/test-helpers";
import { testUserEmail } from "@/server/db/test-users";
import { testDatabaseAvailable } from "@/server/db/testing";
import { signWebhook } from "../email/webhook-signature";

// The newsletter API end to end against Docker Postgres (`npm run db:up -w web`; skipped without it): the
// anonymous double opt-in with consent_log, the signed-in one click, the Resend webhook (signature, idempotency,
// suppression) and the section gate. Emails go to a temporary dev outbox.

const available = await testDatabaseAvailable();

const SECTION_NAV = JSON.stringify([
  { key: "newsletter", kind: "newsletter", label: "Newsletter", href: "/newsletter", icon: "mail", navGroup: "more" },
]);
const WEBHOOK_SECRET = `whsec_${Buffer.from("integration-webhook-secret-0123456789").toString("base64")}`;

describe.skipIf(!available)("newsletter API (integration)", () => {
  let env: Awaited<ReturnType<typeof setupAuthTestEnv>>;
  let outbox: string;

  beforeAll(async () => {
    outbox = fs.mkdtempSync(path.join(os.tmpdir(), "newsletter-outbox-"));
    env = await setupAuthTestEnv({
      APP_ENV: "preview",
      SECTION_NAV,
      NEWSLETTER_TOKEN_SECRET: "integration-newsletter-secret-0123456789",
      RESEND_WEBHOOK_SECRET: WEBHOOK_SECRET,
      DEV_MAIL_DIR: outbox,
      TURNSTILE_SECRET_KEY: "",
      RESEND_API_KEY: "",
    });
  });
  afterAll(async () => {
    await env?.teardown();
    fs.rmSync(outbox, { recursive: true, force: true });
  });

  const db = () => env.tdb.db;
  const rows = async <T>(q: ReturnType<typeof sql>) => (await db().execute(q)).rows as T[];
  const subscriberRow = async (email: string) =>
    (
      await rows<{ id: string; status: string; user_id: string | null; source: string }>(
        sql`select id, status, user_id, source from newsletter_subscriber where email = ${email}`
      )
    )[0];
  const consents = (subscriberId: string) =>
    rows<{ kind: string; text_version: string; user_id: string | null }>(
      sql`select kind, text_version, user_id from consent_log where subscriber_id = ${subscriberId} order by at, id`
    );

  /** The text part of the latest outbox email of `template` to `to`. */
  function mail(template: string, to: string): string {
    const needle = `-${template}-${to.replace(/[^a-z0-9]+/g, "_")}-`;
    const file = fs
      .readdirSync(outbox)
      .filter((f) => f.includes(needle))
      .sort()
      .at(-1);
    expect(file, `${template} email to ${to}`).toBeTruthy();
    return fs.readFileSync(path.join(outbox, file!), "utf8");
  }
  const tokenFrom = (text: string, page: string) =>
    decodeURIComponent(new RegExp(`/newsletter/${page}\\?token=([A-Za-z0-9._%-]+)`).exec(text)![1]);

  const api = {
    subscribe: async () => (await import("@/app/api/newsletter/subscribe/route")).POST,
    confirm: async () => (await import("@/app/api/newsletter/confirm/route")).POST,
    unsubscribe: async () => (await import("@/app/api/newsletter/unsubscribe/route")).POST,
    account: async () => import("@/app/api/newsletter/account/route"),
    webhook: async () => (await import("@/app/api/webhooks/resend/route")).POST,
  };

  it("anonymous double opt-in: pending → confirm (consent_log opt-in) → one-click unsubscribe (withdrawal)", async () => {
    const email = "anon@example.com";
    const res = await call(await api.subscribe(), "/api/newsletter/subscribe", {
      method: "POST",
      body: { email: "  Anon@Example.com " },
      headers: { "x-forwarded-for": "198.18.0.1", "cf-ipcountry": "DE" },
    });
    expect(res.status).toBe(202);
    expect(await subscriberRow(email)).toMatchObject({ status: "pending", source: "archive" });

    const confirmToken = tokenFrom(mail("confirm-subscription", email), "confirm");
    const confirmed = await call(await api.confirm(), "/api/newsletter/confirm", {
      method: "POST",
      body: { token: confirmToken },
    });
    expect(confirmed.status).toBe(200);
    const row = await subscriberRow(email);
    expect(row.status).toBe("active");
    expect(await consents(row.id)).toEqual([{ kind: "newsletter_opt_in", text_version: "2026-11-07", user_id: null }]);

    // RFC 8058 one-click: form body, no Origin, no cookies.
    const welcome = mail("welcome", email);
    const unsubToken = /List-Unsubscribe: <[^>]*token=([^>]+)>/.exec(welcome)![1];
    const off = await call(await api.unsubscribe(), `/api/newsletter/unsubscribe?token=${unsubToken}`, {
      method: "POST",
      origin: null,
      body: "List-Unsubscribe=One-Click",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    expect(off.status).toBe(200);
    expect(await off.json()).toEqual({ status: "unsubscribed" });
    expect((await subscriberRow(email)).status).toBe("unsubscribed");
    expect((await consents(row.id)).map((c) => c.text_version)).toEqual(["2026-11-07", "withdrawn"]);

    // The old confirm link can't re-activate it.
    const again = await call(await api.confirm(), "/api/newsletter/confirm", {
      method: "POST",
      body: { token: confirmToken },
    });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: { code: "not_pending" } });
  });

  it("the subscribe API refuses cross-origin posts, unknown fields and bad emails", async () => {
    const subscribe = await api.subscribe();
    const post = (body: unknown, origin?: string | null) =>
      call(subscribe, "/api/newsletter/subscribe", {
        method: "POST",
        body,
        origin,
        headers: { "x-forwarded-for": "198.18.0.2" },
      });
    expect((await post({ email: "x@example.com" }, "https://evil.example")).status).toBe(403);
    expect((await post({ email: "x@example.com", extra: 1 })).status).toBe(400);
    expect((await post({ email: "nope" })).status).toBe(400);
  });

  it("signed-in one click: GET status, POST subscribe (no double opt-in), POST unsubscribe", async () => {
    const { GET, POST } = await api.account();
    expect(await (await call(GET, "/api/newsletter/account")).json()).toEqual({ signedIn: false });
    expect(
      (await call(POST, "/api/newsletter/account", { method: "POST", body: { action: "subscribe" } })).status
    ).toBe(401);

    const cookie = await testLoginAs("free");
    const email = testUserEmail("free");
    const status = async () => (await (await call(GET, "/api/newsletter/account", { cookie })).json()) as unknown;
    expect(await status()).toEqual({ signedIn: true, status: "none", email });

    const on = await call(POST, "/api/newsletter/account", { method: "POST", body: { action: "subscribe" }, cookie });
    expect(on.status).toBe(200);
    expect(await on.json()).toEqual({ signedIn: true, status: "active", email });
    const row = await subscriberRow(email);
    expect(row).toMatchObject({ status: "active", user_id: env.ids.free, source: "account" });
    expect(await consents(row.id)).toEqual([
      { kind: "newsletter_opt_in", text_version: "2026-11-07", user_id: env.ids.free },
    ]);
    // A welcome email (with one-click unsubscribe), and no confirmation email.
    expect(mail("welcome", email)).toContain("List-Unsubscribe-Post: List-Unsubscribe=One-Click");
    expect(fs.readdirSync(outbox).some((f) => f.includes(`confirm-subscription-${email.replace(/[^a-z0-9]+/g, "_")}`))).toBe(
      false
    );

    const off = await call(POST, "/api/newsletter/account", { method: "POST", body: { action: "unsubscribe" }, cookie });
    expect(await off.json()).toEqual({ signedIn: true, status: "unsubscribed", email });
    expect((await consents(row.id)).map((c) => c.text_version)).toEqual(["2026-11-07", "withdrawn"]);

    // Cross-origin posts are refused even with the session cookie.
    const csrf = await call(POST, "/api/newsletter/account", {
      method: "POST",
      body: { action: "subscribe" },
      cookie,
      origin: "https://evil.example",
    });
    expect(csrf.status).toBe(403);
  });

  describe("Resend webhook", () => {
    let n = 0;
    async function deliver(event: unknown, opts: { id?: string; secret?: string; at?: number } = {}) {
      const body = JSON.stringify(event);
      const id = opts.id ?? `msg_integration_${++n}`;
      const at = opts.at ?? Math.floor(Date.now() / 1000);
      const signature = await signWebhook(opts.secret ?? WEBHOOK_SECRET, id, at, body);
      return call(await api.webhook(), "/api/webhooks/resend", {
        method: "POST",
        origin: null,
        body,
        headers: { "svix-id": id, "svix-timestamp": String(at), "svix-signature": signature },
      });
    }
    const event = (type: string, to: string, data: Record<string, unknown> = {}) => ({
      type,
      created_at: "2027-01-15T08:00:00.000Z",
      data: { email_id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c", to: [to], created_at: "2027-01-15T08:00:00.000Z", ...data },
    });
    const events = (email: string) =>
      rows<{ type: string; issue_slug: string }>(
        sql`select e.type, e.issue_slug from newsletter_event e join newsletter_subscriber s on s.id = e.subscriber_id
            where s.email = ${email} order by e.at, e.id`
      );

    it("a hard bounce suppresses the address and records the event, once", async () => {
      const { POST } = await api.account();
      const cookie = await testLoginAs("pro_yearly");
      const email = testUserEmail("pro_yearly");
      await call(POST, "/api/newsletter/account", { method: "POST", body: { action: "subscribe" }, cookie });

      const bounce = event("email.bounced", email, {
        tags: { issue: "system-design-digest-1" },
        bounce: { type: "Permanent", subType: "General" },
      });
      const first = await deliver(bounce, { id: "msg_bounce_1" });
      expect(first.status).toBe(200);
      expect(await first.json()).toEqual({ received: true, status: "processed" });
      expect((await subscriberRow(email)).status).toBe("bounced");
      expect(await events(email)).toEqual([{ type: "bounced", issue_slug: "system-design-digest-1" }]);

      const dup = await deliver(bounce, { id: "msg_bounce_1" });
      expect(await dup.json()).toEqual({ received: true, status: "duplicate" });
      expect(await events(email)).toHaveLength(1);
      const stored = await rows<{ payload: unknown; processed_at: Date | null }>(
        sql`select payload, processed_at from webhook_event where provider = 'resend' and event_id = 'msg_bounce_1'`
      );
      expect(stored[0].processed_at).not.toBeNull();
      expect(JSON.stringify(stored[0].payload)).not.toContain(email);

      // Suppressed: the account shows it and one click can't revive it.
      const again = await call(POST, "/api/newsletter/account", { method: "POST", body: { action: "subscribe" }, cookie });
      expect(await again.json()).toMatchObject({ status: "suppressed" });
    });

    it("complaints suppress unknown addresses; opens are recorded only for known subscribers", async () => {
      expect((await deliver(event("email.complained", "stranger@example.com"))).status).toBe(200);
      expect((await subscriberRow("stranger@example.com")).status).toBe("complained");

      expect((await deliver(event("email.opened", "nobody@example.com"))).status).toBe(200);
      expect(await subscriberRow("nobody@example.com")).toBeUndefined();

      const known = "Reader <stranger@example.com>";
      await deliver(event("email.delivered", known, { broadcast_id: "bc_123" }));
      expect(await events("stranger@example.com")).toEqual([
        { type: "complained", issue_slug: "unknown" },
        { type: "delivered", issue_slug: "broadcast:bc_123" },
      ]);

      const ignored = await deliver(event("email.sent", "stranger@example.com"));
      expect(await ignored.json()).toEqual({ received: true, status: "ignored" });
    });

    it("a soft bounce is recorded without suppressing", async () => {
      const subscribe = await api.subscribe();
      await call(subscribe, "/api/newsletter/subscribe", {
        method: "POST",
        body: { email: "soft@example.com" },
        headers: { "x-forwarded-for": "198.18.0.3" },
      });
      await deliver(event("email.bounced", "soft@example.com", { bounce: { type: "Transient" }, tags: { template: "confirm-subscription" } }));
      expect((await subscriberRow("soft@example.com")).status).toBe("pending");
      expect(await events("soft@example.com")).toEqual([{ type: "bounced", issue_slug: "template:confirm-subscription" }]);
    });

    it("refuses bad signatures, stale timestamps and unsigned requests, storing nothing", async () => {
      const before = (await rows<{ n: number }>(sql`select count(*)::int as n from webhook_event`))[0].n;
      const wrong = `whsec_${Buffer.from("not-the-right-secret-0123456789").toString("base64")}`;
      expect((await deliver(event("email.bounced", "x@example.com"), { secret: wrong })).status).toBe(401);
      expect(
        (await deliver(event("email.bounced", "x@example.com"), { at: Math.floor(Date.now() / 1000) - 301 })).status
      ).toBe(401);
      const unsigned = await call(await api.webhook(), "/api/webhooks/resend", {
        method: "POST",
        origin: null,
        body: event("email.bounced", "x@example.com"),
      });
      expect(unsigned.status).toBe(401);
      expect(await unsigned.json()).toMatchObject({ error: { code: "invalid_signature" } });
      expect((await rows<{ n: number }>(sql`select count(*)::int as n from webhook_event`))[0].n).toBe(before);
      expect(await subscriberRow("x@example.com")).toBeUndefined();
    });
  });

  it("every newsletter route is a 404 when the section is off", async () => {
    vi.resetModules();
    vi.stubEnv("SECTION_NAV", "[]");
    const routes: [string, (r: Request, c: { params: Promise<Record<string, string>> }) => Promise<Response>][] = [
      ["/api/newsletter/subscribe", (await import("@/app/api/newsletter/subscribe/route")).POST],
      ["/api/newsletter/confirm", (await import("@/app/api/newsletter/confirm/route")).POST],
      ["/api/newsletter/unsubscribe", (await import("@/app/api/newsletter/unsubscribe/route")).POST],
      ["/api/newsletter/account", (await import("@/app/api/newsletter/account/route")).POST],
      ["/api/webhooks/resend", (await import("@/app/api/webhooks/resend/route")).POST],
    ];
    for (const [url, handler] of routes) {
      const res = await call(handler, url, { method: "POST", body: { email: "a@example.com", token: "x" } });
      expect(res.status, url).toBe(404);
    }
    const { GET } = await import("@/app/api/newsletter/account/route");
    expect((await call(GET, "/api/newsletter/account")).status).toBe(404);
  });
});
