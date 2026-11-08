import { afterEach, describe, expect, it, vi } from "vitest";

// Hyperdrive wiring (plan §8.1): on Workers the connection string comes from the HYPERDRIVE binding, read per
// request; without it DATABASE_URL is used; the boot guard runs on whichever string wins. No database needed:
// createDb() connects lazily, on the first query, and nothing here queries.

const context = vi.hoisted(() => ({ env: null as Record<string, unknown> | null }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => {
    if (!context.env) throw new Error("not on Cloudflare");
    return { env: context.env };
  },
}));

const { createDb, hyperdriveConnectionString } = await import("./client");
const { databaseUrl } = await import("./config");

const LOCAL = "postgres://origins:origins@127.0.0.1:54329/origins_dev";
// The shape Hyperdrive hands the Worker: a per-config host under hyperdrive.local, no sslmode (Hyperdrive itself
// reaches Neon over TLS).
const HYPERDRIVE = "postgresql://app_rw:x@0123abcd.hyperdrive.local:5432/neondb";

afterEach(() => {
  context.env = null;
  vi.unstubAllEnvs();
});

describe("Hyperdrive connection string source", () => {
  it("reads the binding when the Worker has it", () => {
    expect(hyperdriveConnectionString({ HYPERDRIVE: { connectionString: HYPERDRIVE } })).toBe(HYPERDRIVE);
    expect(hyperdriveConnectionString({})).toBeUndefined();
    expect(hyperdriveConnectionString(null)).toBeUndefined();
    expect(hyperdriveConnectionString({ HYPERDRIVE: { connectionString: "" } })).toBeUndefined();
  });

  it("is registered by the client module: the binding wins over DATABASE_URL", () => {
    vi.stubEnv("DATABASE_URL", LOCAL);
    context.env = { HYPERDRIVE: { connectionString: HYPERDRIVE } };
    expect(databaseUrl()).toBe(HYPERDRIVE);
  });

  it("falls back to DATABASE_URL without the binding, on Cloudflare or off it", () => {
    vi.stubEnv("DATABASE_URL", LOCAL);
    context.env = { APP_ENV: "staging" };
    expect(databaseUrl()).toBe(LOCAL);
    context.env = null;
    expect(databaseUrl()).toBe(LOCAL);
  });

  it("still fails clearly when neither exists", () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(() => databaseUrl()).toThrow(/No database configured/);
  });
});

describe("boot guard on the resolved string", () => {
  it("accepts Hyperdrive (no sslmode) in preview, staging and production", async () => {
    context.env = { HYPERDRIVE: { connectionString: HYPERDRIVE } };
    for (const appEnv of ["preview", "staging", "production"] as const) {
      const handle = createDb({ appEnv });
      await handle.close();
    }
  });

  it("refuses Hyperdrive locally and in tests: hyperdrive.local looks local but fronts a real database", () => {
    context.env = { HYPERDRIVE: { connectionString: HYPERDRIVE } };
    expect(() => createDb({ appEnv: "local" })).toThrow(/non-local database host "0123abcd\.hyperdrive\.local"/);
    expect(() => createDb({ appEnv: "test" })).toThrow(/APP_ENV=test/);
  });

  it("only exempts the real hyperdrive.local suffix from the TLS rule", () => {
    const lookalike = "postgresql://u:x@0123abcd.hyperdrive.local.example.com:5432/db";
    context.env = { HYPERDRIVE: { connectionString: lookalike } };
    expect(() => createDb({ appEnv: "production" })).toThrow(/without TLS/);
    context.env = { HYPERDRIVE: { connectionString: "postgresql://u:x@hyperdrive.local:5432/db" } };
    expect(() => createDb({ appEnv: "production" })).toThrow(/without TLS/);
  });

  it("applies to a DATABASE_URL fallback the same way", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:x@ep-x.neon.tech/db");
    expect(() => createDb({ appEnv: "production" })).toThrow(/without TLS/);
    expect(() => createDb({ appEnv: "local" })).toThrow(/non-local/);
  });
});
