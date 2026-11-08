// Public API of the seo feature (plan §6 P11): page SEO for the docs routes and the home and listing pages, the
// JSON-LD script and the Open Graph image. JsonLd and ogImage are .tsx, so server-only tests must not import this
// index: the modules that those tests reach (newsletter/seo.ts, newsletter/rss.ts, newsletter/email-issue.ts, the
// CSP report route) use public.ts, and newsletter/seo.ts imports pages.ts by path for listingPageSeo().
export { docPageSeo, docsSectionSeo, type PageSeo } from "./docs";
export { JsonLd } from "./json-ld-script";
export { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "./og-image";
export { homeSeo, listingPageSeo } from "./pages";
