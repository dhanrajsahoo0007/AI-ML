// Public API of the docs feature: the article page view, a server component (.tsx), so server-only tests must not
// import this index. The kind, routes and source modules are still imported by path until they get an entry point
// (FEATURES_WITHOUT_ENTRY in eslint.config.mjs).
export { SectionDocPage } from "./section-doc-page";
