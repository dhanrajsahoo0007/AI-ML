// The rate-limit hook (plan §11.6: 5 sign-ups per hour per IP). In production this becomes the Workers Rate
// Limiting binding inside the shared route() wrapper (src/server/http.ts, not built yet); until then the API
// routes call a RateLimiter, and MemoryRateLimiter serves local runs, previews and tests.

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request is allowed (0 when allowed). */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  /** Counts one request for `key` and says whether it is within the limit. */
  hit(key: string): Promise<RateLimitResult>;
}

const SUBSCRIBE_LIMIT = { requests: 5, windowSeconds: 60 * 60 };

/** Fixed-window counter per key, in process memory. */
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly limit = SUBSCRIBE_LIMIT,
    private readonly now: () => number = () => Date.now()
  ) {}

  async hit(key: string): Promise<RateLimitResult> {
    const now = this.now();
    const windowMs = this.limit.windowSeconds * 1000;
    let w = this.windows.get(key);
    if (!w || now - w.start >= windowMs) {
      w = { start: now, count: 0 };
      this.windows.set(key, w);
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
