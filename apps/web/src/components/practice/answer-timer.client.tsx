"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ANSWER_PARTS, ANSWER_SECONDS, clock, partAt } from "@/lib/practice";

// The two-minute answer timer shared by practice mode on question lists and by the mock loop: a clock and a
// bar split into the STAR+L parts, so the speaker sees which part they should be in.

export const PART_TONE: Record<string, string> = {
  situation: "var(--dg-blue)",
  action: "var(--dg-orange)",
  result: "var(--dg-green)",
  learning: "var(--dg-violet)",
};

export const buttonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-hairline bg-paper px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
export const primaryClass =
  "inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-3 py-1.5 text-[13px] font-medium text-paper transition-colors hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";

/** Seconds spent answering, with start, pause and reset. */
export function useAnswerTimer() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const base = useRef({ at: 0, from: 0 });

  useEffect(() => {
    if (!running) return;
    base.current = { at: performance.now(), from: elapsed };
    const tick = () => setElapsed(base.current.from + (performance.now() - base.current.at) / 1000);
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
    // `elapsed` is read once when the timer starts; it must not restart the interval on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return {
    running,
    elapsed,
    toggle: () => setRunning((v) => !v),
    stop: () => setRunning(false),
    reset: () => {
      setRunning(false);
      setElapsed(0);
    },
  };
}

/** The clock, the bar and the part labels. `done` stops highlighting the current part. */
export function AnswerTimerBar({ elapsed, done = false }: { elapsed: number; done?: boolean }) {
  const part = partAt(elapsed);
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Answer out loud</p>
        <p className="font-mono text-sm text-ink tabular-nums" role="timer" aria-label="Time spent on your answer">
          {clock(elapsed)} <span className="text-muted-foreground">/ {clock(ANSWER_SECONDS)}</span>
        </p>
      </div>

      <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {ANSWER_PARTS.map((p, i) => {
          const start = ANSWER_PARTS.slice(0, i).reduce((n, x) => n + x.share, 0) * ANSWER_SECONDS;
          const length = p.share * ANSWER_SECONDS;
          const filled = Math.min(1, Math.max(0, (elapsed - start) / length));
          return (
            <div key={p.key} className="relative bg-hairline" style={{ flexGrow: p.share, flexBasis: 0 }}>
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${filled * 100}%`, backgroundColor: PART_TONE[p.key] }}
              />
            </div>
          );
        })}
      </div>
      <ol className="mt-1.5 flex gap-0.5 text-[11px] leading-tight text-muted-foreground">
        {ANSWER_PARTS.map((p) => (
          <li
            key={p.key}
            className={cn("min-w-0 truncate", part?.key === p.key && !done && "font-semibold text-ink")}
            style={{ flexGrow: p.share, flexBasis: 0 }}
          >
            {p.short}
          </li>
        ))}
      </ol>
    </>
  );
}

/** The line under the bar: what to say in the current part, or that the time is up. */
export function AnswerCue({ elapsed }: { elapsed: number }) {
  const part = partAt(elapsed);
  if (elapsed >= ANSWER_SECONDS) {
    return <span className="font-medium text-destructive">Two minutes are up. Land the result and stop.</span>;
  }
  return (
    <>
      <span className="font-semibold text-ink">{part?.label}.</span> {part?.cue}
    </>
  );
}
