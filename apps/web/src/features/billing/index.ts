// Public API of the billing feature (plan §9.3). Server-only modules; the checkout island is imported by path.
// Loading this index also registers the provider-backed subscription canceller with features/account (register.ts,
// a side-effect module), so account deletion cancels live subscriptions at the provider first. The email queue
// consumer (bundled into the Worker, where `server-only` throws) imports emails/renewal-reminder.ts by path.
import "./register";

export { processBillingEvent } from "./apply";
export { startCheckout, portalCustomer, requestCountry } from "./checkout";
export { CHECKOUT_CONSENTS, CHECKOUT_CONSENT_KEYS } from "./consent";
export type { Plan } from "./events";
export { billingOverview } from "./overview";
export { PLANS, PLAN_IDS, formatMoney } from "./plans";
export { WebhookVerificationError } from "./port";
export { checkoutConfigured, primaryProvider, providerFor } from "./provider";
export { GRACE_PERIOD_DAYS } from "./state-machine";
export { GUARANTEE_DAYS } from "./guarantee";
