import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { consentLog, session } from "@/server/db/schema";
import { testDatabaseAvailable } from "@/server/db/testing";
import { CONSENT_VERSIONS } from "@/server/db/consent";
import { testUserEmail } from "@/server/db/test-users";
import { authConfig } from "./config";
import { call, cookieHeader, setupAuthTestEnv, TEST_KEY, testLoginAs } from "./test-helpers";
import { TEST_LOGIN_HEADER } from "./test-login";

// Better Auth wiring against a real Postgres: the test-login provider, the 3-session limit, session rotation,
// the age confirmation and Google sign-in parameters (plan §8.3, §11.2, §12.3).
const available = await testDatabaseAvailable();

describe.skipIf(!available)("auth (integration)", () => {
  let env: Awaited<ReturnType<typeof setupAuthTestEnv>>;
  beforeAll(async () => {
    env = await setupAuthTestEnv({ GOOGLE_CLIENT_ID: "test-client-id", GOOGLE_CLIENT_SECRET: "test-client-secret" });
  });
  afterAll(async () => {
    await env?.teardown();
  });

  const sessionsOf = (userId: string) => env.tdb.db.select().from(session).where(eq(session.userId, userId));

  describe("test login", () => {
    it("answers 404 without the right key or for an unknown user", async () => {
      const { POST } = await import("@/app/api/test/login/route");
      const noKey = await call(POST, "/api/test/login", { method: "POST", body: { userKey: "free" } });
      expect(noKey.status).toBe(404);
      const wrong = await call(POST, "/api/test/login", {
        method: "POST",
        body: { userKey: "free" },
        headers: { [TEST_LOGIN_HEADER]: `${TEST_KEY}x` },
      });
      expect(wrong.status).toBe(404);
      const unknown = await call(POST, "/api/test/login", {
        method: "POST",
        body: { userKey: "root" },
        headers: { [TEST_LOGIN_HEADER]: TEST_KEY },
      });
      expect(unknown.status).toBe(400);
    });

    it("creates a real session with host-only, HttpOnly, SameSite=Lax cookies", async () => {
      const { POST } = await import("@/app/api/test/login/route");
      const res = await call(POST, "/api/test/login", {
        method: "POST",
        body: { userKey: "pro_monthly" },
        headers: { [TEST_LOGIN_HEADER]: TEST_KEY },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const token = res.headers.getSetCookie().find((c) => c.startsWith("oa.session_token="));
      expect(token).toMatch(/HttpOnly/i);
      expect(token).toMatch(/SameSite=Lax/i);
      expect(token).not.toMatch(/Domain=/i);
      expect(await sessionsOf(env.ids.pro_monthly)).toHaveLength(1);
    });

    it("keeps the cached session encrypted: no email or name readable in oa.session_data (L2)", async () => {
      const { POST } = await import("@/app/api/test/login/route");
      const res = await call(POST, "/api/test/login", {
        method: "POST",
        body: { userKey: "free" },
        headers: { [TEST_LOGIN_HEADER]: TEST_KEY },
      });
      const data = res.headers.getSetCookie().find((c) => c.startsWith("oa.session_data="));
      expect(data).toBeDefined();
      const value = decodeURIComponent(data!.split(";")[0]!.slice("oa.session_data=".length));
      const decoded = value
        .split(".")
        .map((part) => Buffer.from(part, "base64url").toString("latin1"))
        .join("|");
      expect(decoded).not.toContain(testUserEmail("free"));
      expect(decoded).not.toContain('"email"');
      expect(decoded).toContain('"enc"');
    });

    it("sign-out (and sign out everywhere) also clears the entitlement cookies (plan §11.3)", async () => {
      const cleared = (res: Response) =>
        ["tts_ent", "tts_ent_hint"].every((name) =>
          res.headers.getSetCookie().some((c) => c.startsWith(`${name}=;`) && /Max-Age=0/i.test(c))
        );
      const { POST } = await import("@/app/api/auth/[...all]/route");
      const cookie = await testLoginAs("pro_monthly");
      const out = await call(POST, "/api/auth/sign-out", { method: "POST", body: {}, cookie });
      expect(out.status).toBe(200);
      expect(cleared(out)).toBe(true);

      const { DELETE } = await import("@/app/api/account/sessions/route");
      const everywhere = await call(DELETE, "/api/account/sessions", {
        method: "DELETE",
        cookie: await testLoginAs("pro_monthly"),
      });
      expect(everywhere.status).toBe(200);
      expect(cleared(everywhere)).toBe(true);
    });

    it("is not registered unless APP_ENV allows it and ENABLE_TEST_LOGIN=1", () => {
      const base = { ENABLE_TEST_LOGIN: "1", TEST_LOGIN_KEY: TEST_KEY, BETTER_AUTH_SECRET: "s".repeat(32) };
      const prod = { ...base, BETTER_AUTH_URL: "https://example.com" };
      expect(authConfig(prod, "production").testLogin).toBeNull();
      expect(authConfig({ ...base, ENABLE_TEST_LOGIN: "0" }, "test").testLogin).toBeNull();
      expect(
        authConfig({ ...base, BETTER_AUTH_URL: "https://staging.example.com" }, "staging").testLogin
      ).not.toBeNull();
    });
  });

  it("keeps only the newest 3 sessions per user", async () => {
    const cookies: string[] = [];
    for (let i = 0; i < 4; i++) cookies.push(await testLoginAs("pro_yearly"));
    const rows = await sessionsOf(env.ids.pro_yearly);
    expect(rows).toHaveLength(3);

    const { GET } = await import("@/app/api/progress/route");
    expect((await call(GET, "/api/progress", { cookie: cookies[0] })).status).toBe(401);
    expect((await call(GET, "/api/progress", { cookie: cookies[3] })).status).toBe(200);
  });

  it("rotates the session on sign-in: the browser's previous session is revoked", async () => {
    const first = await testLoginAs("on_hold");
    const second = await testLoginAs("on_hold", first);
    expect(second).not.toBe(first);
    expect(await sessionsOf(env.ids.on_hold)).toHaveLength(1);
  });

  it("records the age confirmation in consent_log when the session is created", async () => {
    const userId = env.ids.admin;
    await env.tdb.db.delete(consentLog).where(eq(consentLog.userId, userId));
    const { POST: consent } = await import("@/app/api/account/consent/route");
    const res = await call(consent, "/api/account/consent", { method: "POST", body: { ageConfirmed: true } });
    expect(res.status).toBe(200);
    const ageCookie = cookieHeader(res);
    expect(ageCookie).toMatch(/^tts_age_ok=/);
    expect(res.headers.getSetCookie()[0]).toMatch(/Path=\/api\/auth/);

    const { POST } = await import("@/app/api/test/login/route");
    await call(POST, "/api/test/login", {
      method: "POST",
      body: { userKey: "admin" },
      cookie: ageCookie,
      headers: { [TEST_LOGIN_HEADER]: TEST_KEY, "cf-ipcountry": "IN" },
    });
    const rows = await env.tdb.db
      .select()
      .from(consentLog)
      .where(and(eq(consentLog.userId, userId), eq(consentLog.kind, "age_confirmation")));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ textVersion: CONSENT_VERSIONS.age_confirmation, country: "IN" });
  });

  it("rejects an age confirmation that isn't exactly `true`", async () => {
    const { POST: consent } = await import("@/app/api/account/consent/route");
    expect(
      (await call(consent, "/api/account/consent", { method: "POST", body: { ageConfirmed: false } })).status
    ).toBe(400);
  });

  describe("Google sign-in", () => {
    const signIn = async (cookie?: string, callbackURL = "/sign-in/complete") => {
      const { POST } = await import("@/app/api/auth/[...all]/route");
      return call(POST, "/api/auth/sign-in/social", {
        method: "POST",
        body: { provider: "google", callbackURL },
        cookie,
        params: { all: ["sign-in", "social"] },
      });
    };

    it("requires the age confirmation first", async () => {
      const res = await signIn();
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ code: "AGE_CONFIRMATION_REQUIRED" });
    });

    it("redirects to Google with openid email profile, PKCE and state", async () => {
      const res = await signIn("tts_age_ok=" + CONSENT_VERSIONS.age_confirmation);
      expect(res.status).toBe(200);
      const { url } = (await res.json()) as { url: string };
      const google = new URL(url);
      expect(google.origin).toBe("https://accounts.google.com");
      expect(google.searchParams.get("client_id")).toBe("test-client-id");
      expect(google.searchParams.get("scope")?.split(" ").sort()).toEqual(["email", "openid", "profile"]);
      expect(google.searchParams.get("code_challenge_method")).toBe("S256");
      expect(google.searchParams.get("state")).toBeTruthy();
      expect(google.searchParams.get("redirect_uri")).toBe("http://localhost:3001/api/auth/callback/google");
    });

    it("refuses a callbackURL on another origin", async () => {
      const res = await signIn("tts_age_ok=" + CONSENT_VERSIONS.age_confirmation, "https://evil.example/steal");
      expect(res.status).toBe(403);
    });
  });
});
