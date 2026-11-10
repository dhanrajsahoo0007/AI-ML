import { describe, expect, it } from "vitest";
import { authConfig, isGoogleConfigured } from "./config";
import { safeNextPath } from "./next-path";

const SECRET = "s".repeat(32);

describe("authConfig", () => {
  it("runs locally with no env vars, Google disabled, test login off", () => {
    const c = authConfig({}, "local");
    expect(c.baseURL).toBe("http://localhost:3001");
    expect(c.google).toBeNull();
    expect(c.testLogin).toBeNull();
    expect(c.secureCookies).toBe(false);
  });

  it("requires a secret and URL outside local and test", () => {
    for (const env of ["preview", "staging", "production"] as const) {
      expect(() => authConfig({}, env)).toThrow(/BETTER_AUTH_SECRET is required/);
      expect(() => authConfig({ BETTER_AUTH_SECRET: SECRET }, env)).toThrow(/BETTER_AUTH_URL is required/);
    }
    expect(() => authConfig({ BETTER_AUTH_SECRET: "short" }, "local")).toThrow(/at least 32/);
  });

  it("insists on https and secure cookies in production", () => {
    expect(() =>
      authConfig({ BETTER_AUTH_SECRET: SECRET, BETTER_AUTH_URL: "http://example.com" }, "production")
    ).toThrow(/https/);
    const c = authConfig({ BETTER_AUTH_SECRET: SECRET, BETTER_AUTH_URL: "https://example.com/" }, "production");
    expect(c.secureCookies).toBe(true);
    expect(c.trustedOrigins).toEqual(["https://example.com"]);
  });

  it("adds TRUSTED_ORIGINS and enables Google only with both credentials", () => {
    const c = authConfig(
      {
        BETTER_AUTH_SECRET: SECRET,
        BETTER_AUTH_URL: "https://staging.example.com",
        TRUSTED_ORIGINS: " https://*-tokenstoscale.example.workers.dev/ , https://staging.example.com",
        GOOGLE_CLIENT_ID: "id",
      },
      "staging"
    );
    expect(c.trustedOrigins).toEqual(["https://staging.example.com", "https://*-tokenstoscale.example.workers.dev"]);
    expect(c.google).toBeNull();
    expect(isGoogleConfigured({ GOOGLE_CLIENT_ID: "id" })).toBe(false);
    expect(isGoogleConfigured({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "x" })).toBe(true);
  });

  it("never enables the test login in production, and needs a long key elsewhere", () => {
    const env = { ENABLE_TEST_LOGIN: "1", TEST_LOGIN_KEY: "k".repeat(16), BETTER_AUTH_SECRET: SECRET };
    expect(authConfig({ ...env, BETTER_AUTH_URL: "https://example.com" }, "production").testLogin).toBeNull();
    expect(authConfig(env, "local").testLogin).toEqual({ key: "k".repeat(16) });
    expect(() => authConfig({ ...env, TEST_LOGIN_KEY: "short" }, "local")).toThrow(/at least 16/);
  });
});

describe("safeNextPath (security review M1)", () => {
  it("keeps same-origin paths, with their query and hash", () => {
    expect(safeNextPath("/system-design/caching")).toBe("/system-design/caching");
    expect(safeNextPath("/interviews?company=google#top")).toBe("/interviews?company=google#top");
    expect(safeNextPath("/a/./b/../c")).toBe("/a/c");
    expect(safeNextPath("/%E2%9C%93")).toBe("/%E2%9C%93");
    expect(safeNextPath(undefined, "/")).toBe("/");
    expect(safeNextPath(["/a", "/b"])).toBe("/a");
  });

  // Each value as the page receives it (search params are already decoded once).
  const bypasses = [
    "https://evil.example",
    "http:evil.example",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "\\/evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "\t//evil.example",
    "/\t\t/evil.example",
    "/%09/evil.example",
    "/%0A/evil.example",
    "/%0d/evil.example",
    "/%5Cevil.example",
    "/%2F/evil.example",
    "/%2f%2fevil.example",
    "/\u0000/evil.example",
    "/\u007F/evil.example",
    "/\u0085/evil.example",
    "/\u2028/evil.example",
    "/..//evil.example",
    "/./..//evil.example",
    "/a/../..//evil.example",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,x",
    " /x",
    "x",
    "",
    "/api/x",
    "/api",
    "/sign-in",
    "/sign-in/complete?next=//evil.example",
    "/%",
    `/${"a".repeat(600)}`,
  ];

  it.each(bypasses)("refuses %j", (bad) => {
    expect(safeNextPath(bad)).toBe("/account");
  });

  it("never returns something a browser would resolve off-origin", () => {
    for (const bad of bypasses) {
      expect(new URL(safeNextPath(bad), "https://tokenstoscale.example").origin).toBe("https://tokenstoscale.example");
    }
    expect(safeNextPath(42)).toBe("/account");
  });
});

describe("authRateLimit", () => {
  it("gives sign-in paths the strict limit and the rest of /api/auth/* the session limit", async () => {
    const { authRateLimit } = await import("./route");
    const at = (p: string) => authRateLimit(new Request(`https://example.com${p}`)).name;
    expect(at("/api/auth/sign-in/social")).toBe("auth");
    expect(at("/api/auth/callback/google")).toBe("auth");
    expect(at("/api/auth/get-session")).toBe("session");
    expect(at("/api/auth/sign-out")).toBe("session");
    expect(at("/api/auth/sign-inx")).toBe("session");
  });
});
