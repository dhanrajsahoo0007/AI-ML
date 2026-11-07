import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { originAllowed, setRateLimiter } from "@/server/http";
import { testDatabaseAvailable } from "@/server/db/testing";
import { route } from "./route";
import { call, setupAuthTestEnv, testLoginAs } from "./test-helpers";

// The route() wrapper (plan §11.6): rejections happen before the handler runs, every response is no-store,
// and errors never leak internals.

describe("originAllowed", () => {
  const allowed = ["https://example.com", "https://*-origins.example.workers.dev"];
  it("matches exact origins and single-label wildcards", () => {
    expect(originAllowed("https://example.com", allowed)).toBe(true);
    expect(originAllowed("https://pr-12-origins.example.workers.dev", allowed)).toBe(true);
    expect(originAllowed("https://a.b-origins.example.workers.dev", allowed)).toBe(false);
    expect(originAllowed("https://example.com.evil.test", allowed)).toBe(false);
    expect(originAllowed("http://example.com", allowed)).toBe(false);
    expect(originAllowed(null, allowed)).toBe(false);
    expect(originAllowed("null", allowed)).toBe(false);
  });
});

const available = await testDatabaseAvailable();

describe.skipIf(!available)("route() wrapper (integration)", () => {
  let env: Awaited<ReturnType<typeof setupAuthTestEnv>>;
  let userCookie: string;
  let adminCookie: string;
  beforeAll(async () => {
    env = await setupAuthTestEnv();
    userCookie = await testLoginAs("free");
    adminCookie = await testLoginAs("admin");
  });
  afterAll(async () => {
    await env?.teardown();
  });
  afterEach(() => setRateLimiter(null));

  let ran = 0;
  const echo = route({
    auth: "user",
    body: z.object({ name: z.string().max(20) }),
    handler: ({ body, auth }) => {
      ran++;
      return { name: body.name, userId: auth.user.id };
    },
  });
  const adminOnly = route({ auth: "admin", handler: () => ({ ok: true }) });
  const boom = route({
    handler: () => {
      throw new Error("db password is hunter2");
    },
  });

  it("accepts a valid request", async () => {
    const res = await call(echo, "/api/x", { method: "POST", body: { name: "Ada" }, cookie: userCookie });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ name: "Ada", userId: env.ids.free });
  });

  it("rejects unknown fields", async () => {
    const before = ran;
    const res = await call(echo, "/api/x", {
      method: "POST",
      body: { name: "Ada", role: "admin" },
      cookie: userCookie,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("invalid_body");
    expect(ran).toBe(before);
  });

  it("rejects a bad or missing Origin on state-changing methods", async () => {
    const evil = await call(echo, "/api/x", {
      method: "POST",
      body: { name: "Ada" },
      cookie: userCookie,
      origin: "https://evil.example",
    });
    expect(evil.status).toBe(403);
    expect(((await evil.json()) as { error: { code: string } }).error.code).toBe("bad_origin");
    const missing = await call(echo, "/api/x", {
      method: "POST",
      body: { name: "Ada" },
      cookie: userCookie,
      origin: null,
    });
    expect(missing.status).toBe(403);
    expect(missing.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects unauthenticated requests and revoked or forged sessions", async () => {
    expect((await call(echo, "/api/x", { method: "POST", body: { name: "Ada" } })).status).toBe(401);
    const forged = await call(echo, "/api/x", {
      method: "POST",
      body: { name: "Ada" },
      cookie: "oa.session_token=not-a-real-token.signature",
    });
    expect(forged.status).toBe(401);
  });

  it("enforces roles", async () => {
    expect((await call(adminOnly, "/api/admin", { cookie: userCookie })).status).toBe(403);
    expect((await call(adminOnly, "/api/admin", { cookie: adminCookie })).status).toBe(200);
  });

  it("rejects non-JSON and malformed bodies", async () => {
    const form = await call(echo, "/api/x", {
      method: "POST",
      body: "name=Ada",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      cookie: userCookie,
    });
    expect(form.status).toBe(415);
    const broken = await call(echo, "/api/x", { method: "POST", body: "{", cookie: userCookie });
    expect(broken.status).toBe(400);
  });

  it("returns a uniform error with no internals", async () => {
    const res = await call(boom, "/api/boom");
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ error: { code: "internal_error" }, requestId: expect.any(String) });
    expect(text).not.toMatch(/hunter2|at .*\.ts|stack/i);
  });

  it("calls the rate-limit hook with the user key and answers 429 when it refuses", async () => {
    const seen: string[] = [];
    setRateLimiter({
      limit: async ({ name, key }) => {
        seen.push(`${name}:${key}`);
        return { success: false };
      },
    });
    const limited = route({ auth: "user", rateLimit: { name: "progress", by: "user" }, handler: () => ({ ok: true }) });
    const res = await call(limited, "/api/x", { cookie: userCookie });
    expect(res.status).toBe(429);
    expect(seen).toEqual([`progress:user:${env.ids.free}`]);
  });
});
