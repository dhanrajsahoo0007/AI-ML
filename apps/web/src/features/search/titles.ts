import type { SearchEntry } from "./search";

// Page titles by URL, for server pages that list content keys (account progress), and the list of pages that exist
// in this build (progress keys are checked against it). The search index is inlined at build by next.config.ts
// (SEARCH_INDEX), so this never reads the filesystem at request time. It is empty in `next dev` and unit tests.
let cache: { from: string | undefined; byHref: Map<string, SearchEntry> } | null = null;

function index(): Map<string, SearchEntry> {
  const from = process.env.SEARCH_INDEX;
  if (!cache || cache.from !== from) {
    cache = { from, byHref: new Map((JSON.parse(from || "[]") as SearchEntry[]).map((e) => [e.h, e])) };
  }
  return cache.byHref;
}

export function pageInfo(href: string): SearchEntry | undefined {
  return index().get(href);
}

/** Whether this build carries the page list (every `next build` does; `next dev` and unit tests don't). */
export function hasPageIndex(): boolean {
  return index().size > 0;
}
