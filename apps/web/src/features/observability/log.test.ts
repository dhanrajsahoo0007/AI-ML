import { afterEach, describe, expect, it } from "vitest";
import { formatLog, log, redact, requestContext, setLogSink } from "@/server/log";

describe("redact", () => {
  it("drops fields named like secrets, at any depth", () => {
    const out = redact({
      email: "a@b.co",
      userEmail: "a@b.co",
      token: "t",
      access_token: "t",
      cookie: "oa_ent=1",
      headers: { Cookie: "s=1", "Set-Cookie": "s=1", authorization: "Bearer abc", "user-agent": "UA" },
      password: "p",
      api_key: "k",
      sessionId: "s",
      webhook_signature: "sig",
      nested: [{ refresh_token: "r", ok: 1 }],
    });
    expect(out).toEqual({
      email: "[redacted]",
      userEmail: "[redacted]",
      token: "[redacted]",
      access_token: "[redacted]",
      cookie: "[redacted]",
      headers: { Cookie: "[redacted]", "Set-Cookie": "[redacted]", authorization: "[redacted]", "user-agent": "UA" },
      password: "[redacted]",
      api_key: "[redacted]",
      sessionId: "[redacted]",
      webhook_signature: "[redacted]",
      nested: [{ refresh_token: "[redacted]", ok: 1 }],
    });
  });

  it("masks emails, bearer tokens and JWTs inside other strings", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJlLXZhbHVl";
    expect(redact(`sign-in failed for Jane.Doe+x@example.co.uk`)).toBe("sign-in failed for [email]");
    expect(redact(`upstream said: Bearer abc.def-123`)).toBe("upstream said: Bearer [redacted]");
    expect(redact(`got ${jwt} back`)).toBe("got [jwt] back");
  });

  it("keeps errors readable but masked, and Headers as plain objects", () => {
    const err = redact(new Error("no user bob@example.com")) as { name: string; message: string; stack: string };
    expect(err.name).toBe("Error");
    expect(err.message).toBe("no user [email]");
    expect(err.stack).not.toContain("bob@example.com");
    expect(redact(new Headers({ cookie: "a=1", "cf-ray": "x-BOM" }))).toEqual({
      cookie: "[redacted]",
      "cf-ray": "x-BOM",
    });
  });

  it("leaves the §10.2 fields alone and stops at a fixed depth", () => {
    const fields = { user_id: "u_1", tier: "pro", cache: "hit", colo: "BOM", status: 200, duration_ms: 3 };
    expect(redact(fields)).toEqual(fields);
    let deep: Record<string, unknown> = { v: 1 };
    for (let i = 0; i < 10; i++) deep = { deep };
    expect(JSON.stringify(redact(deep))).toContain("[truncated]");
  });
});

describe("log", () => {
  let restore: (() => void) | undefined;
  afterEach(() => restore?.());

  it("writes one JSON line per call with the level, message and redacted fields", () => {
    const lines: [string, string][] = [];
    restore = setLogSink((level, line) => lines.push([level, line]));
    log.warn("checkout failed", {
      request_id: "8f1c-BOM",
      route: "/api/billing/checkout",
      status: 502,
      duration_ms: 41,
      user_id: "u_1",
      tier: "free",
      cache: "dynamic",
      colo: "BOM",
      email: "x@y.io",
    });
    expect(lines).toHaveLength(1);
    const [level, line] = lines[0];
    expect(level).toBe("warn");
    const entry = JSON.parse(line);
    expect(entry).toMatchObject({
      level: "warn",
      msg: "checkout failed",
      request_id: "8f1c-BOM",
      route: "/api/billing/checkout",
      status: 502,
      duration_ms: 41,
      user_id: "u_1",
      tier: "free",
      cache: "dynamic",
      colo: "BOM",
      email: "[redacted]",
    });
    expect(Date.parse(entry.ts)).not.toBeNaN();
  });

  it("never lets a field overwrite the level, message or timestamp", () => {
    const entry = JSON.parse(formatLog("info", "hi", { level: "error", msg: "x", ts: "never" }));
    expect(entry.level).toBe("info");
    expect(entry.msg).toBe("hi");
    expect(entry.ts).not.toBe("never");
  });
});

describe("requestContext", () => {
  it("takes the request ID and colo from cf-ray", () => {
    expect(requestContext(new Headers({ "cf-ray": "8f1c2a3b4d5e6f70-BOM" }))).toEqual({
      request_id: "8f1c2a3b4d5e6f70-BOM",
      colo: "BOM",
    });
  });

  it("falls back to x-request-id, then a random ID", () => {
    expect(requestContext(new Headers({ "x-request-id": "abc" }))).toEqual({ request_id: "abc" });
    expect(requestContext(new Headers()).request_id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
