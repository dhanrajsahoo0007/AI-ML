import { afterEach, describe, expect, it } from "vitest";
import { createRoute, setRateLimiter } from "./http";
import { RATE_LIMITS } from "./rate-limit";

// H1 (security review): route() limits every route with a `rateLimit` option out of the box (no setup call),
// answers 429 with Retry-After, and keys by IP or by user.

const route = createRoute({ getSession: async () => ({ info: null }), allowedOrigins: () => ["https://example.com"] });

const call = (handler: ReturnType<typeof route>, ip: string, path = "/api/x") =>
  handler(new Request(`https://example.com${path}`, { headers: { "cf-connecting-ip": ip } }), {
    params: Promise.resolve({}),
  });

afterEach(() => setRateLimiter(null));

describe("route() rate limits", () => {
  it("refuses with 429 and Retry-After once the default limiter's limit is reached", async () => {
    const handler = route({ rateLimit: { name: "checkout", by: "ip" }, handler: () => ({ ok: true }) });
    const statuses: number[] = [];
    for (let i = 0; i <= RATE_LIMITS.checkout.limit; i++) statuses.push((await call(handler, "203.0.113.7")).status);
    expect(statuses.slice(0, -1).every((s) => s === 200)).toBe(true);
    const refused = await call(handler, "203.0.113.7");
    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(refused.headers.get("cache-control")).toBe("no-store");
    expect(await refused.json()).toMatchObject({ error: { code: "rate_limited" } });
    // Another IP has its own counter.
    expect((await call(handler, "203.0.113.8")).status).toBe(200);
  });

  it("picks the limit per request when given a function", async () => {
    const seen: string[] = [];
    setRateLimiter({
      limit: async ({ name, key }) => {
        seen.push(`${name}:${key}`);
        return { success: true };
      },
    });
    const handler = route({
      rateLimit: (r) => (new URL(r.url).pathname.endsWith("/strict") ? { name: "auth", by: "ip" } : null),
      handler: () => ({ ok: true }),
    });
    await call(handler, "198.51.100.1", "/api/strict");
    await call(handler, "198.51.100.1", "/api/loose");
    expect(seen).toEqual(["auth:ip:198.51.100.1"]);
  });

  it("falls back to the IP key for signed-out callers of a per-user limit", async () => {
    const seen: string[] = [];
    setRateLimiter({ limit: async ({ key }) => (seen.push(key), { success: true }) });
    await call(route({ rateLimit: { name: "entitlements", by: "user" }, handler: () => ({}) }), "192.0.2.4");
    expect(seen).toEqual(["ip:192.0.2.4"]);
  });
});
