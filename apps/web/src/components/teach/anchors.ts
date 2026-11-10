// Anchor ids for requirement rows, so diagram steps and prose can link to "#req-F1".

/** "F1" → "req-F1"; whitespace becomes "-" and anything that is not a word character or "-" is dropped. */
export function requirementAnchor(id: string): string {
  const clean = id
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
  return `req-${clean}`;
}

/** Ids whose anchors collide (e.g. "F1" twice, or "F 1" and "F-1"), in first-seen order. */
export function duplicateAnchors(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const id of ids) {
    const anchor = requirementAnchor(id);
    if (seen.has(anchor) && !dupes.includes(id)) dupes.push(id);
    seen.add(anchor);
  }
  return dupes;
}
