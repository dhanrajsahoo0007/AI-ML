import { afterEach, describe, expect, it, vi } from "vitest";
import { appVersion, edgeEnvSchema, readEdgeEnv } from "./env";
import { coloFromRay, health, healthHandler } from "./health";
import { MAINTENANCE_MARKER, RETRY_AFTER_SEC, maintenanceResponse } from "./maintenance";

afterEach(() => vi.unstubAllEnvs());

describe("edge env", () => {
  it("reads and validates the variables", () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("NEXT_PUBLIC_GIT_SHA", "0123456789abcdef0123456789abcdef01234567");
    vi.stubEnv("SECTIONS_KILL", "some-section");
    vi.stubEnv("ENTITLEMENT_SECRET", "");
    expect(readEdgeEnv()).toEqual({
      APP_ENV: "staging",
      NEXT_PUBLIC_GIT_SHA: "0123456789abcdef0123456789abcdef01234567",
      SECTIONS_KILL: "some-section",
      ENTITLEMENT_SECRET: undefined,
      ENTITLEMENT_SECRET_PREVIOUS: undefined,
    });
  });

  it("falls back safely on bad values instead of throwing in middleware", () => {
    const env = edgeEnvSchema.parse({ APP_ENV: "prod", NEXT_PUBLIC_GIT_SHA: "not a sha" });
    expect(env.APP_ENV).toBe("local");
    expect(env.NEXT_PUBLIC_GIT_SHA).toBeUndefined();
    expect(appVersion(env)).toBe("dev");
  });
});

describe("health", () => {
  it("reports status, version, env and the Cloudflare colo", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_GIT_SHA", "abc1234");
    const req = new Request("https://example.workers.dev/api/health", {
      headers: { "cf-ray": "8c1f2a3b4c5d6e7f-SIN" },
    });
    expect(health(req)).toEqual({ status: "ok", version: "abc1234", env: "production", region: "SIN" });
    const res = healthHandler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ version: "abc1234" });
  });

  it("has no region off Cloudflare", () => {
    expect(coloFromRay(null)).toBeNull();
    expect(coloFromRay("garbage")).toBeNull();
  });
});

describe("maintenance page", () => {
  it("is a 503 with Retry-After that no cache stores", async () => {
    const res = maintenanceResponse();
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe(String(RETRY_AFTER_SEC));
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(await res.text()).toContain(MAINTENANCE_MARKER);
  });
});
