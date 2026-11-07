import "server-only";
import { cloudflareBindings } from "./env";

// Rate limits for /api/* (plan §11.6). Three layers:
//   1. this module, called by the route() wrapper (server/http.ts) on every route with a `rateLimit` option:
//      the Workers Rate Limiting binding of each limit (wrangler.jsonc `ratelimits`, counted per Cloudflare
//      location) when the Worker has it, else a per-isolate memory counter (below);
//   2. Better Auth's own limiter on /api/auth/* (features/auth/server.ts), per isolate, defence in depth;
//   3. Cloudflare zone rate-limit rules on /api/* (owner, in the dashboard), which also cover the hourly limits a
//      binding can't express (its period is 10 or 60 seconds only).
//
// The memory fallback exists so `next start`, `next dev`, E2E and unit tests behave like production (429 after
// the limit). It is NOT a production control: every Workers isolate has its own Map, and under `next start`
// the client IP header isn't trustworthy. Production relies on the binding plus the zone rules; a deployed
// Worker without its binding logs `rate_limit_binding_missing` once per isolate.

/** Named limits. Each one is a `ratelimits` binding in wrangler.jsonc with the same numbers. */
export const RATE_LIMITS = {
  /** Starting a sign-in: /api/auth/sign-in/*, the OAuth callback, the age-consent step. Plan: 10/min/IP. */
  auth: { binding: "RL_AUTH", limit: 10, periodSeconds: 60 },
  /** The rest of /api/auth/* (get-session, sign-out). */
  session: { binding: "RL_SESSION", limit: 60, periodSeconds: 60 },
  /** Account actions: export, delete, sign out everywhere, newsletter preference. */
  account: { binding: "RL_ACCOUNT", limit: 10, periodSeconds: 60 },
  /** Mark complete / bookmark / merge. */
  progress: { binding: "RL_PROGRESS", limit: 60, periodSeconds: 60 },
  /** Plan: 5/min/user. */
  checkout: { binding: "RL_CHECKOUT", limit: 5, periodSeconds: 60 },
  /** Plan: 10/min/user. */
  portal: { binding: "RL_PORTAL", limit: 10, periodSeconds: 60 },
  /** Plan: 30/min/user. */
  entitlements: { binding: "RL_ENTITLEMENTS", limit: 30, periodSeconds: 60 },
  /** Test-login (never in production builds): generous, since E2E signs in from one IP; the key is ≥ 16 chars. */
  test: { binding: "RL_TEST", limit: 120, periodSeconds: 60 },
  /** Newsletter sign-up per IP (plan §15.2). Hourly caps come from the zone rule and the per-address cool-down. */
  newsletter: { binding: "RL_NEWSLETTER", limit: 5, periodSeconds: 60 },
  /** Newsletter sign-up per target address (hashed), on top of the database cool-down. */
  newsletterEmail: { binding: "RL_NEWSLETTER_EMAIL", limit: 2, periodSeconds: 60 },
  /** Newsletter confirm / unsubscribe / account status, per IP. */
  newsletterToken: { binding: "RL_NEWSLETTER_TOKEN", limit: 30, periodSeconds: 60 },
  /** CSP violation reports, per IP. */
  csp: { binding: "RL_CSP", limit: 30, periodSeconds: 60 },
  /** Web-vitals beacons, per IP. */
  vitals: { binding: "RL_VITALS", limit: 60, periodSeconds: 60 },
} as const satisfies Record<string, { binding: string; limit: number; periodSeconds: 10 | 60 }>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export interface RateLimitDecision {
  success: boolean;
  /** Seconds until the window resets, when known (the binding doesn't say; then the period). */
  retryAfterSeconds?: number;
}

export interface RateLimiter {
  limit(input: { name: RateLimitName; key: string }): Promise<RateLimitDecision>;
}

/** The Workers Rate Limiting binding's runtime API. */
interface WorkersRateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

const MAX_KEYS = 50_000;

/** Fixed-window counters in this isolate's memory. See the header: tests and `next start` only. */
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  async limit({ name, key }: { name: RateLimitName; key: string }): Promise<RateLimitDecision> {
    const { limit, periodSeconds } = RATE_LIMITS[name];
    const now = this.now();
    const periodMs = periodSeconds * 1000;
    const id = `${name}:${key}`;
    let w = this.windows.get(id);
    if (!w || now - w.start >= periodMs) {
      if (!w && this.windows.size >= MAX_KEYS) this.prune(now);
      w = { start: now, count: 0 };
      this.windows.set(id, w);
    }
    w.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((w.start + periodMs - now) / 1000));
    return w.count <= limit ? { success: true } : { success: false, retryAfterSeconds };
  }

  private prune(now: number) {
    for (const [id, w] of this.windows) {
      const name = id.slice(0, id.indexOf(":")) as RateLimitName;
      if (now - w.start >= (RATE_LIMITS[name]?.periodSeconds ?? 60) * 1000) this.windows.delete(id);
    }
    // Still full (a flood of distinct keys): drop the oldest half rather than grow without bound.
    if (this.windows.size >= MAX_KEYS) {
      let n = 0;
      for (const id of this.windows.keys()) {
        if (n++ >= MAX_KEYS / 2) break;
        this.windows.delete(id);
      }
    }
  }
}

type Bindings = Record<string, unknown> | null;

let warnedMissing = false;

/**
 * The binding of each limit when the Worker has it, else the memory fallback. `bindings` is read per call:
 * Cloudflare hands the env to each request.
 */
export function bindingRateLimiter(
  getBindings: () => Bindings = () => cloudflareBindings() as Bindings,
  fallback: RateLimiter = new MemoryRateLimiter()
): RateLimiter {
  return {
    async limit({ name, key }) {
      const config = RATE_LIMITS[name];
      const bindings = getBindings();
      const binding = bindings?.[config.binding] as WorkersRateLimit | undefined;
      if (binding && typeof binding.limit === "function") {
        const { success } = await binding.limit({ key: `${name}:${key}` });
        return success ? { success } : { success, retryAfterSeconds: config.periodSeconds };
      }
      if (bindings && !warnedMissing) {
        // On Cloudflare but without the binding: the memory counter still runs, per isolate.
        warnedMissing = true;
        console.error(JSON.stringify({ level: "error", msg: "rate_limit_binding_missing", binding: config.binding }));
      }
      return fallback.limit({ name, key });
    },
  };
}

/** A short, non-reversible key for an email address (rate-limit keys must not carry personal data). */
export async function hashKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase()));
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}
