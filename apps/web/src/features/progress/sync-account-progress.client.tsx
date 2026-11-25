"use client";

import { useEffect } from "react";
import { clearAllLocalProgress, hydrateLocalProgress } from "./local";

export { clearAllLocalProgress };

/**
 * Mounted on /account and /account/progress (which already read the database on the server): copies the
 * account's completed and bookmarked keys into this browser's synced cache so sidebars, cards and section
 * percentages reflect cross-device progress without making API calls on content pages.
 */
export function SyncAccountProgress({
  completed,
  bookmarks,
}: {
  completed: readonly string[];
  bookmarks: readonly string[];
}) {
  useEffect(() => {
    hydrateLocalProgress(completed, bookmarks);
  }, [completed, bookmarks]);

  return null;
}
