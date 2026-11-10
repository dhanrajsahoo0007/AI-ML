"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { isQuestion, leafOf, nodeAt, pathTaken, type TreeNode } from "./decision-tree-model";

// One yes/no question at a time; the answers so far stay visible as chips you can jump back to.
// Rendered by the server wrapper in ./decision-tree.tsx after zod validation.

export function DecisionTreeClient({ tree, title = "Decision tree" }: { tree: TreeNode; title?: string }) {
  const [answers, setAnswers] = React.useState<boolean[]>([]);
  const node = nodeAt(tree, answers);
  const path = pathTaken(tree, answers);
  const answer = (yes: boolean) => setAnswers((a) => [...a, yes]);

  // Answering, a path chip and "Start over" all unmount the button that was pressed, which would drop keyboard
  // and screen-reader focus to <body>. After every change of answers, focus moves to the new question's first
  // choice, or to the answer heading at a leaf. Comparing with the previous answers (not a "mounted" flag) keeps
  // the first render, and StrictMode's re-run of effects, from stealing focus on page load.
  const firstChoice = React.useRef<HTMLButtonElement>(null);
  const resultHeading = React.useRef<HTMLDivElement>(null);
  const shown = React.useRef(answers);
  React.useEffect(() => {
    if (shown.current === answers) return;
    shown.current = answers;
    (firstChoice.current ?? resultHeading.current)?.focus();
  }, [answers]);

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</span>
        {path.length > 0 && (
          <ol className="!m-0 flex !list-none flex-wrap items-center gap-1.5 !p-0 [&>li]:!m-0" aria-label="Path taken">
            {path.map((p, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setAnswers((a) => a.slice(0, i))}
                  title={`Change: ${p.q}`}
                  className="rounded-full border border-hairline bg-paper px-2.5 py-0.5 text-xs text-ink-2 transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {p.q} <span className="font-semibold text-ink">{p.yes ? "Yes" : "No"}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        {answers.length > 0 && (
          <button
            type="button"
            onClick={() => setAnswers([])}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-ink focus-visible:outline-2 focus-visible:outline-ring"
          >
            <RotateCcw aria-hidden className="size-3" /> Start over
          </button>
        )}
      </div>

      <div className="p-4 sm:p-5" aria-live="polite">
        {isQuestion(node) ? (
          <>
            <div className="text-xs text-muted-foreground">Question {answers.length + 1}</div>
            <div className="mt-1 font-display text-xl font-semibold text-ink">{node.q}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[true, false].map((yes) => (
                <button
                  key={String(yes)}
                  ref={yes ? firstChoice : undefined}
                  type="button"
                  onClick={() => answer(yes)}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-hairline bg-paper px-3.5 py-3 text-left font-medium text-ink transition-colors hover:border-ink hover:bg-paper-2/60 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {yes ? "Yes" : "No"}
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                  />
                </button>
              ))}
            </div>
          </>
        ) : (
          <Result leaf={leafOf(node)} headingRef={resultHeading} />
        )}
      </div>
    </div>
  );
}

function Result({
  leaf,
  headingRef,
}: {
  leaf: { answer: string; href?: string };
  headingRef: React.Ref<HTMLDivElement>;
}) {
  return (
    <div>
      {/* Focus target after the last answer (tabIndex -1: focusable from script, not in the tab order). */}
      <div ref={headingRef} tabIndex={-1} className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Answer</div>
        <div className="mt-1.5 font-display text-2xl font-semibold leading-tight text-ink">{leaf.answer}</div>
      </div>
      {leaf.href && (
        <Link href={leaf.href} className="mt-3 inline-flex items-center gap-1 text-sm">
          Read more <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
