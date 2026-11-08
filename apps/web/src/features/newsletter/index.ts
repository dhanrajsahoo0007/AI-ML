// Public API of the newsletter feature (plan §15.2): the kind, the API-route wrappers and services, and the archive
// pages' data and SEO. No JSX: the integration test imports the API routes, which import this index. The sign-up
// panel is in public.ts (client-safe), the issue body renderer (server-only JSX) is imported by path, and so are
// the client islands (signup-form, token-action, email-preferences). sections/kinds.ts (plain Node) imports
// kind.ts by path and email/jobs.ts (bundled into the Worker, where `server-only` throws) imports emails.ts by path.
export { CURRENT_CONSENT_VERSION, consentText, isConsentVersion } from "./consent";
export { errorResponse, newsletterRoute, serverToServerRoute } from "./http";
export { NEWSLETTER_KIND, newsletterKind } from "./kind";
export { clientIp } from "./rate-limit";
export { processResendEvent, RESEND_PROVIDER, resendEventSchema } from "./resend-webhook";
export { buildRss } from "./rss";
export { ARCHIVE_DESCRIPTION, ARCHIVE_TITLE, archiveSeo, issueSeo, utilityPageMetadata } from "./seo";
export {
  hasDatabase,
  newsletterDeps,
  newsletterHref,
  newsletterStore,
  NotConfiguredError,
  resendWebhookSecret,
} from "./server";
export {
  accountStatus,
  confirmSubscription,
  subscribe,
  subscribeWithAccount,
  unsubscribeAccount,
  unsubscribeWithToken,
} from "./service";
export { isBuilt, isPublished, loadIssues } from "./source";
export { TURNSTILE_TOKEN_MAX } from "./turnstile";
export { isOneClick } from "./unsubscribe-headers";
