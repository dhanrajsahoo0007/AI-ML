"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { localProgressState, setLocalProgress } from "./local";

// "Mark complete" and "Bookmark" under an article. State is kept in this browser (no database read on page load),
// and for signed-in learners each change is also saved to the account via /api/progress. Signed-out changes are
// merged into the account at the next sign-in (merge-local-progress.client.tsx).
type Kind = "complete" | "bookmark";

export function ProgressActions({ contentKey }: { contentKey: string }) {
  const [state, setState] = useState<{ complete: boolean; bookmark: boolean } | null>(null);
  const [savedToAccount, setSavedToAccount] = useState<boolean | null>(null);

  useEffect(() => setState(localProgressState(contentKey)), [contentKey]);

  const toggle = async (kind: Kind) => {
    if (!state) return;
    const on = !state[kind];
    setState({ ...state, [kind]: on });
    setLocalProgress(contentKey, kind, on);
    try {
      const res = await fetch("/api/progress", {
        method: on ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentKey, kind }),
      });
      setSavedToAccount(res.ok);
    } catch {
      setSavedToAccount(false);
    }
  };

  const button = "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors";
  return (
    <div
      className="mt-12 flex flex-wrap items-center gap-3 border-t border-hairline pt-6"
      data-testid="progress-actions"
    >
      <button
        type="button"
        onClick={() => toggle("complete")}
        aria-pressed={state?.complete ?? false}
        disabled={!state}
        className={cn(
          button,
          state?.complete
            ? "border-primary bg-primary/10 text-primary"
            : "border-hairline text-ink-2 hover:border-ink hover:text-ink"
        )}
      >
        {state?.complete ? <CheckCircle2 aria-hidden className="size-4" /> : <Circle aria-hidden className="size-4" />}
        {state?.complete ? "Completed" : "Mark complete"}
      </button>
      <button
        type="button"
        onClick={() => toggle("bookmark")}
        aria-pressed={state?.bookmark ?? false}
        disabled={!state}
        className={cn(
          button,
          state?.bookmark
            ? "border-primary bg-primary/10 text-primary"
            : "border-hairline text-ink-2 hover:border-ink hover:text-ink"
        )}
      >
        {state?.bookmark ? (
          <BookmarkCheck aria-hidden className="size-4" />
        ) : (
          <Bookmark aria-hidden className="size-4" />
        )}
        {state?.bookmark ? "Bookmarked" : "Bookmark"}
      </button>
      {savedToAccount === false && (
        <span className="text-xs text-muted-foreground">Saved in this browser. Sign in to keep it across devices.</span>
      )}
      {savedToAccount === true && <span className="text-xs text-muted-foreground">Saved to your account.</span>}
    </div>
  );
}
