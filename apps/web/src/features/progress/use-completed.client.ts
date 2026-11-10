"use client";

import { useMemo, useSyncExternalStore } from "react";
import { completedKeys, PROGRESS_EVENT } from "./local";

// The content keys this browser has marked complete, for progress marks outside the article (sidebar ticks, the
// "N read" count on section cards; see completed-provider.client.tsx). It reads localStorage only, like ProgressActions: no request and no database
// read on page load, so content pages stay static. It updates when an article is marked on this page
// (PROGRESS_EVENT) or in another tab (`storage`).

const NONE: ReadonlySet<string> = new Set();
let version = 0;

function subscribe(onChange: () => void) {
  const changed = () => {
    version += 1;
    onChange();
  };
  window.addEventListener(PROGRESS_EVENT, changed);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, changed);
    window.removeEventListener("storage", changed);
  };
}

/** Completed content keys (e.g. "system-design/caching/cdn"); empty on the server and before hydration. */
export function useCompleted(): ReadonlySet<string> {
  const v = useSyncExternalStore(
    subscribe,
    () => version,
    () => -1
  );
  return useMemo(() => (v < 0 ? NONE : new Set(completedKeys())), [v]);
}
