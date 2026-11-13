"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/practice/answer-timer.client";
import { CHECKLIST_EVENT, clearTicks, readTicks, setTick } from "@/lib/checklist";
import { cn } from "@/lib/utils";

// A preparation plan the reader ticks off. Ticks are kept in this browser (lib/checklist.ts).
// Rendered by the server wrapper in ./practice-tools.tsx after zod validation.

interface Group {
  title: string;
  items: { id: string; text: string; href?: string }[];
}

export function PrepChecklistClient({ id, title, groups }: { id: string; title: string; groups: Group[] }) {
  const [done, setDone] = React.useState<ReadonlySet<string>>(new Set());
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  React.useEffect(() => {
    const load = () => setDone(new Set(readTicks(id)));
    load();
    window.addEventListener(CHECKLIST_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(CHECKLIST_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [id]);

  const count = groups.reduce((n, g) => n + g.items.filter((i) => done.has(i.id)).length, 0);

  return (
    <div className="not-prose my-8 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <div className="font-display text-lg leading-snug font-semibold text-ink">{title}</div>
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {count} of {total} done
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hairline" aria-hidden>
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${total ? (count / total) * 100 : 0}%`, backgroundColor: "var(--dg-green)" }}
          />
        </div>
      </div>

      <div className="divide-y divide-hairline">
        {groups.map((group) => (
          <fieldset key={group.title} className="px-4 py-3 sm:px-5">
            <legend className="float-left mb-2 w-full text-sm font-semibold text-ink">
              {group.title}
              <span className="ml-2 font-normal text-muted-foreground tabular-nums">
                {group.items.filter((i) => done.has(i.id)).length}/{group.items.length}
              </span>
            </legend>
            <ul className="clear-both space-y-1.5">
              {group.items.map((item) => {
                const on = done.has(item.id);
                return (
                  <li key={item.id} className="flex items-start gap-2.5">
                    <input
                      id={`${id}-${item.id}`}
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 cursor-pointer accent-[var(--ink)]"
                      checked={on}
                      onChange={() => setDone(new Set(setTick(id, item.id, !on)))}
                    />
                    <label
                      htmlFor={`${id}-${item.id}`}
                      className={cn(
                        "cursor-pointer text-[15px] leading-relaxed",
                        on ? "text-muted-foreground line-through" : "text-ink-2"
                      )}
                    >
                      {item.text}
                    </label>
                    {item.href && (
                      <a href={item.href} className="shrink-0 text-[13px] text-primary underline underline-offset-2">
                        Open
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline bg-paper-2/40 px-4 py-3 sm:px-5">
        <p className="min-w-0 flex-1 basis-56 text-xs text-muted-foreground">Your ticks are kept in this browser.</p>
        <button
          type="button"
          className={buttonClass}
          disabled={count === 0}
          onClick={() => {
            if (window.confirm("Clear every tick on this list?")) clearTicks(id);
          }}
        >
          <RotateCcw aria-hidden className="size-3.5" /> Start over
        </button>
      </div>
    </div>
  );
}
