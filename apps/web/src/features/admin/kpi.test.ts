import { describe, expect, it } from "vitest";
import type { LiveSubscriptionRow } from "@/server/db/admin-queries";
import {
  computeChurn,
  computeMrr,
  computePaymentRates,
  currencyExponent,
  dailySeries,
  monthlyMinor,
  noRecentPayments,
  toUsdMinor,
} from "./kpi";

// KPI math for /admin (plan §10.5) with fixtures: MRR normalisation to USD, churn and payment rates.

let n = 0;
function sub(over: Partial<LiveSubscriptionRow>): LiveSubscriptionRow {
  n += 1;
  return {
    id: `sub_${n}`,
    provider: "dodo",
    plan: "pro_monthly",
    status: "active",
    currency: "USD",
    amountMinor: 900,
    country: "US",
    priceTier: "A",
    paymentUsdPerMinor: null,
    fxUsdRate: null,
    ...over,
  };
}

describe("currency handling", () => {
  it("knows minor-unit exponents", () => {
    expect(currencyExponent("USD")).toBe(2);
    expect(currencyExponent("INR")).toBe(2);
    expect(currencyExponent("JPY")).toBe(0);
    expect(currencyExponent("KWD")).toBe(3);
  });

  it("spreads yearly plans over 12 months", () => {
    expect(monthlyMinor({ plan: "pro_monthly", amountMinor: 900 })).toBe(900);
    expect(monthlyMinor({ plan: "pro_yearly", amountMinor: 9000 })).toBe(750);
  });

  it("prefers the provider's settled rate, then fx_rate, else gives up", () => {
    const none = { paymentUsdPerMinor: null, fxUsdRate: null };
    expect(toUsdMinor(900, "USD", none)).toBe(900);
    // ₹2,999.00 at 0.012 USD/INR = $35.99
    expect(toUsdMinor(299900, "INR", { paymentUsdPerMinor: null, fxUsdRate: 0.012 })).toBeCloseTo(3598.8, 6);
    // The settled rate wins over fx_rate.
    expect(toUsdMinor(299900, "INR", { paymentUsdPerMinor: 0.0119, fxUsdRate: 0.012 })).toBeCloseTo(3568.81, 6);
    // ¥1,200 (no minor units) at 0.0067 = $8.04
    expect(toUsdMinor(1200, "JPY", { paymentUsdPerMinor: null, fxUsdRate: 0.0067 })).toBeCloseTo(804, 6);
    expect(toUsdMinor(900, "EUR", none)).toBeNull();
  });
});

describe("computeMrr", () => {
  const rows = [
    sub({ amountMinor: 900 }), // $9.00
    sub({ plan: "pro_yearly", amountMinor: 9000, country: "GB", currency: "GBP", fxUsdRate: 1.25, priceTier: "A" }), // £7.50/mo → $9.375
    sub({ amountMinor: 299900, plan: "pro_yearly", currency: "INR", country: "IN", priceTier: "C", fxUsdRate: 0.012 }), // ₹249.92/mo → $2.999
    sub({ status: "on_hold", amountMinor: 2490, currency: "BRL", country: "BR", priceTier: "B", fxUsdRate: 0.2 }), // at risk: R$24.90 → $4.98
    sub({ currency: "EUR", country: "DE", amountMinor: 900 }), // no rate → unconverted
  ];
  const mrr = computeMrr(rows);

  it("sums active subscriptions in USD and annualises", () => {
    expect(mrr.mrrUsdMinor).toBe(Math.round(900 + 937.5 + 299.9));
    expect(mrr.arrUsdMinor).toBe(Math.round((900 + 937.5 + 299.9) * 12));
    expect(mrr.subscribers).toBe(4); // 3 converted + 1 unconverted active
  });

  it("keeps on_hold out of MRR and reports it as at risk", () => {
    expect(mrr.atRisk).toEqual({ subscribers: 1, mrrUsdMinor: 498 });
  });

  it("lists unconverted currencies instead of guessing", () => {
    expect(mrr.unconverted).toEqual({ subscribers: 1, currencies: ["EUR"] });
  });

  it("splits by country, currency, tier and provider, largest first", () => {
    expect(mrr.by.country.map((b) => b.key)).toEqual(["GB", "US", "IN"]);
    expect(mrr.by.currency.map((b) => b.key)).toEqual(["GBP", "USD", "INR"]);
    // Breakdown amounts are rounded to whole cents; shares use the unrounded amounts.
    expect(mrr.by.priceTier.map(({ share, ...b }) => b)).toEqual([
      { key: "A", subscribers: 2, mrrUsdMinor: 1838 },
      { key: "C", subscribers: 1, mrrUsdMinor: 300 },
    ]);
    expect(mrr.by.priceTier[0]!.share).toBeCloseTo(1837.5 / 2137.4, 10);
    expect(mrr.by.provider).toEqual([{ key: "dodo", subscribers: 3, mrrUsdMinor: 2137, share: 1 }]);
    const shares = mrr.by.country.reduce((s, b) => s + b.share, 0);
    expect(shares).toBeCloseTo(1, 10);
  });

  it("files a missing country or tier under unknown", () => {
    const m = computeMrr([sub({ country: null, priceTier: null })]);
    expect(m.by.country[0]?.key).toBe("unknown");
    expect(m.by.priceTier[0]?.key).toBe("unknown");
  });

  it("is all zeros with no data", () => {
    const m = computeMrr([]);
    expect(m.mrrUsdMinor).toBe(0);
    expect(m.subscribers).toBe(0);
    expect(m.by.country).toEqual([]);
  });
});

describe("computeChurn", () => {
  it("separates voluntary from involuntary churn", () => {
    const c = computeChurn({ created: 10, ended: { cancelled: 3, expired: 1, failed: 2 } }, 100);
    expect(c).toMatchObject({ created: 10, churned: 6, voluntary: 4, involuntary: 2 });
    // At the start: 100 live now + 6 churned − 10 new = 96.
    expect(c.rate).toBeCloseTo(6 / 96, 10);
  });

  it("has no rate when nobody could churn", () => {
    expect(computeChurn({ created: 2, ended: { cancelled: 0, expired: 0, failed: 0 } }, 2).rate).toBeNull();
    expect(computeChurn({ created: 0, ended: { cancelled: 0, expired: 0, failed: 0 } }, 0).rate).toBeNull();
  });
});

describe("computePaymentRates", () => {
  it("computes refund and dispute rates over charged payments", () => {
    const r = computePaymentRates({
      succeeded: 180,
      refunded: 8,
      partially_refunded: 2,
      disputed: 1,
      dispute_won: 0,
      dispute_lost: 1,
      failed: 25,
    });
    expect(r.charged).toBe(192);
    expect(r.failed).toBe(25);
    expect(r.refundRate).toBeCloseTo(10 / 192, 10);
    expect(r.disputeRate).toBeCloseTo(2 / 192, 10);
    expect(r.refundAboveTarget).toBe(true); // 5.2% ≥ 5%
    expect(r.disputeAlert).toBe(true); // 1.04% > 0.75%
  });

  it("stays quiet under the thresholds", () => {
    const r = computePaymentRates({ succeeded: 1000, refunded: 40, disputed: 7 });
    expect(r.refundAboveTarget).toBe(false); // 3.8%
    expect(r.disputeAlert).toBe(false); // 0.67%
  });

  it("alerts just above 0.75% disputes, not at it", () => {
    expect(computePaymentRates({ succeeded: 397, disputed: 3 }).disputeAlert).toBe(false); // exactly 0.75%
    expect(computePaymentRates({ succeeded: 396, disputed: 4 }).disputeAlert).toBe(true); // 1%
  });

  it("has no rates without charged payments", () => {
    const r = computePaymentRates({ failed: 3 });
    expect(r.refundRate).toBeNull();
    expect(r.disputeRate).toBeNull();
    expect(r.refundAboveTarget || r.disputeAlert).toBe(false);
  });
});

describe("noRecentPayments", () => {
  const now = Date.UTC(2026, 10, 7, 12);
  it("fires after 6 hours without a payment while people are paying", () => {
    expect(noRecentPayments(new Date(now - 7 * 3600_000), 5, now)).toBe(true);
    expect(noRecentPayments(new Date(now - 5 * 3600_000), 5, now)).toBe(false);
  });
  it("stays quiet with no subscribers or no payments ever", () => {
    expect(noRecentPayments(new Date(now - 7 * 3600_000), 0, now)).toBe(false);
    expect(noRecentPayments(null, 5, now)).toBe(false);
  });
});

describe("dailySeries", () => {
  it("fills missing days with zero, oldest first, ending today (UTC)", () => {
    const now = Date.UTC(2026, 10, 7, 15);
    const s = dailySeries(
      [
        { day: "2026-11-05", value: 500 },
        { day: "2026-11-07", value: 900 },
      ],
      4,
      now
    );
    expect(s).toEqual([
      { day: "2026-11-04", value: 0 },
      { day: "2026-11-05", value: 500 },
      { day: "2026-11-06", value: 0 },
      { day: "2026-11-07", value: 900 },
    ]);
  });
});
