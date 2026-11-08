import { afterEach, describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({ env: null as Record<string, unknown> | null }));
vi.mock("@opennextjs/cloudflare/cloudflare-context", () => ({
  getCloudflareContext: () => {
    if (!context.env) throw new Error("not on Cloudflare");
    return { env: context.env };
  },
}));

const { analyticsDataset, edgeCountry, paywallPreviewPoint, toDataPoint, writeAnalytics } = await import(
  "./analytics"
);
type Point = Parameters<typeof writeAnalytics>[0];

const recorder = () => {
  const points: unknown[] = [];
  return { points, dataset: { writeDataPoint: (p: unknown) => void points.push(p) } };
};

afterEach(() => {
  context.env = null;
});

describe("toDataPoint: the column layout queries rely on", () => {
  it("puts the event name in index1 and blob1 and a count of 1 in double1, for every event", () => {
    const events: Point[] = [
      { event: "paywall_preview", path: "/system-design/x", section: "system-design", tier: "anonymous", country: "IN" },
      { event: "checkout_start", plan: "yearly", provider: "dodo", country: null, outcome: "ok" },
      { event: "billing_webhook", provider: "dodo", type: "subscription.active", outcome: "processed", durationMs: 42 },
      {
        event: "web_vital",
        route: "/",
        section: "home",
        metric: "LCP",
        rating: "good",
        navigationType: "navigate",
        value: 900,
      },
    ];
    for (const e of events) {
      const p = toDataPoint(e);
      expect(p.indexes).toEqual([e.event]);
      expect(p.blobs[0]).toBe(e.event);
      expect(p.doubles[0]).toBe(1);
    }
  });

  it("writes each event's fields in the documented positions", () => {
    expect(
      toDataPoint({ event: "paywall_preview", path: "/cloud/a", section: "cloud", tier: "free", country: null })
    ).toEqual({ indexes: ["paywall_preview"], blobs: ["paywall_preview", "/cloud/a", "cloud", "free", ""], doubles: [1] });
    expect(toDataPoint({ event: "checkout_start", plan: "monthly", provider: "dodo", country: "BR", outcome: "ok" }))
      .toEqual({ indexes: ["checkout_start"], blobs: ["checkout_start", "monthly", "dodo", "BR", "ok"], doubles: [1] });
    expect(
      toDataPoint({ event: "billing_webhook", provider: "dodo", type: "payment.succeeded", outcome: "duplicate", durationMs: 12.5 })
    ).toEqual({
      indexes: ["billing_webhook"],
      blobs: ["billing_webhook", "dodo", "payment.succeeded", "duplicate"],
      doubles: [1, 12.5],
    });
    expect(
      toDataPoint({
        event: "web_vital",
        route: "/dsa",
        section: "dsa",
        metric: "CLS",
        rating: "poor",
        navigationType: "",
        value: 0.31,
      })
    ).toEqual({ indexes: ["web_vital"], blobs: ["web_vital", "/dsa", "dsa", "CLS", "poor", ""], doubles: [1, 0.31] });
  });

  it("clips long blobs and never writes NaN or a negative duration", () => {
    const p = toDataPoint({ event: "paywall_preview", path: `/${"a".repeat(1000)}`, section: "s", tier: "free", country: null });
    expect(p.blobs[1]).toHaveLength(256);
    expect(toDataPoint({ event: "billing_webhook", provider: "d", type: "t", outcome: "o", durationMs: -5 }).doubles)
      .toEqual([1, 0]);
    expect(
      toDataPoint({ event: "web_vital", route: "/", section: "s", metric: "INP", rating: "good", navigationType: "", value: NaN })
        .doubles
    ).toEqual([1, 0]);
  });
});

describe("writeAnalytics", () => {
  it("is a no-op off Cloudflare and on a Worker without the binding", () => {
    expect(analyticsDataset()).toBeNull();
    expect(() => writeAnalytics({ event: "checkout_start", plan: "m", provider: "d", country: null, outcome: "ok" })).not.toThrow();
    context.env = { APP_ENV: "staging" };
    expect(analyticsDataset()).toBeNull();
  });

  it("writes to the request's ANALYTICS binding when there is one", () => {
    const { points, dataset } = recorder();
    context.env = { ANALYTICS: dataset };
    expect(analyticsDataset()).toBe(dataset);
    writeAnalytics({ event: "checkout_start", plan: "yearly", provider: "dodo", country: "DE", outcome: "ok" });
    expect(points).toEqual([toDataPoint({ event: "checkout_start", plan: "yearly", provider: "dodo", country: "DE", outcome: "ok" })]);
  });

  it("never throws into the request when the binding does", () => {
    const dataset = {
      writeDataPoint: () => {
        throw new Error("boom");
      },
    };
    expect(() =>
      writeAnalytics({ event: "billing_webhook", provider: "d", type: "t", outcome: "o", durationMs: 1 }, dataset)
    ).not.toThrow();
  });
});

describe("paywallPreviewPoint", () => {
  const headers = (h: Record<string, string> = {}) => new Headers(h);

  it("labels the view with the normalised path, its section, the tier and the edge country", () => {
    expect(
      paywallPreviewPoint({ pathname: "/System-Design//Caching/", headers: headers({ "cf-ipcountry": "in" }), tier: null })
    ).toEqual({ event: "paywall_preview", path: "/system-design/caching", section: "system-design", tier: "anonymous", country: "IN" });
    expect(paywallPreviewPoint({ pathname: "/cloud/x", headers: headers(), tier: "free" })).toMatchObject({
      tier: "free",
      country: null,
    });
  });

  it("skips router prefetches and browser speculation, which hit the same path", () => {
    const prefetches: Record<string, string>[] = [
      { "next-router-prefetch": "1", rsc: "1" },
      { "sec-purpose": "prefetch" },
      { purpose: "prefetch" },
    ];
    for (const h of prefetches) {
      expect(paywallPreviewPoint({ pathname: "/cloud/x", headers: headers(h), tier: null })).toBeNull();
    }
    // A client-side navigation is an RSC request without the prefetch header: a view.
    expect(paywallPreviewPoint({ pathname: "/cloud/x", headers: headers({ rsc: "1" }), tier: null })).not.toBeNull();
  });
});

describe("edgeCountry", () => {
  it("keeps ISO codes only", () => {
    expect(edgeCountry(new Headers({ "cf-ipcountry": "us" }))).toBe("US");
    for (const c of ["XX", "T1", "USA", ""]) expect(edgeCountry(new Headers({ "cf-ipcountry": c }))).toBeNull();
    expect(edgeCountry(new Headers())).toBeNull();
  });
});
