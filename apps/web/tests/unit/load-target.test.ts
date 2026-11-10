import { describe, expect, it } from "vitest";
import { assertAllowedTarget } from "../load/run";

// The load-test runner must never send load anywhere but localhost unless the owner names a staging host.
describe("load test target guard", () => {
  it.each(["http://localhost:8787", "http://127.0.0.1:3183", "http://[::1]:8787"])("allows %s", (base) => {
    expect(assertAllowedTarget(base, undefined).origin).toBe(new URL(base).origin);
  });

  it.each([
    "https://example.com",
    "https://tokenstoscale.workers.dev",
    "http://10.0.0.5:8787",
    "https://staging.example.com",
  ])("refuses %s without LOAD_ALLOW_HOST", (base) => {
    expect(() => assertAllowedTarget(base, undefined)).toThrow(/Refusing to load/);
  });

  it("allows a staging host only when LOAD_ALLOW_HOST names it exactly", () => {
    expect(assertAllowedTarget("https://staging.example.com", "staging.example.com").hostname).toBe(
      "staging.example.com"
    );
    expect(() => assertAllowedTarget("https://staging.example.com", "example.com")).toThrow();
  });

  it("refuses a production-looking host even when LOAD_ALLOW_HOST names it", () => {
    expect(() => assertAllowedTarget("https://example.com", "example.com")).toThrow();
    expect(() => assertAllowedTarget("https://www.example.com", "www.example.com")).toThrow();
  });
});
