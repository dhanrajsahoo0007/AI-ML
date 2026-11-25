"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, Circle } from "lucide-react";
import { useProgressStats } from "@/lib/completed.client";
import { cn } from "@/lib/utils";
import { clearPendingProgressEntry, localProgressState, PROGRESS_EVENT, setLocalProgress } from "./local";

// "Mark complete" and "Bookmark" under an article, paired with live per-tab (per-section) X% progress and
// sequential Previous / Next topic links. State is kept in this browser (no database read on page load), and
// for signed-in learners each change is also saved to the account via /api/progress. Signed-out changes are
// merged into the account at the next sign-in (merge-local-progress.client.tsx).
type Kind = "complete" | "bookmark";

interface AdjacentArticle {
  title: string;
  href: string;
}

interface ProgressActionsProps {
  contentKey: string;
  /** Label of the current section tab (e.g. "GenAI & LLM Foundations"). */
  sectionLabel?: string;
  /** Href of the current section tab (e.g. "/ai-system-design"). */
  sectionHref?: string;
  /** Ordered completable page hrefs in this section tab, for computing X% progress. */
  sectionHrefs?: readonly string[];
  /** Previous article in the section's reading order. */
  prev?: AdjacentArticle;
  /** Next article in the section's reading order. */
  next?: AdjacentArticle;
}

const EMPTY_HREFS: readonly string[] = [];

async function syncToggle(contentKey: string, kind: Kind, on: boolean): Promise<boolean> {
  setLocalProgress(contentKey, kind, on);
  try {
    const res = await fetch("/api/progress", {
      method: on ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentKey, kind }),
    });
    if (res.ok) clearPendingProgressEntry(contentKey, kind);
    return res.ok;
  } catch {
    return false;
  }
}

/** Interactive "Mark complete" / "Completed" toggle + per-tab X% badge shown in the article header. */
export function ArticleCompletedBadge({
  contentKey,
  sectionLabel,
  sectionHrefs = EMPTY_HREFS,
}: {
  contentKey: string;
  sectionLabel?: string;
  sectionHrefs?: readonly string[];
}) {
  const [complete, setComplete] = useState(false);
  const stats = useProgressStats(sectionHrefs);

  useEffect(() => {
    const sync = () => setComplete(localProgressState(contentKey).complete);
    sync();
    window.addEventListener(PROGRESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [contentKey]);

  return (
    <span className="ml-3 inline-flex flex-wrap items-center gap-2 align-middle">
      <button
        type="button"
        onClick={() => void syncToggle(contentKey, "complete", !complete)}
        aria-pressed={complete}
        data-testid="article-completed-badge"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          complete
            ? "border-success/60 bg-success/10 text-ink hover:border-success"
            : "border-hairline bg-paper-2 text-ink-2 hover:border-ink hover:text-ink"
        )}
      >
        {complete ? (
          <CheckCircle2 aria-hidden className="size-3.5 text-success" />
        ) : (
          <Circle aria-hidden className="size-3.5" />
        )}
        {complete ? "Completed" : "Mark as done"}
      </button>
      {stats.total > 0 && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {sectionLabel ? `${sectionLabel}: ` : ""}
          <strong className="font-semibold text-ink">{stats.percent}%</strong> ({stats.completed}/{stats.total})
        </span>
      )}
    </span>
  );
}

export function ProgressActions({
  contentKey,
  sectionLabel,
  sectionHref,
  sectionHrefs = EMPTY_HREFS,
  prev,
  next,
}: ProgressActionsProps) {
  const [state, setState] = useState<{ complete: boolean; bookmark: boolean } | null>(null);
  const [savedToAccount, setSavedToAccount] = useState<boolean | null>(null);
  const stats = useProgressStats(sectionHrefs);

  useEffect(() => {
    const sync = () => setState(localProgressState(contentKey));
    sync();
    window.addEventListener(PROGRESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [contentKey]);

  const toggle = async (kind: Kind) => {
    if (!state) return;
    const on = !state[kind];
    setState({ ...state, [kind]: on });
    const ok = await syncToggle(contentKey, kind, on);
    setSavedToAccount(ok);
  };

  const button = "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors";
  return (
    <div className="mt-12 border-t border-hairline pt-6" data-testid="progress-actions">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => toggle("complete")}
            aria-pressed={state?.complete ?? false}
            disabled={!state}
            className={cn(
              button,
              state?.complete
                ? "border-success/60 bg-success/10 text-ink"
                : "border-hairline text-ink-2 hover:border-ink hover:text-ink"
            )}
          >
            {state?.complete ? (
              <CheckCircle2 aria-hidden className="size-4 text-success" />
            ) : (
              <Circle aria-hidden className="size-4" />
            )}
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
            <span className="text-xs text-muted-foreground">
              Saved in this browser. Sign in to keep it across devices.
            </span>
          )}
          {savedToAccount === true && <span className="text-xs text-muted-foreground">Saved to your account.</span>}
        </div>

        {stats.total > 0 && (
          <div className="min-w-[14rem] flex-1 sm:max-w-xs" data-testid="article-section-progress">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              {sectionHref ? (
                <Link href={sectionHref} className="truncate font-medium text-ink-2 hover:text-ink">
                  {sectionLabel ?? "Track progress"}
                </Link>
              ) : (
                <span className="truncate font-medium text-ink-2">{sectionLabel ?? "Track progress"}</span>
              )}
              <span className="shrink-0 tabular-nums font-semibold text-ink" data-testid="article-section-percent">
                {stats.percent}% ({stats.completed}/{stats.total})
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`${sectionLabel ?? "Section"} progress`}
              aria-valuenow={stats.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-2"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  stats.percent === 100 ? "bg-success" : "bg-tint"
                )}
                style={{ width: `${stats.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {(prev || next) && (
        <nav aria-label="Adjacent topics" className="mt-6 grid gap-3 border-t border-hairline pt-6 sm:grid-cols-2">
          {prev ? (
            <Link
              href={prev.href}
              className="group flex flex-col rounded-xl border border-hairline bg-paper p-4 transition-colors hover:border-tint/60"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <ArrowLeft aria-hidden className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                Previous
              </span>
              <span className="mt-1.5 font-display text-base text-ink">{prev.title}</span>
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}
          {next && (
            <Link
              href={next.href}
              className="group flex flex-col items-end rounded-xl border border-hairline bg-paper p-4 text-right transition-colors hover:border-tint/60"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Next topic
                <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="mt-1.5 font-display text-base text-ink">{next.title}</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
