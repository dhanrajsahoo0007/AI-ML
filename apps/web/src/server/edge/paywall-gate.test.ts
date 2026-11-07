import { describe, expect, it } from "vitest";
import { PREVIEW_SEGMENT } from "@/features/paywall/constants";
import {
  EMPTY_PREMIUM_MANIFEST,
  PREVIEW_SUFFIX,
  decidePaywall,
  isPremiumPath,
  premiumIndex,
  premiumManifestSchema,
  pricingRewrite,
} from "./paywall-gate";

const manifest = premiumManifestSchema.parse({
  env: "preview",
  paywall: true,
  routes: ["/system-design/databases/b-trees", "/interviews/rag", "/interviews/rag/vector-search"],
});
const premium = premiumIndex(manifest);
const ARTICLE = "/system-design/databases/b-trees";

describe("premium gate", () => {
  it("uses the same preview segment as the build", () => {
    expect(PREVIEW_SUFFIX).toBe(`/${PREVIEW_SEGMENT}`);
  });

  it("passes free pages and everything while the paywall is off", () => {
    expect(decidePaywall({ pathname: "/system-design/databases", premium, tier: null })).toEqual({ action: "pass" });
    const off = premiumIndex({ ...manifest, paywall: false });
    expect(off.size).toBe(0);
    expect(decidePaywall({ pathname: ARTICLE, premium: off, tier: null })).toEqual({ action: "pass" });
    expect(premiumIndex(EMPTY_PREMIUM_MANIFEST).size).toBe(0);
  });

  it("serves the full page only to tier=pro", () => {
    expect(decidePaywall({ pathname: ARTICLE, premium, tier: "pro" })).toEqual({ action: "entitled" });
  });

  it.each([
    ["no or invalid cookie", null],
    ["free tier", "free"],
  ] as const)("rewrites to the preview for %s", (_label, tier) => {
    expect(decidePaywall({ pathname: ARTICLE, premium, tier })).toEqual({
      action: "preview",
      to: `${ARTICLE}/_preview`,
    });
  });

  it("can't be bypassed with case, encoding, slashes or a trailing slash", () => {
    for (const pathname of [
      "/System-Design/databases/B-Trees",
      "/system-design/databases/b-trees/",
      "//system-design//databases/b-trees",
      "/system-design/databases/%62-trees",
    ]) {
      expect(isPremiumPath(pathname, premium), pathname).toBe(true);
      expect(decidePaywall({ pathname, premium, tier: null })).toEqual({ action: "preview", to: `${ARTICLE}/_preview` });
    }
  });

  it("gates interview categories and subsections with premium answers", () => {
    expect(decidePaywall({ pathname: "/interviews/rag", premium, tier: null })).toMatchObject({ action: "preview" });
    expect(decidePaywall({ pathname: "/interviews/rag/vector-search", premium, tier: "pro" })).toEqual({
      action: "entitled",
    });
    expect(decidePaywall({ pathname: "/interviews/agents", premium, tier: null })).toEqual({ action: "pass" });
  });

  it("lets the public preview through, marked noindex by middleware", () => {
    expect(decidePaywall({ pathname: `${ARTICLE}/_preview`, premium, tier: null })).toEqual({
      action: "preview-direct",
    });
    // A `_preview` of a free page doesn't exist; it isn't special.
    expect(decidePaywall({ pathname: "/system-design/databases/_preview", premium, tier: null })).toEqual({
      action: "pass",
    });
  });

  it("rejects malformed manifests", () => {
    expect(() => premiumManifestSchema.parse({ env: "x", paywall: true, routes: ["no-slash"] })).toThrow();
  });
});

describe("pricing variant", () => {
  it("opens checkout only with the paywall on and the provider configured", () => {
    expect(pricingRewrite("/pricing", { paywall: true, billingConfigured: true })).toBe("/pricing/live");
    expect(pricingRewrite("/pricing/", { paywall: true, billingConfigured: true })).toBe("/pricing/live");
    expect(pricingRewrite("/pricing", { paywall: true, billingConfigured: false })).toBeNull();
    expect(pricingRewrite("/pricing", { paywall: false, billingConfigured: true })).toBeNull();
    expect(pricingRewrite("/legal/terms", { paywall: true, billingConfigured: true })).toBeNull();
  });
});
