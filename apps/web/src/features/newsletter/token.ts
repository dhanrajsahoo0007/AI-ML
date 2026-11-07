// Signed newsletter tokens: HMAC-SHA256 over a small JSON payload, with Web Crypto only (runs on Workers and in
// Node). The token carries the subscriber ID, never the email address, so links leak nothing if forwarded or
// logged.
//
//   token = base64url(JSON payload) "." base64url(HMAC-SHA256(secret, base64url(JSON payload)))
//
// `confirm` tokens expire after 48 hours (double opt-in). `unsubscribe` tokens don't expire: an unsubscribe link
// in an old email must keep working (CAN-SPAM needs at least 30 days; we never want it to fail).

type TokenPurpose = "confirm" | "unsubscribe";

export const CONFIRM_TTL_SECONDS = 48 * 60 * 60;
export const CONFIRM_TTL_LABEL = "48 hours";

interface Payload {
  v: 1;
  /** Subscriber ID. */
  sid: string;
  p: TokenPurpose;
  /** Issued at, Unix seconds. */
  iat: number;
  /** Expires at, Unix seconds; absent for tokens that don't expire. */
  exp?: number;
  /**
   * Confirm tokens: the consent text version the person agreed to when signing up (consent.ts). It travels in
   * the signed token because `newsletter_subscriber` has no column for it; confirming writes it to consent_log.
   */
  cv?: string;
}

type VerifyResult =
  | { ok: true; subscriberId: string; issuedAt: number; consentVersion?: string }
  | { ok: false; reason: "malformed" | "bad-signature" | "wrong-purpose" | "expired" };

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

export async function signToken(
  secret: string,
  input: { subscriberId: string; purpose: TokenPurpose; ttlSeconds?: number; now?: number; consentVersion?: string }
): Promise<string> {
  const iat = input.now ?? nowSeconds();
  const ttl = input.ttlSeconds ?? (input.purpose === "confirm" ? CONFIRM_TTL_SECONDS : undefined);
  const payload: Payload = {
    v: 1,
    sid: input.subscriberId,
    p: input.purpose,
    iat,
    ...(ttl ? { exp: iat + ttl } : {}),
    ...(input.consentVersion ? { cv: input.consentVersion } : {}),
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body)));
  return `${body}.${toBase64Url(sig)}`;
}

export async function verifyToken(
  secret: string,
  token: string,
  purpose: TokenPurpose,
  now: number = nowSeconds()
): Promise<VerifyResult> {
  if (token.length > 1024) return { ok: false, reason: "malformed" };
  const [body, sigText, extra] = token.split(".");
  if (!body || !sigText || extra !== undefined) return { ok: false, reason: "malformed" };
  const sig = fromBase64Url(sigText);
  if (!sig) return { ok: false, reason: "malformed" };
  // crypto.subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), sig, encoder.encode(body));
  if (!valid) return { ok: false, reason: "bad-signature" };
  let payload: Payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body) ?? new Uint8Array())) as Payload;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (payload.v !== 1 || typeof payload.sid !== "string" || typeof payload.iat !== "number") {
    return { ok: false, reason: "malformed" };
  }
  if (payload.p !== purpose) return { ok: false, reason: "wrong-purpose" };
  if (payload.exp !== undefined && now >= payload.exp) return { ok: false, reason: "expired" };
  return {
    ok: true,
    subscriberId: payload.sid,
    issuedAt: payload.iat,
    ...(typeof payload.cv === "string" ? { consentVersion: payload.cv } : {}),
  };
}
