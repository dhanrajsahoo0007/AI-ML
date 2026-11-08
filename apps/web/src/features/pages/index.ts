// Public API of the pages feature: the simple site pages (legal, contact, security, pricing copy). SitePage is a
// server component (.tsx), so server-only tests must not import this index; the client islands (billing-period,
// region-switcher) are imported by path.
export { loadPageDoc, pageMetadata } from "./page-doc";
export { SitePage } from "./site-page";
