// The sign-up throttle port (plan §15.2, security review H2). Two counters per sign-up:
//   ip     the client IP: 5 per minute (the `signup` limit), plus an hourly Cloudflare zone rule
//   email  a hash of the target address: 2 per minute (`signupEmail`), so rotating IPs can't flood one inbox
// On top of these the store's cool-down (store.ts `nextConfirmation`, kept in the database) caps confirmation
// emails per address at 1 per 15 minutes and 3 per day, across every isolate.
// server.ts plugs in the route() wrapper's limiter (the Workers Rate Limiting binding); MemoryRateLimiter is for
// unit tests of the service.

export type LimitScope = "ip" | "email";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request is allowed (0 when allowed). */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  /** Counts one request for `key` in `scope` and says whether it is within the limit. */
  hit(scope: LimitScope, key: string): Promise<RateLimitResult>;
}

/** Fixed-window counter per scope and key, in process memory (tests). */
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly limit = { requests: 5, windowSeconds: 60 },
    private readonly now: () => number = () => Date.now()
  ) {}

  async hit(scope: LimitScope, key: string): Promise<RateLimitResult> {
    const now = this.now();
    const windowMs = this.limit.windowSeconds * 1000;
    const id = `${scope}:${key}`;
    let w = this.windows.get(id);
    if (!w || now - w.start >= windowMs) {
      w = { start: now, count: 0 };
      this.windows.set(id, w);
    }
    w.count += 1;
    if (w.count <= this.limit.requests) return { allowed: true, retryAfterSeconds: 0 };
    return { allowed: false, retryAfterSeconds: Math.ceil((w.start + windowMs - now) / 1000) };
  }
}

/**
 * The client IP for rate limiting. Behind Cloudflare `cf-connecting-ip` is set by the edge and can't be spoofed;
 * the other headers only matter for local runs and tests.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** A short, non-reversible key for an address: rate-limit keys must not carry personal data. */
export async function emailKey(email: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}
