import { describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { authConfig } from "./config";
import { createAuth } from "./server";

// H1 (security review): Better Auth's own limiter is on (a second, per-isolate layer behind the route()
// wrapper's Workers binding), keyed by `cf-connecting-ip`, with sign-in capped at 10 per minute per IP.
// No database is needed: the limiter answers before any endpoint runs.

const config = authConfig({ BETTER_AUTH_URL: "http://localhost:3001" }, "local");

const signIn = (auth: ReturnType<typeof createAuth>, ip: string) =>
  auth.handler(
    new Request("http://localhost:3001/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3001", "cf-connecting-ip": ip },
      body: JSON.stringify({ provider: "google" }),
    })
  );

describe("Better Auth rate limit", () => {
  it("answers 429 after 10 sign-in attempts a minute from one IP", async () => {
    const auth = createAuth({} as Db, config, { rateLimit: true });
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await signIn(auth, "203.0.113.50")).status);
    expect(statuses.slice(0, 10)).not.toContain(429);
    expect(statuses[10]).toBe(429);
    // A different IP is unaffected.
    expect((await signIn(auth, "203.0.113.51")).status).not.toBe(429);
  });

  it("is off where no trusted client IP exists (next start, tests), unless asked for", async () => {
    const auth = createAuth({} as Db, config);
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await signIn(auth, "203.0.113.60")).status);
    expect(statuses).not.toContain(429);
  });
});
