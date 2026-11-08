// Client-safe exports of the seo feature (no server-only code, no JSX): the site constants, the metadata and
// JSON-LD builders and the CSP report parser. Relative imports only inside, so the other features' build-time
// modules (dsa/seo.ts, newsletter/rss.ts, newsletter/email-issue.ts, newsletter/seo.ts) and their server-only
// tests can load it with plain Node.
export { CSP_REPORT_MAX_BYTES, parseCspReports } from "./csp-report";
export { articleNode, breadcrumbNode, collectionPageNode, jsonLdGraph, type Crumb } from "./json-ld";
export { pageMetadata, withParentImages } from "./metadata";
export { absoluteUrl, PAYWALL_CONTAINER_CLASS, SITE_NAME } from "./site";
