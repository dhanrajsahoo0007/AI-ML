// No imports, so middleware, next.config.ts, the scripts, client islands and components/ can all load it.
// features/paywall/constants.ts re-exports it with the paywall's other constants.

/**
 * Appended to a premium page's path to get its public preview variant: `/system-design/caching/cdn/_preview`.
 * It sits inside the same route as the full page, so the section layout (sidebar) is shared and stays mounted
 * when middleware rewrites a client navigation to the preview. Hub and article slugs are kebab-case, so the
 * leading underscore can't collide with a real page.
 */
export const PREVIEW_SEGMENT = "_preview";
