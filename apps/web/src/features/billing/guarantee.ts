import type { Plan } from "./events";
import type { PaymentStatus } from "./state-machine";

// The 7-day money-back guarantee (refund policy, owner decision 2026-11-07). Pure, so it is unit-tested:
//
// - the customer's first payment (monthly or yearly) is refundable for 7 days, no questions asked
// - a yearly renewal is refundable for 7 days after the renewal charge (the reminder goes out at T-7 days)
// - monthly renewals after the first month aren't refundable
// - once per customer: any earlier refund counts as the guarantee used. Refunds are issued in the Dodo dashboard,
//   which doesn't tell us why, so a billing-error refund also closes it; those cases go through support anyway
//   (billing errors, failure to deliver and mandatory law are always refunded, on request)
//
// The account page only offers the request; the owner decides it (it can be declined for Terms breaches such as
// account sharing, copying or scraping) and issues it at the merchant of record.

export const GUARANTEE_DAYS = 7;
const DAY = 86_400_000;

export interface PaymentRecord {
  status: PaymentStatus;
  createdAt: Date;
  /** The plan of the subscription the payment belongs to, if known. */
  plan: Plan | null;
}

export type GuaranteeResult =
  | { eligible: true; kind: "first_payment" | "yearly_renewal"; until: Date }
  | { eligible: false; reason: "no_payment" | "already_refunded" | "window_passed" | "monthly_renewal" | "disputed" };

const REFUNDED: ReadonlySet<PaymentStatus> = new Set(["refunded", "partially_refunded"]);
const DISPUTED: ReadonlySet<PaymentStatus> = new Set(["disputed", "dispute_lost"]);

export function isGuaranteeEligible(payments: readonly PaymentRecord[], now: Date = new Date()): GuaranteeResult {
  if (payments.some((p) => REFUNDED.has(p.status))) return { eligible: false, reason: "already_refunded" };
  const charged = payments
    .filter((p) => p.status === "succeeded" || p.status === "dispute_won" || DISPUTED.has(p.status))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const latest = charged.at(-1);
  if (!latest) return { eligible: false, reason: "no_payment" };
  if (DISPUTED.has(latest.status)) return { eligible: false, reason: "disputed" };
  const until = new Date(latest.createdAt.getTime() + GUARANTEE_DAYS * DAY);
  if (now >= until) return { eligible: false, reason: "window_passed" };
  if (latest === charged[0]) return { eligible: true, kind: "first_payment", until };
  if (latest.plan === "pro_yearly") return { eligible: true, kind: "yearly_renewal", until };
  return { eligible: false, reason: "monthly_renewal" };
}
