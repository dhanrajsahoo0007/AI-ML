// Constants shared by the build (manifest, routes), the edge gate and the pages. No imports, so middleware,
// next.config.ts, the scripts and client islands can all load it.

/**
 * Appended to a premium page's path to get its public preview variant: `/system-design/caching/cdn/_preview`.
 * It sits inside the same route as the full page, so the section layout (sidebar) is shared and stays mounted
 * when middleware rewrites a client navigation to the preview. Hub and article slugs are kebab-case, so the
 * leading underscore can't collide with a real page.
 */
export const PREVIEW_SEGMENT = "_preview";

/** Top-level blocks of a premium article shown in its preview when the frontmatter sets no `preview`. */
export const DEFAULT_PREVIEW_BLOCKS = 3;

/** MDX marker that ends the preview where it stands (wins over the `preview` block count). */
export const PREMIUM_BREAK = "PremiumBreak";

export const previewPathOf = (path: string) => `${path.replace(/\/+$/, "")}/${PREVIEW_SEGMENT}`;
