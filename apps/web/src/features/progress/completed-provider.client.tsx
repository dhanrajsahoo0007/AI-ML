"use client";

import { useCallback, type ReactNode } from "react";
import { CompletedContext, ToggleCompletedContext } from "@/lib/completed.client";
import { clearPendingProgressEntry, setLocalProgress } from "./local";
import { useCompleted } from "./use-completed.client";

/** Gives the pages below it the learner's completed set and a toggle action (sidebar, hub cards, section cards). */
export function CompletedProvider({ children }: { children: ReactNode }) {
  const completed = useCompleted();

  const toggle = useCallback((href: string, on: boolean) => {
    const clean = href.split("#")[0] ?? href;
    const contentKey = clean.startsWith("/") ? clean.slice(1) : clean;
    if (!contentKey) return;
    setLocalProgress(contentKey, "complete", on);
    void fetch("/api/progress", {
      method: on ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentKey, kind: "complete" }),
    })
      .then((res) => {
        if (res.ok) clearPendingProgressEntry(contentKey, "complete");
      })
      .catch(() => {});
  }, []);

  return (
    <CompletedContext.Provider value={completed}>
      <ToggleCompletedContext.Provider value={toggle}>{children}</ToggleCompletedContext.Provider>
    </CompletedContext.Provider>
  );
}
