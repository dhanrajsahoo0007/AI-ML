// The pre-checkout consent texts (plan §9.7; refund policy 2026-11-07: 7-day money-back guarantee). Shown on
// /checkout, required for every purchase (simpler and safer than detecting EU/UK buyers, whose withdrawal waiver
// is mandatory; the guarantee applies on top of it), and logged in consent_log with their text version on every
// checkout start. Change the wording → bump the version.

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
  moneyBackGuarantee: {
    kind: "terms",
    version: "money-back-2026-11",
    text: "I understand the refund policy: a 7-day money-back guarantee on my first payment (and on a yearly renewal, within 7 days of the renewal charge), once per customer. Monthly renewals after the first month aren't refundable; I can cancel any time.",
  },
} as const;

type CheckoutConsentKey = keyof typeof CHECKOUT_CONSENTS;
export const CHECKOUT_CONSENT_KEYS = Object.keys(CHECKOUT_CONSENTS) as CheckoutConsentKey[];
