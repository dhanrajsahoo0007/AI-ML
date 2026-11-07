import type { SearchEntry } from "./search";

// Page titles by URL, for server pages that list content keys (account progress). The search index is inlined at
// build by next.config.ts (SEARCH_INDEX), so this never reads the filesystem at request time.
let byHref: Map<string, SearchEntry> | null = null;

export function pageInfo(href: string): SearchEntry | undefined {
  byHref ??= new Map((JSON.parse(process.env.SEARCH_INDEX || "[]") as SearchEntry[]).map((e) => [e.h, e]));
  return byHref.get(href);
}
