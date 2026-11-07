import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareBindings, serverEnv } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("server env", () => {
  it("validates the variables route handlers read", () => {
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("ENTITLEMENT_SECRET", "k1:abc");
    expect(serverEnv()).toMatchObject({ APP_ENV: "preview", ENTITLEMENT_SECRET: "k1:abc" });
  });

  it("has no Cloudflare bindings outside the Workers runtime", () => {
    expect(cloudflareBindings()).toBeNull();
  });
});
