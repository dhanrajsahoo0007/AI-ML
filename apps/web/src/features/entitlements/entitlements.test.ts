import { describe, expect, it } from "vitest";
import {
  ENTITLEMENT_TTL_SEC,
  keyringFromEnv,
  signEntitlement,
  verifyEntitlement,
  type EntitlementClaims,
} from "@/server/edge/entitlement";
import { clearEntitlementCookies, entitlementCookies } from "./cookies";
import { formatHint, hintFromCookies, parseHint, refreshDue } from "./hint";
import { decideRefresh } from "./refresh";

// Test keys are generated per run; nothing here is a real secret.
const secret = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const now = new Date("2026-11-07T12:00:00Z");
const nowSec = Math.floor(now.getTime() / 1000);
const DAY = 86_400_000;
const presented = (over: Partial<EntitlementClaims> = {}): EntitlementClaims => ({
  sub: "u1",
  tier: "pro",
  role: "user",
  v: 2,
  exp: nowSec + 60,
  iat: nowSec - 840,
  ...over,
});

describe("decideRefresh", () => {
  const pro = { tier: "pro" as const, validUntil: new Date(now.getTime() + 10 * DAY), version: 2 };

  it("issues the database state for 15 minutes", () => {
    const d = decideRefresh({ userId: "u1", role: "user", entitlement: pro, presented: null, now });
    expect(d).toEqual({
      ok: true,
      claims: { sub: "u1", tier: "pro", role: "user", v: 2, exp: nowSec + ENTITLEMENT_TTL_SEC },
      stale: false,
    });
  });

  it("never outlives valid_until, and is free once it has passed", () => {
    const soon = { ...pro, validUntil: new Date(now.getTime() + 60_000) };
    const d = decideRefresh({ userId: "u1", role: "user", entitlement: soon, presented: null, now });
    expect(d.ok && d.claims.exp).toBe(nowSec + 60);
    const past = { ...pro, validUntil: new Date(now.getTime() - 1000) };
    const e = decideRefresh({ userId: "u1", role: "user", entitlement: past, presented: null, now });
    expect(e.ok && e.claims.tier).toBe("free");
  });

  it("treats a missing row as free with version 0, and keeps admins' role", () => {
    const d = decideRefresh({ userId: "u1", role: "admin", entitlement: null, presented: null, now });
    expect(d).toMatchObject({ ok: true, claims: { tier: "free", role: "admin", v: 0 } });
    const forever = decideRefresh({
      userId: "u1",
      role: "admin",
      entitlement: { tier: "pro", validUntil: null, version: 1 },
      presented: null,
      now,
    });
    expect(forever).toMatchObject({ ok: true, claims: { tier: "pro", exp: nowSec + ENTITLEMENT_TTL_SEC } });
  });

  it("replaces a stale version with the current state (revoked access disappears)", () => {
    const free = { tier: "free" as const, validUntil: null, version: 3 };
    const d = decideRefresh({ userId: "u1", role: "user", entitlement: free, presented: presented({ v: 2 }), now });
    expect(d).toMatchObject({ ok: true, stale: true, claims: { tier: "free", v: 3 } });
  });

  it("refuses another user's cookie and a version newer than the database", () => {
    expect(
      decideRefresh({ userId: "u1", role: "user", entitlement: pro, presented: presented({ sub: "u2" }), now })
    ).toEqual({ ok: false, reason: "user_mismatch" });
    expect(
      decideRefresh({ userId: "u1", role: "user", entitlement: pro, presented: presented({ v: 9 }), now })
    ).toEqual({ ok: false, reason: "version_rollback" });
  });
});

describe("tts_ent sign / verify", () => {
  const current = `k2:${secret()}`;
  const previous = `k1:${secret()}`;
  const claims = { sub: "u1", tier: "pro", role: "user", v: 1 } as const;

  it("round-trips, and expires after 15 minutes (±2 min skew)", async () => {
    const ring = keyringFromEnv(current, undefined)!;
    const token = await signEntitlement(claims, ring.current, now);
    expect(await verifyEntitlement(token, ring, now)).toMatchObject(claims);
    const later = new Date(now.getTime() + (ENTITLEMENT_TTL_SEC + 60) * 1000);
    expect(await verifyEntitlement(token, ring, later)).toMatchObject(claims);
    const expired = new Date(now.getTime() + (ENTITLEMENT_TTL_SEC + 180) * 1000);
    expect(await verifyEntitlement(token, ring, expired)).toBeNull();
  });

  it("keeps cookies signed with the previous key valid during rotation, and no longer after", async () => {
    const old = keyringFromEnv(previous, undefined)!;
    const token = await signEntitlement(claims, old.current, now);
    expect(await verifyEntitlement(token, keyringFromEnv(current, previous), now)).toMatchObject(claims);
    expect(await verifyEntitlement(token, keyringFromEnv(current, undefined), now)).toBeNull();
  });

  it("rejects a tampered tier and an unknown kid", async () => {
    const ring = keyringFromEnv(current, undefined)!;
    const token = await signEntitlement({ ...claims, tier: "free" }, ring.current, now);
    const [h, p, s] = token.split(".");
    const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    const forged = btoa(JSON.stringify({ ...payload, tier: "pro" }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    expect(await verifyEntitlement(`${h}.${forged}.${s}`, ring, now)).toBeNull();
    const other = keyringFromEnv(`k9:${secret()}`, undefined)!;
    expect(await verifyEntitlement(await signEntitlement(claims, other.current, now), ring, now)).toBeNull();
  });
});

describe("cookies and hint", () => {
  it("sets tts_ent HttpOnly + Secure + SameSite=Lax for its lifetime, and a readable hint", () => {
    const [ent, hint] = entitlementCookies({
      token: "t.o.k",
      hint: { exp: nowSec + 900, tier: "pro", hold: true },
      nowSec,
      secure: true,
    });
    expect(ent).toBe("tts_ent=t.o.k; Path=/; Max-Age=900; SameSite=Lax; HttpOnly; Secure");
    expect(hint).toContain("tts_ent_hint=");
    expect(hint).not.toContain("HttpOnly");
    const value = decodeURIComponent(hint.split(";")[0].split("=")[1]);
    expect(parseHint(value)).toEqual({ exp: nowSec + 900, tier: "pro", hold: true });
  });

  it("clears both", () => {
    expect(clearEntitlementCookies(false)).toEqual([
      "tts_ent=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly",
      "tts_ent_hint=; Path=/; Max-Age=0; SameSite=Lax",
    ]);
  });

  it("parses the hint from document.cookie and knows when a refresh is due", () => {
    const hint = { exp: nowSec + 600, tier: "free" as const, hold: false };
    const cookies = `a=1; tts_ent_hint=${encodeURIComponent(formatHint(hint))}; b=2`;
    expect(hintFromCookies(cookies)).toEqual(hint);
    expect(hintFromCookies("a=1")).toBeNull();
    expect(parseHint("1.pro.2")).toBeNull();
    expect(refreshDue(hint, nowSec)).toBe(false);
    expect(refreshDue(hint, nowSec + 481)).toBe(true);
    expect(refreshDue(null, nowSec)).toBe(false);
  });
});
