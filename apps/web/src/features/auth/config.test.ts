import { describe, expect, it } from "vitest";
import { authConfig, isGoogleConfigured } from "./config";
import { safeNextPath } from "./next-path";
import { safeEqual } from "./safe-equal";

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
        TRUSTED_ORIGINS: " https://*-origins.example.workers.dev/ , https://staging.example.com",
        GOOGLE_CLIENT_ID: "id",
      },
      "staging"
    );
    expect(c.trustedOrigins).toEqual(["https://staging.example.com", "https://*-origins.example.workers.dev"]);
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

describe("safeNextPath", () => {
  it("keeps same-site paths and drops everything else", () => {
    expect(safeNextPath("/system-design/caching")).toBe("/system-design/caching");
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "/api/x",
      "/sign-in",
    ]) {
      expect(safeNextPath(bad)).toBe("/account");
    }
    expect(safeNextPath(undefined, "/")).toBe("/");
    expect(safeNextPath(["/a", "/b"])).toBe("/a");
  });
});

describe("safeEqual", () => {
  it("compares exactly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
