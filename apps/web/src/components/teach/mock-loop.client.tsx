"use client";

import * as React from "react";
import { ArrowRight, CornerDownRight, Pause, Play, RotateCcw } from "lucide-react";
import {
  AnswerCue,
  AnswerTimerBar,
  buttonClass,
  primaryClass,
  useAnswerTimer,
} from "@/components/practice/answer-timer.client";
import { LOOP_SIZE, drawLoop, summariseLoop, type LoopChoice, type MockQuestion } from "@/lib/mock-loop";
import { RATINGS, recordPractice, type Rating } from "@/lib/practice";
import { pushRating, syncPractice } from "@/lib/practice-sync";
import { cn } from "@/lib/utils";

// The mock loop: the reader picks a company and a level, gets five prompts drawn to match, answers each one
// out loud against the two-minute timer, takes the interviewer's follow-ups, and rates the answer. The end
// screen shows the average and what to practise again. Only prompts are sent to the browser, never answers.
// Rendered by the server wrapper in ./practice-tools.tsx.

const LEVELS = ["Junior", "Mid", "Senior"] as const;

const chip =
  "rounded-full border border-hairline bg-paper px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper";

export function MockLoopClient({
  questions,
  companies,
  signals,
}: {
  questions: MockQuestion[];
  companies: { slug: string; name: string }[];
  /** Signal slug to title, for the summary. */
  signals: Record<string, string>;
}) {
  const [choice, setChoice] = React.useState<LoopChoice>({ company: null, level: null });
  const [loop, setLoop] = React.useState<MockQuestion[] | null>(null);
  const [at, setAt] = React.useState(0);
  const [ratings, setRatings] = React.useState<Record<string, Rating>>({});
  const heading = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => void syncPractice(), []);

  // Each step replaces what was on screen: move focus to its first line so nobody is left at <body>.
  const step = `${loop ? "run" : "setup"}-${at}`;
  const shown = React.useRef(step);
  React.useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    heading.current?.focus();
  }, [step]);

  const begin = () => {
    setRatings({});
    setAt(0);
    setLoop(drawLoop(questions, choice, Math.random));
  };
  const rate = (id: string, rating: Rating) => {
    setRatings((r) => ({ ...r, [id]: rating }));
    recordPractice(id, rating);
    void pushRating(id, rating);
  };

  const frame = "not-prose my-8 overflow-hidden rounded-xl border border-hairline bg-paper";
  const kicker = "text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase";

  if (!loop) {
    return (
      <div className={frame}>
        <div className="border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
          <p ref={heading} tabIndex={-1} className={cn(kicker, "focus-visible:outline-none")}>
            Mock loop
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {LOOP_SIZE} questions, about two minutes each, with follow-ups. Answer out loud.
          </p>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <div>
            <p id="mock-company" className="text-sm font-semibold text-ink">
              Company
            </p>
            <div role="group" aria-labelledby="mock-company" className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                className={chip}
                aria-pressed={choice.company === null}
                onClick={() => setChoice((c) => ({ ...c, company: null }))}
              >
                Any company
              </button>
              {companies.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  className={chip}
                  aria-pressed={choice.company === c.slug}
                  onClick={() => setChoice((x) => ({ ...x, company: c.slug }))}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p id="mock-level" className="text-sm font-semibold text-ink">
              Level
            </p>
            <div role="group" aria-labelledby="mock-level" className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                className={chip}
                aria-pressed={choice.level === null}
                onClick={() => setChoice((c) => ({ ...c, level: null }))}
              >
                Any level
              </button>
              {LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={chip}
                  aria-pressed={choice.level === level}
                  onClick={() => setChoice((c) => ({ ...c, level }))}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline bg-paper-2/40 px-4 py-3 sm:px-5">
          <p className="min-w-0 flex-1 basis-56 text-xs text-muted-foreground">
            Questions tagged to the company come first. The rest are ones asked across companies.
          </p>
          <button type="button" className={primaryClass} onClick={begin} disabled={questions.length === 0}>
            <Play aria-hidden className="size-3.5" /> Start the loop
          </button>
        </div>
      </div>
    );
  }

  if (at >= loop.length) {
    const summary = summariseLoop(loop, ratings);
    return (
      <div className={frame}>
        <div className="border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
          <p ref={heading} tabIndex={-1} className={cn(kicker, "focus-visible:outline-none")}>
            Loop finished
          </p>
          <p className="mt-1 font-display text-lg leading-snug font-semibold text-ink">
            {summary.average === null
              ? "No answers rated."
              : `Average ${summary.average} of 5 over ${summary.answered} answer${summary.answered === 1 ? "" : "s"}.`}
          </p>
          {summary.signals.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              This loop tested: {summary.signals.map((s) => signals[s] ?? s).join(", ")}.
            </p>
          )}
        </div>
        <ol className="divide-y divide-hairline">
          {loop.map((q, i) => {
            const rating = ratings[q.id];
            return (
              <li key={q.id} className="flex items-start gap-3 px-4 py-3 text-[15px] text-ink-2 sm:px-5">
                <span className="font-mono text-xs font-semibold text-ink">{i + 1}</span>
                <span className="min-w-0 flex-1">{q.q}</span>
                <span
                  className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium text-ink"
                  style={{
                    borderColor:
                      rating === undefined ? "var(--hairline)" : rating <= 2 ? "var(--dg-red)" : "var(--dg-green)",
                  }}
                >
                  {rating === undefined ? "Skipped" : `${rating} ${RATINGS[rating - 1].label}`}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline bg-paper-2/40 px-4 py-3 sm:px-5">
          <p className="min-w-0 flex-1 basis-56 text-sm text-ink-2">
            {summary.weak.length > 0
              ? `Practise the ${summary.weak.length === 1 ? "answer" : `${summary.weak.length} answers`} you rated 1 or 2 again. They come first under Weakest first in Interview Practice.`
              : "Your ratings are saved. Run another loop for a different set of questions."}
          </p>
          <button type="button" className={buttonClass} onClick={() => setLoop(null)}>
            <RotateCcw aria-hidden className="size-3.5" /> New loop
          </button>
        </div>
      </div>
    );
  }

  const question = loop[at];
  return (
    <div className={frame}>
      <div className="border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <p ref={heading} tabIndex={-1} className={cn(kicker, "focus-visible:outline-none")}>
          Question {at + 1} of {loop.length}
        </p>
        <p className="mt-1 font-display text-lg leading-snug font-semibold text-ink">&ldquo;{question.q}&rdquo;</p>
      </div>
      <LoopQuestion
        key={question.id}
        question={question}
        rated={ratings[question.id]}
        last={at === loop.length - 1}
        onRate={(r) => rate(question.id, r)}
        onNext={() => setAt((n) => n + 1)}
      />
    </div>
  );
}

function LoopQuestion({
  question,
  rated,
  last,
  onRate,
  onNext,
}: {
  question: MockQuestion;
  rated: Rating | undefined;
  last: boolean;
  onRate: (rating: Rating) => void;
  onNext: () => void;
}) {
  const { running, elapsed, toggle, stop, reset } = useAnswerTimer();
  const [answered, setAnswered] = React.useState(false);
  const [probes, setProbes] = React.useState(0);
  const followUps = question.followUps;

  return (
    <>
      <div className="px-4 py-4 sm:px-5">
        <AnswerTimerBar elapsed={elapsed} done={answered} />
        <p className="mt-3 min-h-10 text-sm text-ink-2" aria-live="polite">
          {answered ? <>Take the follow-ups, then rate your answer.</> : <AnswerCue elapsed={elapsed} />}
        </p>
        {!answered && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={buttonClass} onClick={toggle}>
              {running ? <Pause aria-hidden className="size-3.5" /> : <Play aria-hidden className="size-3.5" />}
              {running ? "Pause" : elapsed > 0 ? "Resume" : "Start timer"}
            </button>
            <button type="button" className={buttonClass} onClick={reset} disabled={elapsed === 0}>
              <RotateCcw aria-hidden className="size-3.5" /> Reset
            </button>
            <button
              type="button"
              className={primaryClass}
              onClick={() => {
                stop();
                setAnswered(true);
              }}
            >
              I have answered
            </button>
          </div>
        )}

        {answered && followUps.length > 0 && (
          <div className="mt-3 border-t border-hairline pt-3">
            <ol className="space-y-2" aria-live="polite">
              {followUps.slice(0, probes).map((text, i) => (
                <li key={i} className="flex items-start gap-2 text-[15px] text-ink">
                  <CornerDownRight aria-hidden className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                  <span>&ldquo;{text}&rdquo;</span>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <button
                type="button"
                className={buttonClass}
                onClick={() => setProbes((n) => Math.min(followUps.length, n + 1))}
                disabled={probes >= followUps.length}
              >
                <CornerDownRight aria-hidden className="size-3.5" />
                {probes === 0 ? "Take the first follow-up" : "Next follow-up"}
              </button>
              <p className="text-xs text-muted-foreground">
                {probes >= followUps.length
                  ? "That was the last follow-up."
                  : `Follow-up ${probes + 1} of ${followUps.length}. Answer each one out loud.`}
              </p>
            </div>
          </div>
        )}

        {answered && (
          <div className="mt-3 border-t border-hairline pt-3">
            <p id={`${question.id}-mock-rate`} className="text-[13px] font-medium text-ink">
              How did your answer go?
            </p>
            <div role="group" aria-labelledby={`${question.id}-mock-rate`} className="mt-2 flex flex-wrap gap-1.5">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  title={r.hint}
                  aria-pressed={rated === r.value}
                  onClick={() => onRate(r.value)}
                  className={chip}
                >
                  <span className="font-mono">{r.value}</span> {r.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {rated ? `${RATINGS[rated - 1].hint}.` : "1 is a blank, 5 is ready for the interview."}
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline bg-paper-2/40 px-4 py-3 sm:px-5">
        <button type="button" className={rated ? primaryClass : buttonClass} onClick={onNext}>
          {last ? "Finish" : rated ? "Next question" : "Skip"} <ArrowRight aria-hidden className="size-3.5" />
        </button>
      </div>
    </>
  );
}
