"use client";

import { Check } from "lucide-react";
import { isCompleted, useCompletedPages, useProgressStats } from "@/lib/completed.client";
import { cn } from "@/lib/utils";

/** "4/10 read (40%)" after a card's topic count, once the learner has completed at least one of `hrefs`. */
export function ReadCount({ hrefs }: { hrefs: string[] }) {
  const stats = useProgressStats(hrefs);
  if (stats.completed === 0) return null;
  return (
    <span
      data-testid="card-read-count"
      className="ml-2 inline-flex items-center gap-1 normal-case tracking-normal tabular-nums text-ink-2"
    >
      <Check aria-hidden className="size-3.5 text-success" />
      {stats.completed}/{stats.total} read ({stats.percent}%)
    </span>
  );
}

/** Thin progress bar above a TopicCard footer once the learner has started the group/hub. */
export function CardProgressBar({ hrefs }: { hrefs: string[] }) {
  const stats = useProgressStats(hrefs);
  if (stats.completed === 0 || stats.total === 0) return null;
  return (
    <div
      role="progressbar"
      aria-label="Group progress"
      aria-valuenow={stats.percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mt-5 h-1 w-full overflow-hidden rounded-full bg-paper-2"
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

/** Completion badge on a hub <ModelCard> once its article is marked complete. */
export function ModelCardDone({ href }: { href: string }) {
  const done = isCompleted(useCompletedPages(), href);
  if (!done) return null;
  return (
    <span
      data-testid="model-card-done"
      className="inline-flex items-center gap-1 rounded-full border border-success/60 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-ink"
    >
      <Check aria-hidden className="size-3 text-success" />
      Done
    </span>
  );
}

/** Completion summary inside a <LearningPath> header once at least one step is complete. */
export function LearningPathProgress({ hrefs }: { hrefs: string[] }) {
  const stats = useProgressStats(hrefs);
  if (stats.completed === 0) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 tabular-nums text-ink-2" data-testid="learning-path-progress">
      <Check aria-hidden className="size-3.5 text-success" />
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
