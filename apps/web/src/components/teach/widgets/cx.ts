// Joins class names, skipping falsy entries. The widgets never pass conflicting Tailwind classes, so they do
// not need tailwind-merge (about 9 kB gzipped) in their chunks.
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
