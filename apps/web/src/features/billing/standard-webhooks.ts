import { WebhookVerificationError } from "./port";

// Standard Webhooks signature verification (https://www.standardwebhooks.com), the scheme Dodo Payments uses:
// headers `webhook-id`, `webhook-timestamp` (Unix seconds) and `webhook-signature` (space-separated `v1,<base64>`
// entries), HMAC-SHA256 over `${id}.${timestamp}.${body}` with the base64 key after the `whsec_` prefix.
// Web Crypto only, so it runs in Workers. Timestamps more than 5 minutes off are refused (replays).

export const TOLERANCE_SEC = 5 * 60;

const encoder = new TextEncoder();

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  const raw = base64ToBytes(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  if (!raw || raw.byteLength < 16) throw new WebhookVerificationError("invalid webhook secret");
  return crypto.subtle.importKey("raw", raw as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

/** `v1,<base64>` for the given message; exported for test fixtures. */
export async function signStandardWebhook(secret: string, id: string, timestamp: number, body: string) {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(`${id}.${timestamp}.${body}`));
  return `v1,${bytesToBase64(sig)}`;
}

export async function verifyStandardWebhook(
  secret: string,
  headers: Headers,
  body: string,
  now: Date = new Date()
): Promise<{ id: string; timestamp: number }> {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !ts || !signatures) throw new WebhookVerificationError("missing webhook headers");
  if (!/^\d{1,12}$/.test(ts)) throw new WebhookVerificationError("invalid webhook timestamp");
  const timestamp = Number(ts);
  if (Math.abs(Math.floor(now.getTime() / 1000) - timestamp) > TOLERANCE_SEC) {
    throw new WebhookVerificationError("webhook timestamp outside the tolerance");
  }
  const expected = (await signStandardWebhook(secret, id, timestamp, body)).slice(3);
  const ok = signatures
    .split(" ")
    .map((s) => s.trim())
    .some((s) => s.startsWith("v1,") && timingSafeEqual(s.slice(3), expected));
  if (!ok) throw new WebhookVerificationError("webhook signature mismatch");
  return { id, timestamp };
}
