// Constants shared by the build (manifest, routes), the edge gate and the pages. The only import is the
// import-free lib/preview-segment.ts, so middleware, next.config.ts, the scripts and client islands can all load it.

/** The preview variant's path segment; defined in lib/ so components/ and lib/ can use it too. */
export { PREVIEW_SEGMENT } from "../../lib/preview-segment";

/** Top-level blocks of a premium article shown in its preview when the frontmatter sets no `preview`. */
export const DEFAULT_PREVIEW_BLOCKS = 3;

/** MDX marker that ends the preview where it stands (wins over the `preview` block count). */
export const PREMIUM_BREAK = "PremiumBreak";
