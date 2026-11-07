import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// track() reads NEXT_PUBLIC_POSTHOG_KEY, which Next inlines at build. Under Vitest it is a runtime lookup, so each
// test sets it and imports a fresh copy of the module.

const capture = vi.fn();
const startPostHog = vi.fn((key: string, host: string | undefined) => {
  void key;
  void host;
  return { capture };
});
vi.mock("./posthog.client", () => ({ startPostHog }));

async function freshTrack() {
  vi.resetModules();
  return import("./track");
}

beforeEach(() => {
  capture.mockClear();
  startPostHog.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("track() with PostHog off", () => {
  it("is a no-op and never loads PostHog", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { track, loadAnalytics } = await freshTrack();
    track("page_view", { path: "/", section: "home" });
    track("checkout_start", { plan: "yearly", country: "IN", currency: "INR", provider: "dodo" });
    await loadAnalytics();
    expect(startPostHog).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });
});

describe("track() with PostHog on", () => {
  it("queues events until PostHog has loaded, then sends them in order", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
    const { track, loadAnalytics } = await freshTrack();
    track("page_view", { path: "/pricing", section: "pricing" });
    track("pricing_view", { currency: "USD" });
    expect(capture).not.toHaveBeenCalled();

    await loadAnalytics();
    await loadAnalytics(); // loads once
    expect(startPostHog).toHaveBeenCalledTimes(1);
    expect(startPostHog).toHaveBeenCalledWith("phc_test", "https://eu.i.posthog.com");
    expect(capture.mock.calls).toEqual([
      ["page_view", { path: "/pricing", section: "pricing" }],
      ["pricing_view", { currency: "USD" }],
    ]);

    track("newsletter_subscribe", { source: "footer" });
    expect(capture).toHaveBeenLastCalledWith("newsletter_subscribe", { source: "footer" });
  });

  it("keeps at most 50 events while waiting", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { track, loadAnalytics } = await freshTrack();
    for (let i = 0; i < 80; i++) track("problem_run", { problem: `p${i}`, language: "python" });
    await loadAnalytics();
    expect(capture).toHaveBeenCalledTimes(50);
  });
});
