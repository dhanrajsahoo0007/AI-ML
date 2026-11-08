import { describe, expect, it } from "vitest";
import { GUARANTEE_DAYS, isGuaranteeEligible, type PaymentRecord } from "./guarantee";

const now = new Date("2026-11-20T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(now.getTime() - days * DAY);
const pay = (days: number, over: Partial<PaymentRecord> = {}): PaymentRecord => ({
  status: "succeeded",
  createdAt: ago(days),
  plan: "pro_monthly",
  ...over,
});

describe("isGuaranteeEligible (7-day money-back guarantee)", () => {
  it("first payment, monthly or yearly, within 7 days", () => {
    expect(isGuaranteeEligible([pay(2)], now)).toEqual({
      eligible: true,
      kind: "first_payment",
      until: ago(2 - GUARANTEE_DAYS),
    });
    expect(isGuaranteeEligible([pay(6.9, { plan: "pro_yearly" })], now)).toMatchObject({
      eligible: true,
      kind: "first_payment",
    });
  });

  it("not after the 7 days", () => {
    expect(isGuaranteeEligible([pay(7)], now)).toEqual({ eligible: false, reason: "window_passed" });
    expect(isGuaranteeEligible([pay(30)], now)).toEqual({ eligible: false, reason: "window_passed" });
  });

  it("a yearly renewal within 7 days of the charge", () => {
    const payments = [pay(370, { plan: "pro_yearly" }), pay(3, { plan: "pro_yearly" })];
    expect(isGuaranteeEligible(payments, now)).toMatchObject({ eligible: true, kind: "yearly_renewal" });
    expect(isGuaranteeEligible([pay(370, { plan: "pro_yearly" }), pay(8, { plan: "pro_yearly" })], now)).toMatchObject({
      eligible: false,
      reason: "window_passed",
    });
  });

  it("never a monthly renewal", () => {
    expect(isGuaranteeEligible([pay(33), pay(2)], now)).toEqual({ eligible: false, reason: "monthly_renewal" });
    // Monthly → yearly upgrade: the yearly charge is a renewal of a yearly plan, so it qualifies.
    expect(isGuaranteeEligible([pay(33), pay(2, { plan: "pro_yearly" })], now)).toMatchObject({
      eligible: true,
      kind: "yearly_renewal",
    });
  });

  it("once per customer: any earlier refund closes it", () => {
    expect(isGuaranteeEligible([pay(40, { status: "refunded" }), pay(1)], now)).toEqual({
      eligible: false,
      reason: "already_refunded",
    });
    expect(isGuaranteeEligible([pay(1, { status: "partially_refunded" })], now)).toEqual({
      eligible: false,
      reason: "already_refunded",
    });
  });

  it("no payment, failed payments only, or a disputed latest payment", () => {
    expect(isGuaranteeEligible([], now)).toEqual({ eligible: false, reason: "no_payment" });
    expect(isGuaranteeEligible([pay(1, { status: "failed" })], now)).toEqual({ eligible: false, reason: "no_payment" });
    expect(isGuaranteeEligible([pay(1, { status: "disputed" })], now)).toEqual({ eligible: false, reason: "disputed" });
    // Failed retries don't count as charges: the first successful one is still the first payment.
    expect(isGuaranteeEligible([pay(3, { status: "failed" }), pay(1)], now)).toMatchObject({
      eligible: true,
      kind: "first_payment",
    });
  });
});
