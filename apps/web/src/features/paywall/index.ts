// Public API of the paywall feature (plan §9.1, §9.2): the access model, the preview constants and the MDX split.
// Build-time modules with no server-only code and no JSX, so next.config.ts, the scripts and the docs reader
// (features/docs/source.ts) can load this index with plain Node. The paywall component is in public.ts.
export { isPremiumDoc, premiumAnswerCategories } from "./access";
export { PREVIEW_SEGMENT } from "./constants";
export { fixtureDocsFor } from "./fixtures";
export { remarkPremium, type PremiumSplit } from "./remark-premium";
