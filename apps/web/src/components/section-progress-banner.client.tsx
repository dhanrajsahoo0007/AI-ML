"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useProgressStats, type ProgressNavItem } from "@/lib/completed.client";
import { cn } from "@/lib/utils";

// Per-tab (per-section) progress summary shown on a section's landing page once the learner has completed at
// least one topic in that section. Hidden at 0 completed so initial server renders have zero layout shift.
export function SectionProgressBanner({
  sectionLabel,
  items,
}: {
  sectionLabel: string;
  items: readonly ProgressNavItem[];
}) {
  const hrefs = useMemo(() => items.map((i) => i.href), [items]);
  const stats = useProgressStats(hrefs);

  if (stats.completed === 0 || stats.total === 0) return null;

  const nextItem = stats.nextHref ? items.find((i) => i.href === stats.nextHref) : undefined;

  return (
    <div data-testid="section-progress-banner" className="mb-10 rounded-xl border border-hairline bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {sectionLabel} progress
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-2xl tabular-nums text-ink" data-testid="section-progress-percent">
              {stats.percent}% completed
            </span>
            <span className="text-sm tabular-nums text-muted-foreground" data-testid="section-progress-count">
              · {stats.completed} of {stats.total} {stats.total === 1 ? "topic" : "topics"} read
            </span>
          </p>
        </div>

        {nextItem ? (
          <Link
            href={nextItem.href}
            data-testid="section-progress-continue"
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper-2 px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-tint hover:text-ink"
          >
            <span className="max-w-[18rem] truncate">Continue: {nextItem.title}</span>
            <ArrowRight aria-hidden className="size-4 shrink-0 text-tint" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/60 bg-success/10 px-3.5 py-1.5 text-xs font-semibold text-ink">
            <CheckCircle2 aria-hidden className="size-4 text-success" />
            Track completed
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-label={`${sectionLabel} progress`}
        aria-valuenow={stats.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-paper-2"
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
