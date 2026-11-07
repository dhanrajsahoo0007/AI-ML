import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  CLOCK_TOLERANCE_SEC,
  isAdmin,
  keyringFromEnv,
  parseKey,
  signEntitlement,
  verifyEntitlement,
  type EntitlementKey,
} from "./entitlement";

// Test keys are generated per run; nothing here is a real secret.
function randomSecret(bytes = 32): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...raw))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const CURRENT = `k2:${randomSecret()}`;
const PREVIOUS = `k1:${randomSecret()}`;
const OTHER = `k2:${randomSecret()}`;

const key = (value: string) => parseKey(value) as EntitlementKey;
const now = new Date("2026-11-07T12:00:00Z");
const nowSec = Math.floor(now.getTime() / 1000);
const admin = { sub: "user_1", tier: "pro", role: "admin", v: 3 } as const;

describe("parseKey", () => {
  it("parses <kid>:<base64url secret>", () => {
    const k = parseKey(CURRENT);
    expect(k?.kid).toBe("k2");
    expect(k?.secret.byteLength).toBe(32);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["no kid", `:${randomSecret()}`],
    ["no separator", randomSecret()],
    ["bad kid", `k 1:${randomSecret()}`],
    ["short secret (< 256 bits)", `k1:${randomSecret(16)}`],
    ["not base64url", "k1:not*base64!"],
  ])("rejects %s", (_label, value) => {
    expect(parseKey(value)).toBeNull();
  });
});

describe("keyringFromEnv", () => {
  it("is null without a current key, so nobody is admin", async () => {
    expect(keyringFromEnv(undefined, PREVIOUS)).toBeNull();
    const token = await signEntitlement(admin, key(CURRENT), now);
    expect(await verifyEntitlement(token, keyringFromEnv(undefined, undefined), now)).toBeNull();
  });

  it("ignores a previous key that reuses the current kid", () => {
    expect(keyringFromEnv(CURRENT, `k2:${randomSecret()}`)?.previous).toBeUndefined();
  });
});

describe("verifyEntitlement", () => {
  const keyring = keyringFromEnv(CURRENT, PREVIOUS);

  it("accepts a token signed with the current key", async () => {
    const token = await signEntitlement(admin, key(CURRENT), now);
    const claims = await verifyEntitlement(token, keyring, now);
    expect(claims).toMatchObject({ sub: "user_1", tier: "pro", role: "admin", v: 3, exp: nowSec + 900 });
    expect(isAdmin(claims)).toBe(true);
  });

  it("accepts a token signed with the previous key (rotation)", async () => {
    const token = await signEntitlement(admin, key(PREVIOUS), now);
    expect(await verifyEntitlement(token, keyring, now)).not.toBeNull();
  });

  it("rejects a forged signature (same kid, different secret)", async () => {
    const token = await signEntitlement(admin, key(OTHER), now);
    expect(await verifyEntitlement(token, keyring, now)).toBeNull();
  });

  it("rejects an unknown kid", async () => {
    const token = await signEntitlement(admin, { ...key(CURRENT), kid: "k9" }, now);
    expect(await verifyEntitlement(token, keyring, now)).toBeNull();
  });

  it("rejects a token without a kid", async () => {
    const token = await new SignJWT({ tier: "pro", role: "admin", v: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_1")
      .setIssuedAt(nowSec)
      .setExpirationTime(nowSec + 60)
      .sign(key(CURRENT).secret);
    expect(await verifyEntitlement(token, keyring, now)).toBeNull();
  });

  it("rejects alg=none and other algorithms", async () => {
    const header = btoa(JSON.stringify({ alg: "none", kid: "k2" })).replace(/=+$/, "");
    const body = btoa(JSON.stringify({ ...admin, exp: nowSec + 60 })).replace(/=+$/, "");
    expect(await verifyEntitlement(`${header}.${body}.`, keyring, now)).toBeNull();
    const hs512 = await new SignJWT({ tier: "pro", role: "admin", v: 1 })
      .setProtectedHeader({ alg: "HS512", kid: "k2" })
      .setSubject("user_1")
      .setIssuedAt(nowSec)
      .setExpirationTime(nowSec + 60)
      .sign(new Uint8Array(64).fill(1));
    expect(await verifyEntitlement(hs512, keyring, now)).toBeNull();
  });

  it("rejects a tampered payload (role changed after signing)", async () => {
    const token = await signEntitlement({ ...admin, role: "user" }, key(CURRENT), now);
    const [h, , s] = token.split(".");
    const forged = btoa(JSON.stringify({ ...admin, exp: nowSec + 900, iat: nowSec }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifyEntitlement(`${h}.${forged}.${s}`, keyring, now)).toBeNull();
  });

  it("rejects an expired token, allowing ±2 minutes of clock skew", async () => {
    const token = await signEntitlement({ ...admin, exp: nowSec }, key(CURRENT), now);
    const within = new Date(now.getTime() + (CLOCK_TOLERANCE_SEC - 5) * 1000);
    const beyond = new Date(now.getTime() + (CLOCK_TOLERANCE_SEC + 5) * 1000);
    expect(await verifyEntitlement(token, keyring, within)).not.toBeNull();
    expect(await verifyEntitlement(token, keyring, beyond)).toBeNull();
  });

  it("rejects a token older than its lifetime even with a far exp", async () => {
    const token = await signEntitlement({ ...admin, exp: nowSec + 86_400 }, key(CURRENT), now);
    const later = new Date(now.getTime() + (900 + CLOCK_TOLERANCE_SEC + 5) * 1000);
    expect(await verifyEntitlement(token, keyring, later)).toBeNull();
  });

  it("rejects a token without iat", async () => {
    const token = await new SignJWT({ tier: "pro", role: "admin", v: 1 })
      .setProtectedHeader({ alg: "HS256", kid: "k2" })
      .setSubject("user_1")
      .setExpirationTime(nowSec + 60)
      .sign(key(CURRENT).secret);
    expect(await verifyEntitlement(token, keyring, now)).toBeNull();
  });

  it("rejects a token issued in the future beyond the skew", async () => {
    const future = new Date(now.getTime() + 10 * 60 * 1000);
    const token = await signEntitlement(admin, key(CURRENT), future);
    expect(await verifyEntitlement(token, keyring, now)).toBeNull();
  });

  it("rejects claims outside the schema (unknown role or tier, missing v)", async () => {
    const sign = (payload: Record<string, unknown>) =>
      new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256", kid: "k2" })
        .setSubject("user_1")
        .setIssuedAt(nowSec)
        .setExpirationTime(nowSec + 60)
        .sign(key(CURRENT).secret);
    expect(await verifyEntitlement(await sign({ tier: "pro", role: "root", v: 1 }), keyring, now)).toBeNull();
    expect(await verifyEntitlement(await sign({ tier: "gold", role: "admin", v: 1 }), keyring, now)).toBeNull();
    expect(await verifyEntitlement(await sign({ tier: "pro", role: "admin" }), keyring, now)).toBeNull();
  });

  it("rejects garbage and missing tokens", async () => {
    expect(await verifyEntitlement(undefined, keyring, now)).toBeNull();
    expect(await verifyEntitlement("", keyring, now)).toBeNull();
    expect(await verifyEntitlement("not.a.jwt", keyring, now)).toBeNull();
  });

  it("a non-admin token is valid but not admin", async () => {
    const token = await signEntitlement({ ...admin, role: "user" }, key(CURRENT), now);
    const claims = await verifyEntitlement(token, keyring, now);
    expect(claims?.role).toBe("user");
    expect(isAdmin(claims)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});
