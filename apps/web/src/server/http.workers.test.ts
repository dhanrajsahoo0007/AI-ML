import { afterEach, describe, expect, it, vi } from "vitest";

// The limiter route() installs by default (no setRateLimiter call, as in production) uses the Workers Rate Limiting
// binding of each named limit from the request's Cloudflare context, and the memory fallback when the Worker has
// no such binding or there is no Cloudflare context at all (`next start`, `next dev`, CI).

const context = vi.hoisted(() => ({ env: null as Record<string, unknown> | null }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => {
    if (!context.env) throw new Error("not on Cloudflare");
    return { env: context.env };
  },
}));

const { createRoute } = await import("./http");
const { RATE_LIMITS } = await import("./rate-limit");

const route = createRoute({ getSession: async () => ({ info: null }), allowedOrigins: () => ["https://example.com"] });
const call = (handler: ReturnType<typeof route>, ip: string) =>
  handler(new Request("https://example.com/api/x", { headers: { "cf-connecting-ip": ip } }), {
    params: Promise.resolve({}),
  });

afterEach(() => {
  context.env = null;
  vi.restoreAllMocks();
});

describe("route() on Workers", () => {
  it("asks the limit's binding, keyed by limit and caller, and answers 429 when it refuses", async () => {
    const keys: string[] = [];
    let allow = true;
    context.env = {
      RL_PROGRESS: { limit: async ({ key }: { key: string }) => (keys.push(key), { success: allow }) },
    };
    const handler = route({ rateLimit: { name: "progress", by: "ip" }, handler: () => ({ ok: true }) });

    expect((await call(handler, "203.0.113.20")).status).toBe(200);
    allow = false;
    const refused = await call(handler, "203.0.113.20");
    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toBe(String(RATE_LIMITS.progress.periodSeconds));
    expect(keys).toEqual(["progress:ip:203.0.113.20", "progress:ip:203.0.113.20"]);
  });

  it("reads the bindings per request, so each request's env is used", async () => {
    const seen: string[] = [];
    const handler = route({ rateLimit: { name: "csp", by: "ip" }, handler: () => ({ ok: true }) });
    context.env = { RL_CSP: { limit: async () => (seen.push("first"), { success: true }) } };
    await call(handler, "198.51.100.30");
    context.env = { RL_CSP: { limit: async () => (seen.push("second"), { success: true }) } };
    await call(handler, "198.51.100.30");
    expect(seen).toEqual(["first", "second"]);
  });

  it("falls back to the memory counter on a Worker without the binding, and says so in the log", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    context.env = { APP_ENV: "staging" };
    const handler = route({ rateLimit: { name: "signup", by: "ip" }, handler: () => ({ ok: true }) });
    const statuses: number[] = [];
    for (let i = 0; i <= RATE_LIMITS.signup.limit; i++) statuses.push((await call(handler, "192.0.2.40")).status);
    expect(statuses.at(-1)).toBe(429);
    expect(statuses.filter((s) => s === 200)).toHaveLength(RATE_LIMITS.signup.limit);
    expect(errors.mock.calls.flat().join("\n")).toContain("rate_limit_binding_missing");
  });

  it("falls back to the memory counter off Cloudflare", async () => {
    const handler = route({ rateLimit: { name: "checkout", by: "ip" }, handler: () => ({ ok: true }) });
    const statuses: number[] = [];
    for (let i = 0; i <= RATE_LIMITS.checkout.limit; i++) statuses.push((await call(handler, "192.0.2.41")).status);
    expect(statuses.at(-1)).toBe(429);
  });
});
