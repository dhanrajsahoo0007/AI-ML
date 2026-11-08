// Regional (purchasing-power) price tiers, plan §9.5. One source of truth for the pricing page (which estimate a
// visitor sees), middleware (which prerendered variant /pricing serves) and billing (the tier recorded for
// reporting). Pure and edge-safe: no Node APIs, no env, no I/O; middleware imports it.
//
// The merchant of record (Dodo Payments) charges by the billing country of the payment method and applies its own
// country price, so everything here is a displayed *estimate*. A VPN or the region switcher only changes what the
// pricing page shows, never what anyone is charged.
//
// To move a country to another tier: move its ISO 3166-1 alpha-2 code between the lists below (keep them sorted),
// update the matching country price in the Dodo dashboard (owner), and run the unit tests. A country in no list is
// tier A.

export const PRICE_TIERS = ["A", "B", "C"] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

/** Share of the base (tier A, USD) price per tier, in whole percent, so the arithmetic stays exact. */
export const TIER_PERCENT: Readonly<Record<PriceTier, number>> = { A: 100, B: 70, C: 45 };

/** ~70%: Eastern Europe, upper-middle-income Latin America, the Gulf except the UAE, upper-middle Asia. */
const TIER_B_COUNTRIES = [
  "AL",
  "AM",
  "AR",
  "AZ",
  "BA",
  "BG",
  "BH",
  "CL",
  "CN",
  "CO",
  "CR",
  "CZ",
  "DO",
  "EC",
  "EE",
  "GE",
  "HR",
  "HU",
  "KW",
  "KZ",
  "LT",
  "LV",
  "MD",
  "ME",
  "MK",
  "MX",
  "MY",
  "OM",
  "PA",
  "PE",
  "PL",
  "QA",
  "RO",
  "RS",
  "SA",
  "SI",
  "SK",
  "TH",
  "TR",
  "UA",
  "UY",
  "ZA",
] as const;

/** ~40–50%: South and South-East Asia, most of Africa, Egypt, Brazil. */
const TIER_C_COUNTRIES = [
  "BD",
  "BR",
  "DZ",
  "EG",
  "ET",
  "GH",
  "ID",
  "IN",
  "KE",
  "KH",
  "LK",
  "MA",
  "MM",
  "NG",
  "NP",
  "PH",
  "PK",
  "TN",
  "TZ",
  "UG",
  "VN",
] as const;

/**
 * 100%, listed only so the region switcher can offer them by name (every unlisted country is tier A anyway): North
 * America, the UK, Western and Southern Europe, Australia and New Zealand, Singapore, the UAE, Japan, and so on.
 */
const TIER_A_COUNTRIES = [
  "AE",
  "AT",
  "AU",
  "BE",
  "CA",
  "CH",
  "CY",
  "DE",
  "DK",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HK",
  "IE",
  "IL",
  "IS",
  "IT",
  "JP",
  "KR",
  "LU",
  "MT",
  "NL",
  "NO",
  "NZ",
  "PT",
  "SE",
  "SG",
  "TW",
  "US",
] as const;

const TIER_OF = new Map<string, PriceTier>([
  ...TIER_B_COUNTRIES.map((c) => [c, "B"] as const),
  ...TIER_C_COUNTRIES.map((c) => [c, "C"] as const),
]);

/** Every country the region switcher lists, A, B and C together, by code. */
export const LISTED_COUNTRIES: readonly string[] = [
  ...TIER_A_COUNTRIES,
  ...TIER_B_COUNTRIES,
  ...TIER_C_COUNTRIES,
].sort();

const COUNTRY_CODE = /^[A-Z]{2}$/;

/** An ISO 3166-1 alpha-2 code in upper case, or null for anything else (Cloudflare's `XX` and `T1` included). */
export function normalizeCountry(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase();
  if (!code || !COUNTRY_CODE.test(code) || code === "XX" || code === "T1") return null;
  return code;
}

/** The tier for a country code; unknown, missing or malformed codes are tier A (never a discount by accident). */
export function tierForCountry(country: string | null | undefined): PriceTier {
  const code = normalizeCountry(country);
  return (code && TIER_OF.get(code)) || "A";
}

/**
 * The displayed price for a tier, from the base (tier A) USD price. Tier A is the base, unrounded. B and C round to a
 * price point: whole dollars below $100, multiples of $5 from $100 up; ties round down (in the buyer's favour), and
 * the result is never below $1 or above the base.
 */
export function tierPriceUsd(baseUsd: number, tier: PriceTier): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0) throw new Error(`tierPriceUsd: invalid base price ${baseUsd}`);
  if (tier === "A") return baseUsd;
  // Exact in cents: base × percent is an integer number of hundredths of a cent at most.
  const raw = (Math.round(baseUsd * 100) * TIER_PERCENT[tier]) / 10_000;
  const step = raw >= 100 ? 5 : 1;
  const rounded = Math.ceil(raw / step - 0.5 - 1e-9) * step;
  return Math.min(baseUsd, Math.max(1, rounded));
}

/** "$9", "$9.99", "$1,200": whole amounts without cents. */
export function formatUsd(amount: number): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/** A configured price such as "$9", "9" or "USD 9.00" → 9; anything else (a TODO marker included) → null. */
export function parseUsd(value: string): number | null {
  const m = /^\s*(?:USD\s*)?\$?\s*(\d{1,6}(?:\.\d{1,2})?)\s*$/i.exec(value);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 ? n : null;
}

/** The pricing page's URL segment for tiers B and C (`/pricing/b`, `/pricing/live/c`); tier A has none. */
export const TIER_SLUGS = { B: "b", C: "c" } as const satisfies Partial<Record<PriceTier, string>>;

export function tierFromSlug(slug: string): Exclude<PriceTier, "A"> | null {
  return slug === TIER_SLUGS.B ? "B" : slug === TIER_SLUGS.C ? "C" : null;
}

/**
 * The region override cookie set by the pricing page's switcher: an ISO country code, read by middleware before
 * the visitor's IP country. Not a secret and not trusted for anything but the displayed estimate.
 */
export const REGION_COOKIE = "oa_region";
