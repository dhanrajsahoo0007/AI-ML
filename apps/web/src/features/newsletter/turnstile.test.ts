import { describe, expect, it } from "vitest";
import { turnstileFromEnv, TurnstileVerifier } from "./turnstile";
import { TURNSTILE_ACTION } from "./turnstile-config";

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

function fakeFetch(response: unknown, status = 200) {
  const calls: FormData[] = [];
  const impl = (async (_url: string, init: RequestInit) => {
    calls.push(init.body as FormData);
    return new Response(JSON.stringify(response), { status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("Turnstile verifier", () => {
  it("is off without TURNSTILE_SECRET_KEY", () => {
    expect(turnstileFromEnv(env({}))).toBeNull();
    expect(turnstileFromEnv(env({ TURNSTILE_SECRET_KEY: "" }))).toBeNull();
    expect(turnstileFromEnv(env({ TURNSTILE_SECRET_KEY: "0x4AAA" }))).toBeInstanceOf(TurnstileVerifier);
  });

  it("posts secret, token and IP to Siteverify and accepts a success for our action", async () => {
    const { impl, calls } = fakeFetch({ success: true, action: TURNSTILE_ACTION });
    expect(await new TurnstileVerifier("secret", impl).verify("tok", "203.0.113.5")).toEqual({ ok: true });
    expect(calls[0].get("secret")).toBe("secret");
    expect(calls[0].get("response")).toBe("tok");
    expect(calls[0].get("remoteip")).toBe("203.0.113.5");
  });

  it("refuses a missing token without calling Cloudflare", async () => {
    const { impl, calls } = fakeFetch({ success: true });
    expect(await new TurnstileVerifier("secret", impl).verify(undefined, "ip")).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(calls).toHaveLength(0);
  });

  it("refuses a failed check and a token made for another action", async () => {
    const failed = fakeFetch({ success: false, "error-codes": ["invalid-input-response"] });
    expect(await new TurnstileVerifier("s", failed.impl).verify("t", "ip")).toEqual({ ok: false, reason: "rejected" });
    const other = fakeFetch({ success: true, action: "login" });
    expect(await new TurnstileVerifier("s", other.impl).verify("t", "ip")).toEqual({ ok: false, reason: "rejected" });
  });

  it("fails closed as unavailable on HTTP errors, bad JSON and network errors", async () => {
    expect(await new TurnstileVerifier("s", fakeFetch({}, 500).impl).verify("t", "ip")).toMatchObject({
      reason: "unavailable",
    });
    expect(await new TurnstileVerifier("s", fakeFetch({ nope: 1 }).impl).verify("t", "ip")).toMatchObject({
      reason: "unavailable",
    });
    const throwing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await new TurnstileVerifier("s", throwing).verify("t", "ip")).toMatchObject({ reason: "unavailable" });
  });
});
