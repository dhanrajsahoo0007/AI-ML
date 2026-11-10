"use client";

import { useEffect, useState, type ReactNode, type Ref } from "react";
import { cx } from "./cx";
import { commitDraft, parseDraft } from "./number-draft";
import type { Tone } from "@/components/diagrams/types";

// Small presentational pieces every teaching widget uses: the card frame, labelled inputs, a segmented
// control and a stat tile. Colors come from the diagram tones in globals.css (--dg-*), which already have a
// dark-mode set, so widgets never hard-code a color.

const TONES: readonly Tone[] = ["blue", "green", "orange", "violet", "teal", "red", "neutral"];
export const toneAt = (i: number): Tone => TONES[i % TONES.length];
export const toneColor = (tone: Tone) => `var(--dg-${tone})`;
export const toneSoft = (tone: Tone) => `var(--dg-${tone}-soft)`;

export function WidgetFrame({
  label,
  title,
  intro,
  children,
  footer,
}: {
  /** Small caps kicker, e.g. "Latency ladder". */
  label: string;
  title?: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    // not-prose: the article's unlayered .prose-editorial list, table and pre rules skip this subtree (globals.css).
    <div className="not-prose my-8 rounded-xl border border-hairline bg-paper">
      <div className="border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
        {title && <div className="mt-0.5 font-display text-lg font-semibold leading-tight text-ink">{title}</div>}
        {intro && <p className="mt-1 text-sm text-muted-foreground">{intro}</p>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
      {footer && (
        <div className="border-t border-hairline px-4 py-2.5 text-xs text-muted-foreground sm:px-5">{footer}</div>
      )}
    </div>
  );
}

export function RangeField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** Text shown next to the label; defaults to the raw value. */
  display?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <label htmlFor={id} className="font-medium text-ink">
          {label}
        </label>
        <output htmlFor={id} className="tabular-nums text-ink-2">
          {display ?? value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--dg-blue)]"
      />
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  // The field shows what the reader typed (it can be empty or out of range mid-entry); `value` changes only
  // when the draft is a valid number, and the draft is clamped and normalised on blur. See number-draft.ts.
  const [draft, setDraft] = useState(() => String(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    // The parent changed the value (not from this field's typing): show it.
    setSeen(value);
    if (parseDraft(draft, min, max) !== value) setDraft(String(value));
  }
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseDraft(e.target.value, min, max);
            if (n !== null && n !== value) {
              setSeen(n);
              onChange(n);
            }
          }}
          onBlur={() => {
            const n = commitDraft(draft, min, max, value);
            setDraft(String(n));
            if (n !== value) {
              setSeen(n);
              onChange(n);
            }
          }}
          className="w-full rounded-md border border-hairline bg-paper px-2 py-1 text-sm tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-ring"
        />
        {suffix && <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-lg border border-hairline bg-paper-2/60 p-1"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "rounded-md px-2.5 py-1 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              on ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div
      className="rounded-lg border-l-2 bg-paper-2/60 px-3 py-2"
      style={{ borderColor: tone ? toneColor(tone) : "var(--hairline)" }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-xl font-semibold tabular-nums leading-tight text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Horizontal scroller for wide tables. Focusable and labelled so keyboard users can scroll it too. */
export function ScrollX({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="mt-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
    </div>
  );
}

/** Button styles shared by the widgets' action buttons. */
export function ActionButton({
  children,
  onClick,
  primary = false,
  disabled = false,
  pressed,
  ariaLabel,
  buttonRef,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  pressed?: boolean;
  ariaLabel?: string;
  /** For widgets that move focus to this button after the focused control unmounts. */
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={ariaLabel}
      className={cx(
        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        primary
          ? "border-ink bg-ink text-paper hover:bg-ink-2"
          : pressed
            ? "border-ink bg-paper-2 text-ink"
            : "border-hairline bg-paper text-ink hover:border-ink"
      )}
    >
      {children}
    </button>
  );
}

/** Play/step/reset controls for the simulations that advance through a sequence. */
export function Transport({
  playing,
  atEnd,
  onPlay,
  onStep,
  onReset,
}: {
  playing: boolean;
  atEnd: boolean;
  onPlay: () => void;
  onStep: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Playback">
      <ActionButton onClick={onPlay} primary>
        {playing ? "Pause" : atEnd ? "Replay" : "Play"}
      </ActionButton>
      <ActionButton onClick={onStep} disabled={atEnd || playing}>
        Step
      </ActionButton>
      <ActionButton onClick={onReset}>Reset</ActionButton>
    </div>
  );
}

/**
 * Position in a step-by-step replay of `total` steps. Starts at the end, so the server render (and a reader
 * without JS) sees the finished result; Play rewinds and steps forward every `intervalMs`.
 */
export function usePlayback(total: number, intervalMs = 450) {
  // null = "show everything", so a change of inputs that calls showAll() lands on the new end.
  const [pos, setPos] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const at = pos === null ? total : Math.min(pos, total);
  const atEnd = at >= total;
  const running = playing && !atEnd;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setPos((p) => Math.min(total, (p ?? total) + 1)), intervalMs);
    return () => window.clearInterval(id);
  }, [running, total, intervalMs]);

  return {
    at,
    atEnd,
    playing: running,
    play: () => {
      if (running) return setPlaying(false);
      if (atEnd) setPos(0);
      setPlaying(true);
    },
    step: () => {
      setPlaying(false);
      setPos(Math.min(total, at + 1));
    },
    reset: () => {
      setPlaying(false);
      setPos(0);
    },
    showAll: () => {
      setPlaying(false);
      setPos(null);
    },
  };
}
