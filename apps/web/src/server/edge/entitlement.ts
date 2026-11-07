import { SignJWT, jwtVerify, type JWTHeaderParameters } from "jose";
import { z } from "zod";

// The `oa_ent` entitlement cookie (plan §9.2, §11.3): an HS256 JWT signed with ENTITLEMENT_SECRET.
// Verified in middleware with no database. Two keys are accepted at once (current and previous),
// selected by the `kid` header, so the secret can be rotated without signing anyone out.
//
// Edge-safe: Web Crypto only (jose), no Node APIs.

export const ENTITLEMENT_COOKIE = "oa_ent";

/** Clock skew accepted on `exp`/`iat` (plan §11.3: ±2 minutes). */
export const CLOCK_TOLERANCE_SEC = 120;

/** Lifetime of an issued cookie (plan §9.2: 15 minutes). */
export const ENTITLEMENT_TTL_SEC = 15 * 60;

const claimsSchema = z.object({
  sub: z.string().min(1),
  tier: z.enum(["free", "pro"]),
  role: z.enum(["user", "admin"]),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  /** Entitlement version per user, bumped on cancel or refund (checked by the refresh endpoint). */
  v: z.number().int().nonnegative(),
});

export type EntitlementClaims = z.infer<typeof claimsSchema>;

export interface EntitlementKey {
  kid: string;
  secret: Uint8Array;
}

/** Current key first; the previous key only verifies (never signs). */
export interface Keyring {
  current: EntitlementKey;
  previous?: EntitlementKey;
}

const KID = /^[A-Za-z0-9_-]{1,32}$/;
const MIN_SECRET_BYTES = 32; // 256-bit secret (plan §11.3)

/**
 * Parses one key from its env value, written as `<kid>:<base64url secret>` (e.g. `2026-11:Zm9v…`).
 * Returns null when the value is missing or malformed, so a bad secret means "nobody is entitled",
 * never "everybody is".
 */
export function parseKey(value: string | undefined): EntitlementKey | null {
  if (!value) return null;
  const sep = value.indexOf(":");
  if (sep <= 0) return null;
  const kid = value.slice(0, sep);
  const secret = decodeBase64Url(value.slice(sep + 1));
  if (!KID.test(kid) || !secret || secret.byteLength < MIN_SECRET_BYTES) return null;
  return { kid, secret };
}

/** Builds the keyring from ENTITLEMENT_SECRET / ENTITLEMENT_SECRET_PREVIOUS. Null without a current key. */
export function keyringFromEnv(current: string | undefined, previous: string | undefined): Keyring | null {
  const cur = parseKey(current);
  if (!cur) return null;
  const prev = parseKey(previous);
  return prev && prev.kid !== cur.kid ? { current: cur, previous: prev } : { current: cur };
}

/**
 * Verifies an `oa_ent` token. Returns its claims, or null for anything wrong: no keyring, unknown
 * `kid`, bad signature, another algorithm, expired, or claims that don't match the schema.
 */
export async function verifyEntitlement(
  token: string | undefined,
  keyring: Keyring | null,
  now: Date = new Date()
): Promise<EntitlementClaims | null> {
  if (!token || !keyring) return null;
  const keyFor = (header: JWTHeaderParameters) => {
    const key = [keyring.current, keyring.previous].find((k) => k && k.kid === header.kid);
    if (!key) throw new Error("unknown kid");
    return key.secret;
  };
  try {
    const { payload } = await jwtVerify(token, keyFor, {
      algorithms: ["HS256"],
      clockTolerance: CLOCK_TOLERANCE_SEC,
      currentDate: now,
      requiredClaims: ["exp", "iat", "sub"],
      // A token older than its normal lifetime is refused even if it claims a later `exp`.
      maxTokenAge: ENTITLEMENT_TTL_SEC,
    });
    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) return null;
    // Issued in the future (beyond the allowed skew): refuse, it would outlive its lifetime.
    if (claims.data.iat > Math.floor(now.getTime() / 1000) + CLOCK_TOLERANCE_SEC) return null;
    return claims.data;
  } catch {
    return null;
  }
}

/** True when the token carries `role=admin` (unlocks `hidden` sections, plan §5.1.1). */
export function isAdmin(claims: EntitlementClaims | null): boolean {
  return claims?.role === "admin";
}

/**
 * Signs an `oa_ent` token with the current key. Used by `POST /api/entitlements/refresh` (Phase 5)
 * and by tests; middleware never signs.
 */
export async function signEntitlement(
  claims: Omit<EntitlementClaims, "exp" | "iat"> & { exp?: number },
  key: EntitlementKey,
  now: Date = new Date()
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({ tier: claims.tier, role: claims.role, v: claims.v })
    .setProtectedHeader({ alg: "HS256", kid: key.kid, typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt(iat)
    .setExpirationTime(claims.exp ?? iat + ENTITLEMENT_TTL_SEC)
    .sign(key.secret);
}

function decodeBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, ""));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}
