// The pre-checkout consent texts (plan §9.7, legal-drafts/02-refunds.md). Shown on /checkout, required for
// every purchase (simpler and safer than detecting EU/UK buyers, whose withdrawal waiver is mandatory), and
// logged in consent_log with their text version on every checkout start. Change the wording → bump the version.

export const CHECKOUT_CONSENTS = {
  terms: {
    kind: "terms",
    version: "checkout-terms-2026-11",
    text: "I agree to the Terms of Service and the Privacy Policy.",
  },
  immediateAccess: {
    kind: "eu_withdrawal_waiver",
    version: "withdrawal-waiver-2026-11",
    text: "I want my Pro access to start immediately, and I understand that I therefore lose my right to withdraw from the purchase (the 14-day withdrawal right for EU, EEA and UK buyers).",
  },
  finalSale: {
    kind: "terms",
    version: "final-sale-2026-11",
    text: "I understand that all sales are final: payments are non-refundable, except for billing errors, failure to deliver and where the law requires a refund.",
  },
} as const;

type CheckoutConsentKey = keyof typeof CHECKOUT_CONSENTS;
export const CHECKOUT_CONSENT_KEYS = Object.keys(CHECKOUT_CONSENTS) as CheckoutConsentKey[];
