// Every business value the legal pages, pricing page, contact page and footer show. The legal drafts use
// `{{KEY}}` placeholders; content/pages/**/*.mdx keeps them, and the page loader swaps them for the values
// below at build time. Fill each TODO here once and every page picks it up.
//
// Values still marked TODO (search for "TODO" in this file) must be filled before the site takes payments.

/** Marks a value that is not decided yet. It renders visibly so an unfilled value can't go unnoticed. */
const todo = (label: string) => `[TODO: ${label}]`;

/** Reserved `.example` domain (RFC 2606) until the real one is bought, so no email or link reaches a stranger. */
const DOMAIN = "todo-domain.example";

export const business = {
  BRAND: "TokensToScale",
  DOMAIN,
  SELLER_LEGAL_NAME: todo("seller legal name"),
  SELLER_ADDRESS: todo("seller business address"),
  SELLER_CITY_STATE: todo("city, state"),
  PRICE_MONTHLY_USD: todo("monthly price"),
  PRICE_YEARLY_USD: todo("yearly price"),
  EFFECTIVE_DATE: todo("effective date"),
  NEON_REGION: todo("Neon region"),
  SENTRY_REGION: todo("Sentry region"),
  POSTHOG_REGION: todo("PostHog region"),
  /** public/.well-known/security.txt is a static file: change its Expires line together with this value. */
  SECURITY_TXT_EXPIRES_ISO8601: "2027-11-01T00:00:00Z",

  FOUNDER_NAME: "Dhanraj Sahoo",
  FOUNDER_EMAIL: "dhanrajsahoo.work@gmail.com",
  /** Merchant of record that conducts the order process. */
  MERCHANT_OF_RECORD: "Dodo Payments",

  SUPPORT_EMAIL: `support@${DOMAIN}`,
  BILLING_EMAIL: `billing@${DOMAIN}`,
  PRIVACY_EMAIL: `privacy@${DOMAIN}`,
  SECURITY_EMAIL: `security@${DOMAIN}`,
  HELLO_EMAIL: `hello@${DOMAIN}`,
} as const;

/** Absolute origin for robots.txt and the sitemap. NEXT_PUBLIC_SITE_URL overrides it (staging, previews). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? `https://${DOMAIN}`).replace(/\/$/, "");

export type BusinessKey = keyof typeof business;

/** Keys whose value is still a TODO marker. */
export function todoBusinessKeys(): BusinessKey[] {
  return (Object.keys(business) as BusinessKey[]).filter((k) => business[k].includes("TODO"));
}

/** Sentence shown on pricing, the refund page and the footer, word for word as in the legal drafts. */
export const MOR_NOTICE = `Our order process is conducted by our online reseller ${business.MERCHANT_OF_RECORD}, which is the Merchant of Record for all orders.`;
