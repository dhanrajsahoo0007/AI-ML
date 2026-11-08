import { describe, expect, it } from "vitest";
import { REGION_COOKIE } from "@/config/pricing-tiers";
import { COUNTRY_HEADER, decidePricing } from "./pricing-variant";

const soon = { paywall: false, billingConfigured: false };
const live = { paywall: true, billingConfigured: true };

describe("pricing variant (live × tier)", () => {
  it("names the cookie and header middleware reads", () => {
    expect(REGION_COOKIE).toBe("oa_region");
    expect(COUNTRY_HEADER).toBe("cf-ipcountry");
  });

  it.each([
    ["US", "A", null, "/pricing/live"],
    ["DE", "A", null, "/pricing/live"],
    ["PL", "B", "/pricing/b", "/pricing/live/b"],
    ["IN", "C", "/pricing/c", "/pricing/live/c"],
    ["BR", "C", "/pricing/c", "/pricing/live/c"],
  ] as const)("country %s → tier %s", (country, tier, soonTo, liveTo) => {
    expect(decidePricing({ pathname: "/pricing", ...soon, country })).toMatchObject({ tier, rewrite: soonTo });
    expect(decidePricing({ pathname: "/pricing", ...live, country })).toMatchObject({ tier, rewrite: liveTo });
  });

  it("serves tier A at /pricing when the country is missing or unknown", () => {
    for (const country of [null, undefined, "", "XX", "T1", "not-a-country"]) {
      expect(decidePricing({ pathname: "/pricing", ...soon, country })).toMatchObject({ tier: "A", rewrite: null });
    }
  });

  it("goes live only with the paywall on and the provider configured", () => {
    const rewrite = (o: { paywall: boolean; billingConfigured: boolean }) =>
      decidePricing({ pathname: "/pricing", ...o, country: "IN" })?.rewrite;
    expect(rewrite({ paywall: true, billingConfigured: false })).toBe("/pricing/c");
    expect(rewrite({ paywall: false, billingConfigured: true })).toBe("/pricing/c");
    expect(rewrite(live)).toBe("/pricing/live/c");
  });

  it("lets the region cookie override the IP country, both ways", () => {
    expect(decidePricing({ pathname: "/pricing", ...soon, country: "US", regionCookie: "IN" })).toMatchObject({
      tier: "C",
      rewrite: "/pricing/c",
    });
    expect(decidePricing({ pathname: "/pricing", ...live, country: "IN", regionCookie: "us" })).toMatchObject({
      tier: "A",
      rewrite: "/pricing/live",
    });
    // "Other country" in the switcher stores ZZ: tier A, whatever the IP says.
    expect(decidePricing({ pathname: "/pricing", ...soon, country: "IN", regionCookie: "ZZ" })).toMatchObject({
      tier: "A",
    });
  });

  it("ignores a malformed cookie and falls back to the IP country", () => {
    for (const regionCookie of ["", "C", "IND", "<b>", "XX", "%49%4E"]) {
      expect(decidePricing({ pathname: "/pricing", ...soon, country: "IN", regionCookie }), regionCookie).toMatchObject({
        tier: "C",
      });
    }
  });

  it("keeps /pricing out of shared caches: private, revalidated, varied on cookie and country", () => {
    for (const country of ["US", "IN"]) {
      expect(decidePricing({ pathname: "/pricing", ...soon, country })?.headers).toEqual({
        "Cache-Control": "private, no-cache",
        Vary: "Cookie, CF-IPCountry",
      });
    }
  });

  it("matches /pricing however it is spelled", () => {
    for (const pathname of ["/pricing/", "/Pricing", "//pricing", "/%70ricing"]) {
      expect(decidePricing({ pathname, ...soon, country: "IN" }), pathname).toMatchObject({ rewrite: "/pricing/c" });
    }
  });

  it("passes variant URLs requested directly, noindex", () => {
    for (const pathname of ["/pricing/live", "/pricing/b", "/pricing/c", "/pricing/live/b", "/pricing/live/c/"]) {
      expect(decidePricing({ pathname, ...live, country: "IN" }), pathname).toEqual({
        tier: null,
        rewrite: null,
        headers: { "X-Robots-Tag": "noindex, nofollow, noai, noimageai" },
      });
    }
  });

  it("leaves every other path alone", () => {
    for (const pathname of ["/", "/pricing/a", "/pricing/live/a", "/pricing-faq", "/legal/terms", "/system-design"]) {
      expect(decidePricing({ pathname, ...live, country: "IN" }), pathname).toBeNull();
    }
  });
});
