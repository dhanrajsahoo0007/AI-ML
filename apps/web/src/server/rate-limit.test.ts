import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bindingRateLimiter, hashKey, MemoryRateLimiter, RATE_LIMITS, type RateLimitName } from "./rate-limit";

// H1 (security review): every named limit actually limits, through the Workers binding when present and the
// memory fallback otherwise, and wrangler.jsonc declares a binding with the same numbers in every environment.

describe("MemoryRateLimiter", () => {
  it("allows `limit` requests per key and window, then refuses with Retry-After", async () => {
    let now = 1_000_000;
    const limiter = new MemoryRateLimiter(() => now);
    const { limit } = RATE_LIMITS.auth;
    for (let i = 0; i < limit; i++) expect((await limiter.limit({ name: "auth", key: "ip:1.2.3.4" })).success).toBe(true);
    const refused = await limiter.limit({ name: "auth", key: "ip:1.2.3.4" });
    expect(refused).toEqual({ success: false, retryAfterSeconds: 60 });
    // Other keys and other limits have their own counters.
    expect((await limiter.limit({ name: "auth", key: "ip:5.6.7.8" })).success).toBe(true);
    expect((await limiter.limit({ name: "session", key: "ip:1.2.3.4" })).success).toBe(true);
    now += 30_000;
    expect(await limiter.limit({ name: "auth", key: "ip:1.2.3.4" })).toEqual({ success: false, retryAfterSeconds: 30 });
    now += 30_000;
    expect((await limiter.limit({ name: "auth", key: "ip:1.2.3.4" })).success).toBe(true);
  });

  it("stays bounded under a flood of distinct keys", async () => {
    const limiter = new MemoryRateLimiter(() => 0);
    for (let i = 0; i < 60_000; i++) await limiter.limit({ name: "csp", key: `ip:${i}` });
    expect((limiter as unknown as { windows: Map<string, unknown> }).windows.size).toBeLessThanOrEqual(50_000);
  });
});

describe("bindingRateLimiter", () => {
  it("uses the limit's Workers binding when the Worker has it", async () => {
    const seen: string[] = [];
    const bindings = {
      RL_PROGRESS: {
        limit: async ({ key }: { key: string }) => {
          seen.push(key);
          return { success: false };
        },
      },
    };
    const limiter = bindingRateLimiter(() => bindings, { limit: async () => ({ success: true }) });
    expect(await limiter.limit({ name: "progress", key: "user:u1" })).toEqual({ success: false, retryAfterSeconds: 60 });
    expect(seen).toEqual(["progress:user:u1"]);
  });

  it("falls back to memory off Cloudflare, so limits still apply under next start and in tests", async () => {
    const limiter = bindingRateLimiter(() => null);
    const results = [];
    for (let i = 0; i <= RATE_LIMITS.checkout.limit; i++) results.push((await limiter.limit({ name: "checkout", key: "user:u" })).success);
    expect(results.at(-1)).toBe(false);
    expect(results.filter(Boolean)).toHaveLength(RATE_LIMITS.checkout.limit);
  });
});

describe("hashKey", () => {
  it("is stable, case-insensitive and carries no part of the address", async () => {
    const a = await hashKey("Victim@Example.com ");
    expect(a).toBe(await hashKey("victim@example.com"));
    expect(a).toMatch(/^[0-9a-f]{24}$/);
    expect(a).not.toContain("victim");
  });
});

/** Minimal JSONC reader: drops comments outside strings and trailing commas. */
function readJsonc(file: string): unknown {
  const src = fs.readFileSync(file, "utf8");
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (c === '"') {
      let j = i + 1;
      while (src[j] !== '"') j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j;
    } else if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
    } else out += c;
  }
  return JSON.parse(out.replace(/,(\s*[\]}])/g, "$1"));
}

describe("wrangler.jsonc ratelimits", () => {
  type Rl = { name: string; namespace_id: string; simple: { limit: number; period: number } };
  const config = readJsonc(path.join(__dirname, "../../wrangler.jsonc")) as {
    ratelimits: Rl[];
    env: Record<string, { ratelimits?: Rl[] }>;
  };
  const scopes: [string, Rl[] | undefined][] = [
    ["top level", config.ratelimits],
    ...Object.entries(config.env).map(([name, e]) => [name, e.ratelimits] as [string, Rl[] | undefined]),
  ];
  const namespaces = new Set<string>();

  it.each(scopes)("%s declares every limit with the numbers in RATE_LIMITS", (_scope, list) => {
    expect(list).toBeDefined();
    for (const [name, rl] of Object.entries(RATE_LIMITS) as [RateLimitName, (typeof RATE_LIMITS)[RateLimitName]][]) {
      const binding = list!.find((b) => b.name === rl.binding);
      expect(binding, `${rl.binding} (${name})`).toBeDefined();
      expect(binding!.simple).toEqual({ limit: rl.limit, period: rl.periodSeconds });
      expect(namespaces.has(binding!.namespace_id), `namespace ${binding!.namespace_id} reused`).toBe(false);
      namespaces.add(binding!.namespace_id);
    }
    expect(list).toHaveLength(Object.keys(RATE_LIMITS).length);
  });
});
