import { describe, expect, it } from "vitest";
import { assertDatabaseAllowed, assertLocalDatabase, databaseHost, readAppEnv } from "./config";
import { uuidv7 } from "./uuid";

const LOCAL = "postgres://origins:origins@127.0.0.1:54329/origins_dev";
const NEON = "postgresql://app_rw:x@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require";
const HYPERDRIVE = "postgresql://app_rw:x@0123abcd.hyperdrive.local:5432/neondb";

describe("boot guard (plan §8.1)", () => {
  it("allows local hosts in every environment", () => {
    for (const url of [
      LOCAL,
      "postgres://u@localhost/db",
      "postgres://u@[::1]:5432/db",
      "postgres://u@db.localhost/x",
    ]) {
      for (const env of ["local", "test", "preview", "staging", "production"] as const) {
        expect(() => assertDatabaseAllowed(url, env)).not.toThrow();
      }
    }
  });

  it("treats a Unix socket as local", () => {
    expect(databaseHost("postgres:///db?host=/var/run/postgresql")).toBe("");
    expect(() => assertDatabaseAllowed("postgres:///db?host=/var/run/postgresql", "local")).not.toThrow();
  });

  it("refuses non-local hosts outside preview, staging and production", () => {
    for (const url of [NEON, HYPERDRIVE]) {
      expect(() => assertDatabaseAllowed(url, "local")).toThrow(/Refusing to connect to non-local database host/);
      expect(() => assertDatabaseAllowed(url, "test")).toThrow(/APP_ENV=test/);
      for (const env of ["preview", "staging", "production"] as const) {
        expect(() => assertDatabaseAllowed(url, env)).not.toThrow();
      }
    }
  });

  it("can't be fooled by a socket parameter naming a remote host", () => {
    expect(() => assertDatabaseAllowed(`${LOCAL}?host=ep-x.neon.tech`, "local")).toThrow(/ep-x\.neon\.tech/);
  });

  it("rejects malformed and non-Postgres URLs", () => {
    expect(() => assertDatabaseAllowed("not a url", "local")).toThrow(/not a valid URL/);
    expect(() => assertDatabaseAllowed("mysql://localhost/db", "local")).toThrow(/Unsupported/);
  });

  it("never seeds or truncates a remote database, whatever APP_ENV says", () => {
    expect(() => assertLocalDatabase(LOCAL, "seed")).not.toThrow();
    expect(() => assertLocalDatabase(NEON, "seed")).toThrow(/Refusing to seed/);
  });
});

describe("readAppEnv", () => {
  it("falls back like the section registry", () => {
    expect(readAppEnv(undefined, "production")).toBe("production");
    expect(readAppEnv(undefined, "development")).toBe("local");
    expect(readAppEnv("staging", "production")).toBe("staging");
    expect(() => readAppEnv("prod", "production")).toThrow();
  });
});

describe("uuidv7", () => {
  it("is a version 7, RFC 9562 variant UUID with the timestamp first", () => {
    const id = uuidv7(0x0189_abcd_ef01);
    expect(id).toMatch(/^0189abcd-ef01-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("sorts by creation time", () => {
    const ids = [1, 2, 3, 1000, 2 ** 40].map((t) => uuidv7(t));
    expect([...ids].sort()).toEqual(ids);
  });
});
