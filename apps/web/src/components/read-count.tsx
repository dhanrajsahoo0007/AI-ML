"use client";

import { Check, CheckCircle2, Circle } from "lucide-react";
import { isCompleted, useCompletedPages, useProgressStats, useToggleCompleted } from "@/lib/completed.client";
import { cn } from "@/lib/utils";

/** "4/10 done (40%)" after a card's topic count. Always visible when `hrefs` is non-empty. */
export function ReadCount({ hrefs }: { hrefs: string[] }) {
  const stats = useProgressStats(hrefs);
  if (stats.total === 0) return null;
  return (
    <span
      data-testid="card-read-count"
      className="ml-2 inline-flex items-center gap-1 normal-case tracking-normal tabular-nums text-ink-2"
    >
      <Check
        aria-hidden
        className={cn("size-3.5", stats.completed > 0 ? "text-success" : "text-muted-foreground/60")}
      />
      {stats.completed}/{stats.total} done ({stats.percent}%)
    </span>
  );
}

/** Progress bar above a TopicCard footer. */
export function CardProgressBar({ hrefs }: { hrefs: string[] }) {
  const stats = useProgressStats(hrefs);
  if (stats.total === 0) return null;
  return (
    <div
      role="progressbar"
      aria-label="Group progress"
      aria-valuenow={stats.percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-paper-2"
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          stats.percent === 100 ? "bg-success" : "bg-tint"
        )}
        style={{ width: `${stats.percent}%` }}
      />
    </div>
  );
}

/** Category-level progress badge + mini progress bar inside <ModelCategory> on hub pages. */
export function CategoryProgressBadge({ hrefs, title }: { hrefs: string[]; title: string }) {
  const stats = useProgressStats(hrefs);
  if (stats.total === 0) return null;
  return (
    <div
      data-testid="category-progress"
      className="inline-flex items-center gap-3 rounded-full border border-hairline bg-paper px-3 py-1 text-xs tabular-nums"
    >
      <span className="font-medium text-ink">
        {stats.percent}% done · {stats.completed}/{stats.total}
      </span>
      <div
        role="progressbar"
        aria-label={`${title} progress`}
        aria-valuenow={stats.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-16 overflow-hidden rounded-full bg-paper-2"
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
  );
}

/** Interactive "Mark done" / "Done" toggle button on a hub <ModelCard>. */
export function ModelCardDone({ href, title }: { href: string; title?: string }) {
  const done = isCompleted(useCompletedPages(), href);
  const toggle = useToggleCompleted();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(href, !done);
      }}
      aria-pressed={done}
      aria-label={done ? `Mark ${title ?? "page"} as unread` : `Mark ${title ?? "page"} as done`}
      data-testid="model-card-done"
      className={cn(
        "relative z-10 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        done
          ? "border-success/60 bg-success/10 text-ink hover:border-success"
          : "border-hairline bg-paper-2 text-muted-foreground hover:border-ink hover:text-ink"
      )}
    >
      {done ? <CheckCircle2 aria-hidden className="size-3 text-success" /> : <Circle aria-hidden className="size-3" />}
      {done ? "Done" : "Mark done"}
    </button>
  );
}

/** Completion summary inside a <LearningPath> header. */
export function LearningPathProgress({ hrefs }: { hrefs: string[] }) {
  const stats = useProgressStats(hrefs);
  if (stats.total === 0) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 tabular-nums text-ink-2" data-testid="learning-path-progress">
      <Check
        aria-hidden
        className={cn("size-3.5", stats.completed > 0 ? "text-success" : "text-muted-foreground/60")}
      />
      {stats.completed}/{stats.total} ({stats.percent}%)
    </span>
  );
}

/** Step number circle in <LearningPath> that turns into a green checkmark when the step's page is complete. */
export function LearningPathStepBadge({ href, step }: { href: string; step: number }) {
  const done = isCompleted(useCompletedPages(), href);
  if (done) {
    return (
      <span
        data-testid="learning-path-step-done"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-success font-mono text-xs font-semibold text-paper"
      >
        <Check aria-hidden className="size-3.5" />
        <span className="sr-only">Step {step} (completed)</span>
      </span>
    );
  }
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-semibold text-paper">
      {step}
    </span>
  );
}
