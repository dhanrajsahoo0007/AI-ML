// Swaps the legal drafts' `{{KEY}}` placeholders for values from config/business.ts. Pure, so it is
// unit-tested and can also check that no placeholder survives into the built HTML.

const PLACEHOLDER = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;

/** Escapes characters MDX would read as JSX or expressions, so a config value always renders as text. */
function escapeMdx(value: string) {
  return value.replace(/[{}<>]/g, (c) => `\\${c}`);
}

/**
 * Replaces every `{{KEY}}` in `source` with `values[KEY]`. Throws on a key with no value, so a typo in a
 * page fails the build instead of shipping a raw placeholder.
 */
export function resolvePlaceholders(
  source: string,
  values: Readonly<Record<string, string>>,
  { escape = true }: { escape?: boolean } = {}
): string {
  return source.replace(PLACEHOLDER, (_, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`Unknown placeholder {{${key}}}`);
    return escape ? escapeMdx(value) : value;
  });
}

/** Placeholder keys used in `source`, in order of first use. */
export function placeholderKeys(source: string): string[] {
  return [...new Set([...source.matchAll(PLACEHOLDER)].map((m) => m[1]))];
}
