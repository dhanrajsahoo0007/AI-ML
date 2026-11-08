// Public API of the sections feature (plan §3): the registry (content/sections.yaml), the kind contract, the kind
// modules and the route-folder helpers. Server-side: route-helpers.ts is server-only and needs `next/navigation`,
// and kinds.ts pulls in lib/question-bank (server-only), so the build-time modules that plain Node loads
// (next.config.ts through Next's SWC require hook, the scripts through scripts/ts-hooks.mjs, the section kinds,
// config/features.ts, paywall/access.ts) keep importing registry.ts, schema.ts and kind.ts by path; see
// FEATURES_WITHOUT_ENTRY in eslint.config.mjs. public.ts is the client-safe entry (the inlined header nav).
export {
  APP_ENVS,
  docGroupSchema,
  frontmatterSchema,
  type AppEnv,
  type NavIndexCategory,
  type ReleaseState,
  type SectionDef,
  type SectionKindName,
} from "./schema";
export type { NavCategory, NavGroup, NavSection } from "./kind";
export {
  allSections,
  builtSectionsOfKind,
  CONTENT_DIR,
  getSection,
  isPathVisible,
  resolveAppEnv,
  sectionOfKind,
  visibleSections,
} from "./registry";
export { directoryRefs, loadSection } from "./kinds";
export { isRouteBuilt, routeMetadata, routeSection } from "./route-helpers";
