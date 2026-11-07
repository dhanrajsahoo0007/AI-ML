// The product analytics event catalogue (plan §10.5, §15). Every event the site sends is listed here with its
// properties, so a typo or a stray property is a type error. Properties are low-cardinality labels and counts:
// never an email, a name, free text typed by a user, or anything from article content.
//
// To add an event: add it here, call `track("name", props)` where it happens, and add it to the PostHog
// dashboards it belongs to.

/** Access tier of the viewer or of the page. */
export type Tier = "anonymous" | "free" | "pro";
export type BillingPlan = "monthly" | "yearly";
/** ISO 4217, e.g. `USD`. */
type Currency = string;
/** ISO 3166-1 alpha-2, e.g. `IN`. From the edge (`cf-ipcountry`), never asked of the user. */
type Country = string;
/** Payment provider key, e.g. `dodo`. */
type Provider = string;

export interface AnalyticsEvents {
  page_view: { path: string; section: string; tier?: Tier };
  paywall_view: { path: string; section: string; tier: Tier };
  sign_in_start: { provider: "google"; from?: string };
  sign_in_success: { provider: "google"; new_user: boolean };
  pricing_view: { currency: Currency; tier?: Tier; country?: Country };
  checkout_start: { plan: BillingPlan; country: Country; currency: Currency; provider: Provider };
  checkout_success: { plan: BillingPlan; country: Country; currency: Currency; provider: Provider };
  checkout_abandoned: { plan: BillingPlan; provider: Provider; step?: string };
  payment_failed: { method: string; country: Country; provider: Provider; reason?: string };
  subscription_cancelled: { plan: BillingPlan; reason: string };
  article_completed: { path: string; section: string; tier?: Tier };
  problem_run: { problem: string; language: string };
  problem_solved: { problem: string; language: string; attempts: number };
  newsletter_subscribe: { source: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

