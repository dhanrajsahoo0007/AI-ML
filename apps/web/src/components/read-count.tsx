"use client";

import { Check } from "lucide-react";
import { useCompletedCount } from "@/lib/completed.client";

/** "4 read" after a card's topic count, once the learner has completed at least one of `hrefs`. */
export function ReadCount({ hrefs }: { hrefs: string[] }) {
  const count = useCompletedCount(hrefs);
  if (count === 0) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 normal-case tracking-normal text-ink-2">
      <Check aria-hidden className="size-3.5 text-success" />
      {count} read
    </span>
  );
}
