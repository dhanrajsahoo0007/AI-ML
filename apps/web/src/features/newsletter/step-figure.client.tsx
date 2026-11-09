"use client";

import { useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// A build-up figure on the web (`![alt](asset:<id>#steps)`): every step is rendered on the server; this island only
// shows one at a time, with Back/Next buttons, step dots and the arrow keys. Without JavaScript step 1 shows.

export function StepFigure({ steps, alt, frameClassName }: { steps: string[]; alt: string; frameClassName: string }) {
  const [i, setI] = useState(0);
  const last = steps.length - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(last, n)));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(i + 1);
    else if (e.key === "ArrowLeft") go(i - 1);
    else return;
    e.preventDefault();
  };
  const btn =
    "inline-flex items-center gap-1 rounded-full border border-hairline bg-paper px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink/40 disabled:opacity-40";
  return (
    <div
      role="group"
      aria-roledescription="step-by-step figure"
      aria-label={alt}
      tabIndex={0}
      onKeyDown={onKey}
      className="outline-none"
    >
      <div className={frameClassName}>
        {steps.map((svg, k) => (
          <div
            key={k}
            role="img"
            aria-label={`${alt} Step ${k + 1} of ${steps.length}.`}
            aria-hidden={k !== i}
            className={cn(k === i ? "block" : "hidden")}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" className={btn} onClick={() => go(i - 1)} disabled={i === 0}>
          <ChevronLeft aria-hidden className="size-4" /> Back
        </button>
        <div className="flex items-center gap-2" aria-live="polite">
          {steps.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Step ${k + 1}`}
              aria-current={k === i ? "step" : undefined}
              onClick={() => go(k)}
              className={cn(
                "size-2.5 rounded-full transition-all",
                k === i ? "w-6 bg-primary" : "bg-ink/20 hover:bg-ink/40"
              )}
            />
          ))}
          <span className="ml-1 text-xs text-muted-foreground tabular-nums">
            {i + 1} / {steps.length}
          </span>
        </div>
        <button type="button" className={btn} onClick={() => go(i + 1)} disabled={i === last}>
          Next <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
