// Headline search (owner request, 2026-11-08): matches the query against page titles, then section names and
// short descriptions. The index is built at build time by scripts/gen-runtime-data.ts and holds titles only.

export interface SearchEntry {
  /** Title */
  t: string;
  /** Short description */
  d?: string;
  /** URL path */
  h: string;
  /** Section label */
  s: string;
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();

/** Ranks entries for a query: every word must match somewhere; title matches (and title prefixes) rank first. */
export function searchEntries(index: readonly SearchEntry[], query: string, limit = 20): SearchEntry[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of index) {
    const title = normalize(entry.t);
    const rest = normalize(`${entry.s} ${entry.d ?? ""}`);
    let score = 0;
    let ok = true;
    for (const w of words) {
      if (title.startsWith(w)) score += 6;
      else if (title.includes(` ${w}`)) score += 4;
      else if (title.includes(w)) score += 3;
      else if (rest.includes(w)) score += 1;
      else {
        ok = false;
        break;
      }
    }
    if (ok) scored.push({ entry, score: score - title.length / 200 });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}
