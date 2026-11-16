"use client";

import { createContext, useContext, useMemo } from "react";
import {
  computeProgressStats,
  groupHrefs,
  groupLeafItems,
  isCompleted,
  sectionHrefs,
  sectionLeafItems,
  type ProgressNavItem,
  type ProgressStats,
} from "./progress-stats";

// The pages the learner has marked complete, as content keys ("system-design/caching/cdn"). components/ cannot
// import a feature, so the progress feature fills this context (features/progress/completed-provider.client.tsx,
// mounted by a section layout) and the sidebar and cards read it here. Without a provider nothing is marked.

export {
  computeProgressStats,
  groupHrefs,
  groupLeafItems,
  isCompleted,
  sectionHrefs,
  sectionLeafItems,
  type ProgressNavItem,
};

export const CompletedContext = createContext<ReadonlySet<string>>(new Set());

export function useCompletedPages(): ReadonlySet<string> {
  return useContext(CompletedContext);
}

/** How many of `hrefs` are marked complete. */
export function useCompletedCount(hrefs: readonly string[]): number {
  const done = useCompletedPages();
  return useMemo(() => hrefs.filter((h) => isCompleted(done, h)).length, [done, hrefs]);
}

/** Full progress stats (completed count, total, clamped percentage, next uncompleted href) for `hrefs`. */
export function useProgressStats(hrefs: readonly string[]): ProgressStats {
  const done = useCompletedPages();
  return useMemo(() => computeProgressStats(done, hrefs), [done, hrefs]);
}
