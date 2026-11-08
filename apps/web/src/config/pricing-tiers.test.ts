import { describe, expect, it } from "vitest";
import {
  LISTED_COUNTRIES,
  PRICE_TIERS,
  TIER_PERCENT,
  formatUsd,
  normalizeCountry,
  parseUsd,
  tierForCountry,
  tierFromSlug,
  tierPriceUsd,
} from "./pricing-tiers";

describe("tierForCountry", () => {
  it.each([
    ["US", "A"],
    ["CA", "A"],
    ["GB", "A"],
    ["DE", "A"],
    ["FR", "A"],
    ["AU", "A"],
    ["SG", "A"],
    ["AE", "A"],
    ["JP", "A"],
    ["PL", "B"],
    ["RO", "B"],
    ["UA", "B"],
    ["MX", "B"],
    ["SA", "B"],
    ["IN", "C"],
    ["ID", "C"],
    ["PH", "C"],
    ["VN", "C"],
    ["PK", "C"],
    ["NG", "C"],
    ["EG", "C"],
    ["BR", "C"],
  ] as const)("%s → %s", (country, tier) => {
    expect(tierForCountry(country)).toBe(tier);
  });

  it("accepts lower case and whitespace", () => {
    expect(tierForCountry(" in ")).toBe("C");
  });

  it("falls back to A for unknown, missing, malformed and Cloudflare's non-country codes", () => {
    for (const value of [null, undefined, "", "ZZ", "XX", "T1", "IND", "1N", "in-IN", "<script>"]) {
      expect(tierForCountry(value), String(value)).toBe("A");
    }
    expect(normalizeCountry("XX")).toBeNull();
    expect(normalizeCountry("T1")).toBeNull();
    expect(normalizeCountry("de")).toBe("DE");
  });

  it("lists every country once, as an upper-case alpha-2 code", () => {
    expect(new Set(LISTED_COUNTRIES).size).toBe(LISTED_COUNTRIES.length);
    for (const c of LISTED_COUNTRIES) expect(c).toMatch(/^[A-Z]{2}$/);
    expect(LISTED_COUNTRIES).toEqual([...LISTED_COUNTRIES].sort());
  });
});

describe("tierPriceUsd", () => {
  it("keeps the base price for tier A, unrounded", () => {
    expect(tierPriceUsd(9, "A")).toBe(9);
    expect(tierPriceUsd(9.99, "A")).toBe(9.99);
  });

  it("applies the tier share and rounds to whole dollars below $100", () => {
    expect(TIER_PERCENT).toEqual({ A: 100, B: 70, C: 45 });
    expect(tierPriceUsd(9, "B")).toBe(6); // 6.30
    expect(tierPriceUsd(9, "C")).toBe(4); // 4.05
    expect(tierPriceUsd(90, "B")).toBe(63);
    expect(tierPriceUsd(90, "C")).toBe(40); // 40.50: ties round down
    expect(tierPriceUsd(19.99, "B")).toBe(14); // 13.993
  });

  it("rounds to multiples of $5 from $100 up", () => {
    expect(tierPriceUsd(199, "B")).toBe(140); // 139.30
    expect(tierPriceUsd(240, "C")).toBe(110); // 108.00
    expect(tierPriceUsd(150, "B")).toBe(105);
  });

  it("never goes below $1 or above the base", () => {
    expect(tierPriceUsd(1, "C")).toBe(1);
    expect(tierPriceUsd(0.99, "C")).toBe(0.99);
    for (const tier of PRICE_TIERS) {
      for (const base of [1, 4.99, 9, 12, 90, 99, 100, 120, 999]) {
        const price = tierPriceUsd(base, tier);
        expect(price).toBeLessThanOrEqual(base);
        expect(price).toBeGreaterThanOrEqual(Math.min(1, base));
      }
    }
  });

  it("orders the tiers A ≥ B ≥ C", () => {
    for (const base of [5, 9, 29, 90, 199]) {
      expect(tierPriceUsd(base, "A")).toBeGreaterThanOrEqual(tierPriceUsd(base, "B"));
      expect(tierPriceUsd(base, "B")).toBeGreaterThanOrEqual(tierPriceUsd(base, "C"));
    }
  });

  it("rejects a missing or non-positive base", () => {
    expect(() => tierPriceUsd(0, "B")).toThrow();
    expect(() => tierPriceUsd(Number.NaN, "B")).toThrow();
  });
});

describe("formatting and parsing", () => {
  it("formats whole amounts without cents", () => {
    expect(formatUsd(9)).toBe("$9");
    expect(formatUsd(9.99)).toBe("$9.99");
    expect(formatUsd(9.5)).toBe("$9.50");
    expect(formatUsd(1200)).toBe("$1,200");
  });

  it("parses configured prices and rejects TODO markers", () => {
    expect(parseUsd("$9")).toBe(9);
    expect(parseUsd("9.99")).toBe(9.99);
    expect(parseUsd("USD 90")).toBe(90);
    expect(parseUsd("[TODO: monthly price]")).toBeNull();
    expect(parseUsd("$0")).toBeNull();
    expect(parseUsd("€9")).toBeNull();
  });

  it("maps URL slugs to tiers B and C only", () => {
    expect(tierFromSlug("b")).toBe("B");
    expect(tierFromSlug("c")).toBe("C");
    expect(tierFromSlug("a")).toBeNull();
    expect(tierFromSlug("live")).toBeNull();
  });
});
