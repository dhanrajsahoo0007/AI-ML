"use client";

import * as React from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { drillSummary, scoreDrill, type ChoiceDrill } from "./choice-drill-model";

// The island behind <GuessTheLevel> and <WhichPrinciple>: a list of quotations, each answered by picking one
// of a shared set of options. "Check" marks every item, shows the right option and the reason, and gives a
// score. Rendered by the server wrappers in ./choice-drill.tsx after zod validation.

export function ChoiceDrillClient({ title, prompt, instruction, options, items }: ChoiceDrill) {
  const [picks, setPicks] = React.useState<(number | undefined)[]>(() => items.map(() => undefined));
  const [checked, setChecked] = React.useState(false);
  const summary = React.useRef<HTMLParagraphElement>(null);
  const first = React.useRef<HTMLInputElement>(null);

  // "Check" and "Try again" unmount the button that was pressed. Focus moves to the result, or back to the
  // first choice, so keyboard and screen-reader users are not dropped at <body>.
  const shown = React.useRef(checked);
  React.useEffect(() => {
    if (shown.current === checked) return;
    shown.current = checked;
    (checked ? summary.current : first.current)?.focus();
  }, [checked]);

  const pick = (item: number, option: number) => setPicks((prev) => prev.map((p, i) => (i === item ? option : p)));
  const reset = () => {
    setPicks(items.map(() => undefined));
    setChecked(false);
  };
  const answered = picks.filter((p) => p !== undefined).length;
  const right = scoreDrill(items, picks);

  return (
    // A form, so each exercise's radio groups are its own: the names repeat across exercises on a page.
    <form
      onSubmit={(e) => e.preventDefault()}
      className="not-prose my-8 overflow-hidden rounded-xl border border-hairline bg-paper"
    >
      <div className="border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <div className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{title}</div>
        {prompt && (
          <p className="mt-1 font-display text-lg leading-snug font-semibold text-ink">&ldquo;{prompt}&rdquo;</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{instruction}</p>
      </div>

      <ol className="divide-y divide-hairline">
        {items.map((item, i) => {
          const chosen = picks[i];
          const correct = chosen === item.answer;
          return (
            <li key={i} className="px-4 py-4 sm:px-5">
              <fieldset disabled={checked}>
                <legend className="text-[15px] leading-relaxed text-ink-2">
                  {items.length > 1 && <span className="mr-1.5 font-semibold text-ink">{i + 1}.</span>}
                  &ldquo;{item.text}&rdquo;
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {options.map((option, o) => {
                    const on = chosen === o;
                    const isAnswer = checked && o === item.answer;
                    const isWrongPick = checked && on && !correct;
                    return (
                      <label
                        key={o}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors",
                          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                          checked && "cursor-default",
                          !checked && on && "border-ink bg-ink text-paper",
                          !checked && !on && "border-hairline bg-paper text-ink hover:border-ink",
                          checked && !isAnswer && !isWrongPick && "border-hairline bg-paper text-muted-foreground",
                          isAnswer && "border-transparent text-ink",
                          isWrongPick && "border-transparent text-ink"
                        )}
                        style={
                          isAnswer
                            ? { boxShadow: "inset 0 0 0 2px var(--dg-green)" }
                            : isWrongPick
                              ? { boxShadow: "inset 0 0 0 2px var(--dg-red)" }
                              : undefined
                        }
                      >
                        <input
                          ref={i === 0 && o === 0 ? first : undefined}
                          type="radio"
                          name={`item-${i}`}
                          className="sr-only"
                          checked={on}
                          onChange={() => pick(i, o)}
                        />
                        {isAnswer && <Check aria-hidden className="size-3.5" style={{ color: "var(--dg-green)" }} />}
                        {isWrongPick && <X aria-hidden className="size-3.5" style={{ color: "var(--dg-red)" }} />}
                        {option}
                        {isAnswer && <span className="sr-only"> (the answer)</span>}
                        {isWrongPick && <span className="sr-only"> (your pick)</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {checked && (
                <p
                  className="mt-3 border-l-2 pl-3 text-sm text-ink-2"
                  style={{ borderColor: correct ? "var(--dg-green)" : "var(--dg-red)" }}
                >
                  <span className="font-semibold text-ink">
                    {correct ? "Correct." : `It is ${options[item.answer]}.`}
                  </span>{" "}
                  {item.why}
                </p>
              )}
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
              {drillSummary(right, items.length)}
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
              {items.length === 1
                ? answered === 0
                  ? "Nothing picked yet."
                  : "Ready to check."
                : `${answered} of ${items.length} answered.`}
            </p>
            <button
              type="button"
              onClick={() => setChecked(true)}
              disabled={answered < items.length}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-3 py-1.5 text-[13px] font-medium text-paper transition-colors hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check aria-hidden className="size-3.5" /> Check
            </button>
          </>
        )}
      </div>
    </form>
  );
}
