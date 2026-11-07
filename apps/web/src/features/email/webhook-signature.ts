// Verifies Resend webhook signatures. Resend signs with Svix (the same scheme as Standard Webhooks):
//
//   headers   svix-id, svix-timestamp (Unix seconds), svix-signature ("v1,<base64> v1,<base64> …")
//   content   `${svix-id}.${svix-timestamp}.${raw body}`
//   key       the endpoint's signing secret `whsec_<base64>`, base64-decoded after the prefix
//   signature base64(HMAC-SHA256(key, content)); any one of the listed v1 signatures may match (key rotation)
//
// Timestamps more than 5 minutes from now (either way) are refused, so a captured request can't be replayed
// later; the svix-id is the idempotency key the caller stores (webhook_event). Web Crypto only, so it runs on
// Workers and in Node, with no dependency; crypto.subtle.verify compares in constant time.

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

type SignatureResult =
  | { ok: true; id: string; timestamp: number }
  | {
      ok: false;
      reason: "missing-headers" | "bad-timestamp" | "too-old" | "too-new" | "bad-secret" | "no-match";
    };

/** The webhook headers, under either the svix-* names Resend uses or the webhook-* Standard Webhooks names. */
function header(headers: Headers, name: "id" | "timestamp" | "signature"): string | null {
  return headers.get(`svix-${name}`) ?? headers.get(`webhook-${name}`);
}

function decodeBase64(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return null;
  try {
    const bin = atob(text);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function secretBytes(secret: string): Uint8Array<ArrayBuffer> | null {
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const bytes = decodeBase64(raw);
  return bytes && bytes.length >= 16 ? bytes : null;
}

export async function verifyWebhookSignature(input: {
  secret: string;
  headers: Headers;
  /** The raw request body, exactly as received. */
  body: string;
  /** Unix seconds; injectable for tests. */
  now?: number;
}): Promise<SignatureResult> {
  const id = header(input.headers, "id");
  const timestampText = header(input.headers, "timestamp");
  const signatures = header(input.headers, "signature");
  if (!id || !timestampText || !signatures) return { ok: false, reason: "missing-headers" };
  if (!/^\d{1,12}$/.test(timestampText)) return { ok: false, reason: "bad-timestamp" };
  const timestamp = Number(timestampText);
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (now - timestamp > SIGNATURE_TOLERANCE_SECONDS) return { ok: false, reason: "too-old" };
  if (timestamp - now > SIGNATURE_TOLERANCE_SECONDS) return { ok: false, reason: "too-new" };

  const keyBytes = secretBytes(input.secret);
  if (!keyBytes) return { ok: false, reason: "bad-secret" };
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const content = new TextEncoder().encode(`${id}.${timestampText}.${input.body}`);

  for (const entry of signatures.split(" ")) {
    const [version, value] = entry.split(",", 2);
    if (version !== "v1" || !value) continue;
    const sig = decodeBase64(value);
    if (sig && (await crypto.subtle.verify("HMAC", key, sig, content))) return { ok: true, id, timestamp };
  }
  return { ok: false, reason: "no-match" };
}

/** Signs a payload the way Svix does. For tests and local tooling (sending a fake webhook to a dev server). */
export async function signWebhook(secret: string, id: string, timestamp: number, body: string): Promise<string> {
  const keyBytes = secretBytes(secret);
  if (!keyBytes) throw new Error("invalid webhook secret");
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`))
  );
  let bin = "";
  for (const b of mac) bin += String.fromCharCode(b);
  return `v1,${btoa(bin)}`;
}
