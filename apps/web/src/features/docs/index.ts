// Public API of the docs feature: the `docs` kind, the helpers of the shared app/(content)/[section] routes and the
// content reader. No JSX here: sections/kinds.ts, newsletter/kind.ts and seo/docs.ts import this index, and they are
// loaded by plain Node (the scripts, node:test) and by server-only Vitest tests, neither of which parses .tsx. The
// article page view is therefore imported by path (`@/features/docs/section-doc-page`), and the build-time modules
// that next.config.ts loads (paywall/access.ts, sections/kinds.ts) still import kind.ts and source.ts by path,
// because routes.ts is server-only (FEATURES_WITHOUT_ENTRY in eslint.config.mjs).
export { docsKind } from "./kind";
export {
  docSlugParams,
  docsItems,
  docsSection,
  docsSectionParams,
  docVariant,
  sectionRobots,
  type DocParams,
  type SectionParams,
} from "./routes";
export { articlesOf, hubsOf, loadDocItems, type DocItem } from "./source";
export { sectionGroups } from "./groups";
