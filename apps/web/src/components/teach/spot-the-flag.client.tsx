"use client";

import * as React from "react";
import { Check, Flag, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreFlags, summarize, verdictOf, type FlagSentence, type Verdict } from "./spot-the-flag-model";

// A weak interview answer, one sentence per button. The reader picks the sentences that would cost the
// candidate points, then checks: each sentence is marked and explained, and the picks are scored.
// Rendered by the server wrapper in ./spot-the-flag.tsx after zod validation.

const VERDICT: Record<Exclude<Verdict, "clear">, { label: string; tone: string; icon: typeof Check }> = {
  caught: { label: "Red flag. You caught it.", tone: "var(--dg-green)", icon: Check },
  missed: { label: "Red flag. You missed it.", tone: "var(--dg-red)", icon: Flag },
  "false-alarm": { label: "This one is fine.", tone: "var(--dg-orange)", icon: X },
};

export function SpotTheFlagClient({
  title = "Spot the red flags",
  prompt,
  sentences,
}: {
  title?: string;
  prompt: string;
  sentences: FlagSentence[];
}) {
  const [picked, setPicked] = React.useState<ReadonlySet<number>>(new Set());
  const [checked, setChecked] = React.useState(false);
  const summary = React.useRef<HTMLParagraphElement>(null);
  const first = React.useRef<HTMLButtonElement>(null);

  // "Check" and "Try again" unmount the button that was pressed. Focus moves to the result, or back to the
  // first sentence, so keyboard and screen-reader users are not dropped at <body>.
  const shown = React.useRef(checked);
  React.useEffect(() => {
    if (shown.current === checked) return;
    shown.current = checked;
    (checked ? summary.current : first.current)?.focus();
  }, [checked]);

  const toggle = (i: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const reset = () => {
    setPicked(new Set());
    setChecked(false);
  };
  const score = scoreFlags(sentences, picked);

  return (
    <div className="not-prose my-8 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <div className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{title}</div>
        <p className="mt-1 font-display text-lg leading-snug font-semibold text-ink">&ldquo;{prompt}&rdquo;</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {checked
            ? "Each sentence is marked below."
            : "Read the answer. Select every sentence that would cost the candidate points, then check."}
        </p>
      </div>

      <ol className="divide-y divide-hairline">
        {sentences.map((s, i) => {
          const on = picked.has(i);
          const verdict = verdictOf(s, on);
          const mark = checked && verdict !== "clear" ? VERDICT[verdict] : null;
          const why = verdict === "false-alarm" ? s.note : s.flag;
          return (
            <li key={i}>
              <button
                ref={i === 0 ? first : undefined}
                type="button"
                aria-pressed={on}
                disabled={checked}
                onClick={() => toggle(i)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left text-[15px] leading-relaxed text-ink-2 transition-colors sm:px-5",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  !checked && "hover:bg-paper-2/60",
                  !checked && on && "bg-paper-2 text-ink"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 flex size-5 shrink-0 items-center justify-center rounded border",
                    on ? "border-ink bg-ink text-paper" : "border-hairline text-transparent"
                  )}
                >
                  <Flag className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  {s.text}
                  {mark && (
                    <span className="mt-1.5 block border-l-2 pl-3 text-sm" style={{ borderColor: mark.tone }}>
                      <span className="flex items-center gap-1.5 font-semibold text-ink">
                        <mark.icon aria-hidden className="size-3.5" style={{ color: mark.tone }} />
                        {mark.label}
                      </span>
                      {why && <span className="mt-0.5 block text-ink-2">{why}</span>}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline bg-paper-2/40 px-4 py-3 sm:px-5">
        {checked ? (
          <>
            <p
              ref={summary}
              tabIndex={-1}
              className="min-w-0 flex-1 basis-56 rounded-sm text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-ring"
            >
              {summarize(score)}
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-paper px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-ring"
            >
              <RotateCcw aria-hidden className="size-3.5" /> Try again
            </button>
          </>
        ) : (
          <>
            <p className="min-w-0 flex-1 basis-56 text-sm text-muted-foreground" aria-live="polite">
              {picked.size === 0 ? "Nothing selected yet." : `${picked.size} selected.`}
            </p>
            <button
              type="button"
              onClick={() => setChecked(true)}
              disabled={picked.size === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-3 py-1.5 text-[13px] font-medium text-paper transition-colors hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check aria-hidden className="size-3.5" /> Check my picks
            </button>
          </>
        )}
      </div>
    </div>
  );
}
