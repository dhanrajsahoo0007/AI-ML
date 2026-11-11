import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_ENVS } from "../sections/schema";
import { showsPremiumEditorialLocally } from "./local-view";

// Local editorial review (plan 0.5): a premium problem page shows its editorial only on a local build with the
// local view switch on "Paid". Any other build must never read the request cookies (that would also make the page
// dynamic) and must never show it, whatever the cookie or LOCAL_VIEW_AS say.

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined, reads: 0 }));
vi.mock("next/headers", () => ({
  cookies: async () => {
    cookie.reads++;
    return { get: (name: string) => (name === "tts_local_view" && cookie.value ? { value: cookie.value } : undefined) };
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  cookie.value = undefined;
  cookie.reads = 0;
});

describe("showsPremiumEditorialLocally", () => {
  it.each(APP_ENVS.filter((e) => e !== "local"))("is false in a %s build, without reading cookies", async (env) => {
    vi.stubEnv("APP_ENV", env);
    vi.stubEnv("LOCAL_VIEW_AS", "paid");
    for (const value of ["paid", "unpaid", "real", undefined]) {
      cookie.value = value;
      expect(await showsPremiumEditorialLocally()).toBe(false);
    }
    expect(cookie.reads).toBe(0);
  });
  it("is true in a local build when the switch says Paid", async () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("LOCAL_VIEW_AS", "");
    cookie.value = "paid";
    expect(await showsPremiumEditorialLocally()).toBe(true);
    cookie.value = "unpaid";
    expect(await showsPremiumEditorialLocally()).toBe(false);
    cookie.value = "real";
    expect(await showsPremiumEditorialLocally()).toBe(false);
  });
  it("falls back to LOCAL_VIEW_AS in a local build when no cookie is set", async () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("LOCAL_VIEW_AS", "paid");
    expect(await showsPremiumEditorialLocally()).toBe(true);
    vi.stubEnv("LOCAL_VIEW_AS", "unpaid");
    expect(await showsPremiumEditorialLocally()).toBe(false);
  });
});
