import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signWebhook, verifyWebhookSignature } from "./webhook-signature";

// Resend (Svix) webhook signatures. The reference vector is computed with node:crypto independently of the
// Web Crypto code under test.

const KEY = Buffer.from("resend-webhook-unit-test-key-0123456789");
const SECRET = `whsec_${KEY.toString("base64")}`;
const ID = "msg_2pQnB3Zp1Xk9fV7yYw2qWJ0mC4d";
const T = 1_800_000_000;
const BODY = JSON.stringify({ type: "email.bounced", created_at: "2027-01-15T08:00:00.000Z", data: { to: ["a@example.com"] } });

const reference = (body = BODY, id = ID, t = T) =>
  `v1,${createHmac("sha256", KEY).update(`${id}.${t}.${body}`).digest("base64")}`;

const headers = (signature: string, id = ID, t: number | string = T) =>
  new Headers({ "svix-id": id, "svix-timestamp": String(t), "svix-signature": signature });

describe("Resend webhook signatures", () => {
  it("accepts a valid signature (matches an independent HMAC)", async () => {
    expect(await signWebhook(SECRET, ID, T, BODY)).toBe(reference());
    expect(await verifyWebhookSignature({ secret: SECRET, headers: headers(reference()), body: BODY, now: T })).toEqual(
      { ok: true, id: ID, timestamp: T }
    );
  });

  it("accepts when any one of several signatures matches (secret rotation)", async () => {
    const other = `v1,${createHmac("sha256", "old-key").update(`${ID}.${T}.${BODY}`).digest("base64")}`;
    const res = await verifyWebhookSignature({
      secret: SECRET,
      headers: headers(`v2,abc ${other} ${reference()}`),
      body: BODY,
      now: T,
    });
    expect(res.ok).toBe(true);
  });

  it("accepts the Standard Webhooks header names too", async () => {
    const h = new Headers({ "webhook-id": ID, "webhook-timestamp": String(T), "webhook-signature": reference() });
    expect((await verifyWebhookSignature({ secret: SECRET, headers: h, body: BODY, now: T })).ok).toBe(true);
  });

  it("rejects a changed body, id or timestamp", async () => {
    const sig = reference();
    for (const [h, body] of [
      [headers(sig), BODY.replace("bounced", "delivered")],
      [headers(sig, "msg_other"), BODY],
      [headers(sig, ID, T + 1), BODY],
    ] as const) {
      expect(await verifyWebhookSignature({ secret: SECRET, headers: h, body, now: T })).toEqual({
        ok: false,
        reason: "no-match",
      });
    }
  });

  it("rejects the wrong secret", async () => {
    const wrong = `whsec_${Buffer.from("another-key-another-key-0123456789").toString("base64")}`;
    expect(await verifyWebhookSignature({ secret: wrong, headers: headers(reference()), body: BODY, now: T })).toEqual(
      { ok: false, reason: "no-match" }
    );
  });

  it("enforces a 5-minute window both ways", async () => {
    const at = (now: number) => verifyWebhookSignature({ secret: SECRET, headers: headers(reference()), body: BODY, now });
    expect((await at(T + 300)).ok).toBe(true);
    expect((await at(T - 300)).ok).toBe(true);
    expect(await at(T + 301)).toEqual({ ok: false, reason: "too-old" });
    expect(await at(T - 301)).toEqual({ ok: false, reason: "too-new" });
  });

  it("rejects missing headers, malformed timestamps and signatures, and a bad secret", async () => {
    const check = (h: Headers, secret = SECRET) => verifyWebhookSignature({ secret, headers: h, body: BODY, now: T });
    expect(await check(new Headers({ "svix-id": ID, "svix-timestamp": String(T) }))).toMatchObject({
      reason: "missing-headers",
    });
    expect(await check(headers(reference(), ID, "17e8"))).toMatchObject({ reason: "bad-timestamp" });
    expect(await check(headers("v1,not base64!!"))).toMatchObject({ reason: "no-match" });
    expect(await check(headers("garbage"))).toMatchObject({ reason: "no-match" });
    expect(await check(headers(reference()), "whsec_???")).toMatchObject({ reason: "bad-secret" });
    expect(await check(headers(reference()), "whsec_c2hvcnQ=")).toMatchObject({ reason: "bad-secret" });
  });
});
