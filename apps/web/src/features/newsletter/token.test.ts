import { describe, expect, it } from "vitest";
import { CONFIRM_TTL_SECONDS, signToken, verifyToken } from "./token";

const SECRET = "unit-test-secret-unit-test-secret-0123";
const T0 = 1_800_000_000;

describe("newsletter tokens", () => {
  it("round-trips the subscriber ID", async () => {
    const token = await signToken(SECRET, { subscriberId: "sub-1", purpose: "confirm", now: T0 });
    expect(await verifyToken(SECRET, token, "confirm", T0 + 60)).toEqual({
      ok: true,
      subscriberId: "sub-1",
      issuedAt: T0,
    });
  });

  it("never carries the email address or anything but the ID, purpose and times", async () => {
    const token = await signToken(SECRET, { subscriberId: "sub-1", purpose: "confirm", now: T0 });
    const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "p", "sid", "v"]);
  });

  it("confirm tokens expire after 48 hours", async () => {
    expect(CONFIRM_TTL_SECONDS).toBe(48 * 3600);
    const token = await signToken(SECRET, { subscriberId: "sub-1", purpose: "confirm", now: T0 });
    expect((await verifyToken(SECRET, token, "confirm", T0 + CONFIRM_TTL_SECONDS - 1)).ok).toBe(true);
    expect(await verifyToken(SECRET, token, "confirm", T0 + CONFIRM_TTL_SECONDS)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("unsubscribe tokens don't expire", async () => {
    const token = await signToken(SECRET, { subscriberId: "sub-1", purpose: "unsubscribe", now: T0 });
    expect((await verifyToken(SECRET, token, "unsubscribe", T0 + 10 * 365 * 86400)).ok).toBe(true);
  });

  it("rejects a token made for the other purpose", async () => {
    const token = await signToken(SECRET, { subscriberId: "sub-1", purpose: "unsubscribe", now: T0 });
    expect(await verifyToken(SECRET, token, "confirm", T0)).toEqual({ ok: false, reason: "wrong-purpose" });
  });

  it("rejects another secret, a changed payload and a changed signature", async () => {
    const token = await signToken(SECRET, { subscriberId: "sub-1", purpose: "confirm", now: T0 });
    expect(await verifyToken(`${SECRET}x`, token, "confirm", T0)).toEqual({ ok: false, reason: "bad-signature" });
    const [body, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ v: 1, sid: "sub-2", p: "confirm", iat: T0, exp: T0 + 9e9 }),
      "utf8"
    ).toString("base64url");
    expect((await verifyToken(SECRET, `${forged}.${sig}`, "confirm", T0)).ok).toBe(false);
    const flipped = sig.slice(0, -2) + (sig.endsWith("AA") ? "BB" : "AA");
    expect((await verifyToken(SECRET, `${body}.${flipped}`, "confirm", T0)).ok).toBe(false);
  });

  it("rejects malformed tokens", async () => {
    for (const bad of ["", "abc", "a.b.c", "!!!.???", `${"a".repeat(2000)}.b`]) {
      const result = await verifyToken(SECRET, bad, "confirm", T0);
      expect(result.ok, bad.slice(0, 20)).toBe(false);
    }
  });
});
