"use client";

import { Zap } from "lucide-react";
import { usePatternMatch, usePatternMatchCount } from "@/lib/pattern-filter.client";

// Islands inside the server-rendered hub grid. Idle (render nothing) unless the pattern explorer has a filter on.
// The card's <Link> styles itself from the marker with `has-[[data-pattern-match=…]]`.

export function PatternCardMatch({ href }: { href: string }) {
  const m = usePatternMatch(href);
  if (m === "idle") return null;
  if (m === "dim") return <span hidden data-pattern-match="dim" />;
  return (
    <span data-pattern-match="hit" className="!mt-3 flex flex-col items-start gap-1">
      {m.note && (
        <>
          <span className="inline-flex items-center gap-1 rounded-full border border-tint/50 bg-paper px-2 py-0.5 text-[11px] font-medium text-ink">
            {m.role === "edge" && <Zap aria-hidden className="size-3 text-tint" />}
            {m.role === "edge" ? "Interview edge for this use case" : "Core for this use case"}
          </span>
          <span className="text-[13px] leading-snug text-ink-2">{m.note}</span>
        </>
      )}
    </span>
  );
}

export function PatternCategoryMatchCount({ hrefs }: { hrefs: string[] }) {
  const n = usePatternMatchCount(hrefs);
  if (n === null) return null;
  return (
    <span
      data-testid="pattern-category-match-count"
      className="rounded-full border border-hairline bg-paper-2 px-2.5 py-0.5 text-xs font-medium text-ink-2"
    >
      {n} match
    </span>
  );
}
