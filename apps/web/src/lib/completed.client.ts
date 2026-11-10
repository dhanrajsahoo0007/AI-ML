"use client";

import { createContext, useContext, useMemo } from "react";

// The pages the learner has marked complete, as content keys ("system-design/caching/cdn"). components/ cannot
// import a feature, so the progress feature fills this context (features/progress/completed-provider.client.tsx,
// mounted by a section layout) and the sidebar and cards read it here. Without a provider nothing is marked.

export const CompletedContext = createContext<ReadonlySet<string>>(new Set());

/** Whether the page at `href` ("/system-design/caching/cdn") is in `done`. */
export const isCompleted = (done: ReadonlySet<string>, href: string) => done.has(href.slice(1));

export function useCompletedPages(): ReadonlySet<string> {
  return useContext(CompletedContext);
}

/** How many of `hrefs` are marked complete. */
export function useCompletedCount(hrefs: readonly string[]): number {
  const done = useCompletedPages();
  return useMemo(() => hrefs.filter((h) => isCompleted(done, h)).length, [done, hrefs]);
}
