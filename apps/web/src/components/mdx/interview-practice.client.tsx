"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CornerDownRight, Eye, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ANSWER_PARTS,
  ANSWER_SECONDS,
  PRACTICE_EVENT,
  RATINGS,
  clock,
  partAt,
  readPracticeLog,
  recordPractice,
  shuffled,
  weakestFirst,
  type PracticeEntry,
  type PracticeLog,
  type Rating,
} from "@/lib/practice";

// Practice mode for a question list (interview-qa.tsx). Like QaController it works on the server-rendered
// markup through data attributes, so answers never ship as JS props. With practice on, an opened question
// shows a two-minute answer timer in place of its answer; the learner answers out loud, reveals the answer,
// rates themself, and can then take the interviewer's follow-ups one at a time.
// Ratings are kept in this browser (lib/practice.ts).

type Order = "listed" | "weakest" | "shuffle";

const ORDERS: readonly { value: Order; label: string }[] = [
  { value: "listed", label: "As listed" },
  { value: "weakest", label: "Weakest first" },
  { value: "shuffle", label: "Shuffle" },
];

const PART_TONE: Record<string, string> = {
  situation: "var(--dg-blue)",
  action: "var(--dg-orange)",
  result: "var(--dg-green)",
  learning: "var(--dg-violet)",
};

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-hairline bg-paper px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass =
  "inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-3 py-1.5 text-[13px] font-medium text-paper transition-colors hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-ring";

const idOf = (el: HTMLElement) => el.dataset.qaId ?? "";

export function PracticeController() {
  const marker = useRef<HTMLSpanElement>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState<HTMLDetailsElement[]>([]);
  const [log, setLog] = useState<PracticeLog>({});
  const [order, setOrder] = useState<Order>("listed");
  // The order is worked out when it is chosen, not on every rating, so the list does not jump mid-session.
  const [sequence, setSequence] = useState<string[] | null>(null);

  const items = useMemo(
    () => (root ? Array.from(root.querySelectorAll<HTMLDetailsElement>("details[data-qa-item][data-qa-id]")) : []),
    [root]
  );

  useEffect(() => {
    setRoot(marker.current?.closest<HTMLElement>("[data-qa]") ?? null);
    const sync = () => setLog(readPracticeLog());
    sync();
    window.addEventListener(PRACTICE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PRACTICE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // The toggle is server markup, hidden until this island can drive it.
  useEffect(() => {
    const toggle = root?.querySelector<HTMLButtonElement>("[data-qa-practice]");
    if (!root || !toggle) return;
    toggle.hidden = false;
    const onClick = () => setOn((v) => !v);
    toggle.addEventListener("click", onClick);
    return () => toggle.removeEventListener("click", onClick);
  }, [root]);

  useEffect(() => {
    if (!root) return;
    root.querySelector("[data-qa-practice]")?.setAttribute("aria-pressed", String(on));
    const bar = root.querySelector<HTMLElement>("[data-qa-practice-bar]");
    if (bar) bar.hidden = !on;
    if (on) root.dataset.practice = "on";
    else delete root.dataset.practice;
  }, [root, on]);

  // Which questions are open. `toggle` does not bubble, so listen in the capture phase.
  useEffect(() => {
    if (!root) return;
    const sync = () => setOpen(items.filter((el) => el.open));
    sync();
    root.addEventListener("toggle", sync, true);
    return () => root.removeEventListener("toggle", sync, true);
  }, [root, items]);

  // "Practised 2x · 4/5" on every question that has a rating, with or without practice mode.
  useEffect(() => {
    for (const el of items) {
      const badge = el.querySelector<HTMLElement>("[data-qa-practised]");
      if (!badge) continue;
      const entry = log[idOf(el)];
      badge.hidden = !entry;
      if (entry) badge.textContent = `Practised ${entry.times}x · ${entry.rating}/5`;
    }
  }, [items, log]);

  // Reordering uses CSS `order` on the flex list, so the server-rendered nodes are never moved.
  useEffect(() => {
    const position = new Map((on && sequence ? sequence : []).map((id, i) => [id, i]));
    for (const el of items) {
      const at = position.get(idOf(el));
      el.style.order = at === undefined ? "" : String(at);
    }
  }, [items, on, sequence]);

  const choose = useCallback(
    (next: Order) => {
      setOrder(next);
      const ids = items.map(idOf);
      if (next === "listed") setSequence(null);
      else if (next === "weakest") setSequence(weakestFirst(ids, readPracticeLog()));
      else setSequence(shuffled(ids, Math.random));
    },
    [items]
  );

  const rate = useCallback((id: string, rating: Rating) => setLog(recordPractice(id, rating)), []);

  const bar = on ? root?.querySelector<HTMLElement>("[data-qa-practice-bar]") : null;
  const practised = items.filter((el) => log[idOf(el)]).length;

  return (
    <>
      <span ref={marker} hidden />
      {bar &&
        createPortal(
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="min-w-0 flex-1 basis-64 text-sm text-ink-2">
              <span className="font-semibold text-ink">Practice mode.</span> Open a question, answer it out loud against
              the timer, then show the answer and rate yourself.{" "}
              <span className="whitespace-nowrap text-muted-foreground">
                {practised} of {items.length} practised
              </span>
            </p>
            <div role="group" aria-label="Question order" className="flex flex-wrap gap-1.5">
              {ORDERS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={order === o.value}
                  onClick={() => choose(o.value)}
                  className="rounded-full border border-hairline bg-paper px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>,
          bar
        )}
      {on &&
        open.map((el) => {
          const slot = el.querySelector<HTMLElement>("[data-qa-practice-slot]");
          const id = idOf(el);
          return slot
            ? createPortal(<PracticePanel item={el} entry={log[id]} onRate={(r) => rate(id, r)} />, slot, id)
            : null;
        })}
    </>
  );
}

function PracticePanel({
  item,
  entry,
  onRate,
}: {
  item: HTMLDetailsElement;
  entry?: PracticeEntry;
  onRate: (rating: Rating) => void;
}) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState<Rating | null>(null);
  const [probes, setProbes] = useState(0);
  const base = useRef({ at: 0, from: 0 });
  const followUps = useMemo(
    () => Array.from(item.querySelectorAll<HTMLDetailsElement>("details[data-qa-followup]")),
    [item]
  );

  // The answer, its links and the follow-ups are hidden while this panel is shown, and restored when it goes.
  useEffect(() => {
    const parts = Array.from(item.querySelectorAll<HTMLElement>("[data-qa-answer], [data-qa-links]"));
    const wrap = item.querySelector<HTMLElement>("[data-qa-followups]");
    for (const el of parts) el.hidden = !revealed;
    if (wrap) wrap.hidden = probes === 0;
    followUps.forEach((el, i) => {
      el.hidden = i >= probes;
      if (i >= probes) el.open = false;
    });
    return () => {
      for (const el of parts) el.hidden = false;
      if (wrap) wrap.hidden = false;
      for (const el of followUps) el.hidden = false;
    };
  }, [item, followUps, revealed, probes]);

  useEffect(() => {
    if (!running) return;
    base.current = { at: performance.now(), from: elapsed };
    const tick = () => setElapsed(base.current.from + (performance.now() - base.current.at) / 1000);
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
    // `elapsed` is read once when the timer starts; it must not restart the interval on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const part = partAt(elapsed);
  const over = elapsed >= ANSWER_SECONDS;
  const reveal = () => {
    setRunning(false);
    setRevealed(true);
  };
  const reset = () => {
    setRunning(false);
    setElapsed(0);
  };

  return (
    <div className="mb-5 rounded-lg border border-hairline bg-paper p-4">
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
            <div key={p.key} className="relative bg-paper-2" style={{ flexGrow: p.share, flexBasis: 0 }}>
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
            className={cn("min-w-0 truncate", part?.key === p.key && !revealed && "font-semibold text-ink")}
            style={{ flexGrow: p.share, flexBasis: 0 }}
          >
            {p.label}
          </li>
        ))}
      </ol>

      <p className="mt-3 min-h-10 text-sm text-ink-2" aria-live="polite">
        {revealed ? (
          <>Compare your answer with the one below, then rate it.</>
        ) : over ? (
          <span className="font-medium text-destructive">Two minutes are up. Land the result and stop.</span>
        ) : (
          <>
            <span className="font-semibold text-ink">{part?.label}.</span> {part?.cue}
          </>
        )}
      </p>

      {!revealed && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={buttonClass} onClick={() => setRunning((v) => !v)}>
            {running ? <Pause aria-hidden className="size-3.5" /> : <Play aria-hidden className="size-3.5" />}
            {running ? "Pause" : elapsed > 0 ? "Resume" : "Start timer"}
          </button>
          <button type="button" className={buttonClass} onClick={reset} disabled={elapsed === 0}>
            <RotateCcw aria-hidden className="size-3.5" /> Reset
          </button>
          <button type="button" className={primaryClass} onClick={reveal}>
            <Eye aria-hidden className="size-3.5" /> Show answer
          </button>
        </div>
      )}

      {revealed && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p id={`${item.dataset.qaId}-rate`} className="text-[13px] font-medium text-ink">
            How did your answer go?
          </p>
          <div role="group" aria-labelledby={`${item.dataset.qaId}-rate`} className="mt-2 flex flex-wrap gap-1.5">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                title={r.hint}
                aria-pressed={rated === r.value}
                onClick={() => {
                  setRated(r.value);
                  onRate(r.value);
                }}
                className="rounded-full border border-hairline bg-paper px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
              >
                <span className="font-mono">{r.value}</span> {r.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
            {rated
              ? `${RATINGS[rated - 1].hint}. Saved in this browser; practised ${entry?.times ?? 1} time${(entry?.times ?? 1) === 1 ? "" : "s"}.`
              : "1 is a blank, 5 is ready for the interview. Your ratings stay in this browser."}
          </p>

          {followUps.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-3">
              <button
                type="button"
                className={buttonClass}
                onClick={() => setProbes((n) => Math.min(followUps.length, n + 1))}
                disabled={probes >= followUps.length}
              >
                <CornerDownRight aria-hidden className="size-3.5" />
                {probes === 0 ? "Take the first follow-up" : "Next follow-up"}
              </button>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {probes === 0
                  ? `The interviewer has ${followUps.length} follow-up${followUps.length === 1 ? "" : "s"}. Answer each one before you open it.`
                  : `Follow-up ${probes} of ${followUps.length} is below. Answer it out loud, then open it.`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
