"use client";

import * as React from "react";
import { pushStory, syncPractice } from "@/lib/practice-sync";
import { STORIES_EVENT, gaps, readStories, withStory, writeStories, type Story } from "@/lib/stories";
import { cn } from "@/lib/utils";

// The story matrix: the reader's stories (written in the story builder) against what interviewers ask about.
// A tick says "this story can answer a question on that". Rows nobody covers are the gaps to fill.
// Rendered by the server wrapper in ./practice-tools.tsx.

interface Signal {
  slug: string;
  title: string;
}

interface View {
  key: string;
  label: string;
  signals: Signal[];
}

export function StoryMatrixClient({ views, builderHref }: { views: View[]; builderHref: string }) {
  const [stories, setStories] = React.useState<Story[] | null>(null);
  const [viewKey, setViewKey] = React.useState(views[0].key);
  const view = views.find((v) => v.key === viewKey) ?? views[0];

  React.useEffect(() => {
    const load = () => setStories(readStories());
    load();
    window.addEventListener(STORIES_EVENT, load);
    window.addEventListener("storage", load);
    void syncPractice();
    return () => {
      window.removeEventListener(STORIES_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const toggle = (story: Story, slug: string) => {
    const covers = story.covers.includes(slug) ? story.covers.filter((s) => s !== slug) : [...story.covers, slug];
    const next: Story = { ...story, covers, updatedAt: new Date().toISOString(), synced: undefined };
    writeStories(withStory(readStories(), next));
    void pushStory(next);
  };

  const missing = stories
    ? gaps(
        stories,
        view.signals.map((s) => s.slug)
      )
    : [];
  const titleOf = (slug: string) => view.signals.find((s) => s.slug === slug)?.title ?? slug;

  return (
    <div className="not-prose my-8 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <div className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Story matrix</div>
        <div role="group" aria-label="What to check your stories against" className="mt-2 flex flex-wrap gap-1.5">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={v.key === view.key}
              onClick={() => setViewKey(v.key)}
              className="rounded-full border border-hairline bg-paper px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {!stories ? (
        <p className="px-4 py-6 text-[15px] text-ink-2 sm:px-5">Loading your stories.</p>
      ) : stories.length === 0 ? (
        <p className="px-4 py-6 text-[15px] text-ink-2 sm:px-5">
          You have no stories yet.{" "}
          <a href={builderHref} className="font-medium text-primary underline underline-offset-2">
            Write your first one in the story builder
          </a>
          , then come back to see what it covers.
        </p>
      ) : (
        <>
          <p className="border-b border-hairline px-4 py-3 text-sm text-ink-2 sm:px-5" aria-live="polite">
            <span className="font-semibold text-ink">
              {view.signals.length - missing.length} of {view.signals.length} covered.
            </span>{" "}
            {missing.length === 0
              ? "Every row has at least one story."
              : `No story yet for: ${missing.map(titleOf).join(", ")}.`}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-paper px-4 py-2 text-left font-semibold text-ink sm:px-5"
                  >
                    {view.label}
                  </th>
                  {stories.map((s, i) => (
                    <th
                      key={s.id}
                      scope="col"
                      title={s.title || "Untitled story"}
                      className="px-2 py-2 text-center font-mono text-xs font-semibold text-ink"
                    >
                      <span aria-hidden>S{i + 1}</span>
                      <span className="sr-only">{s.title || `Story ${i + 1}`}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.signals.map((signal) => {
                  const gap = missing.includes(signal.slug);
                  return (
                    <tr key={signal.slug} className="border-t border-hairline">
                      <th
                        scope="row"
                        className={cn(
                          "sticky left-0 z-10 max-w-48 bg-paper px-4 py-2 text-left font-normal sm:max-w-none sm:px-5",
                          gap ? "text-ink" : "text-ink-2"
                        )}
                      >
                        {signal.title}
                        {gap && (
                          <span
                            className="ml-2 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold"
                            style={{ backgroundColor: "var(--dg-orange-soft)", color: "var(--dg-orange)" }}
                          >
                            gap
                          </span>
                        )}
                      </th>
                      {stories.map((s, i) => (
                        <td key={s.id} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer accent-[var(--ink)]"
                            checked={s.covers.includes(signal.slug)}
                            onChange={() => toggle(s, signal.slug)}
                            aria-label={`${s.title || `Story ${i + 1}`} covers ${signal.title}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ol className="grid gap-x-6 gap-y-1 border-t border-hairline px-4 py-3 text-[13px] text-ink-2 sm:grid-cols-2 sm:px-5">
            {stories.map((s, i) => (
              <li key={s.id} className="min-w-0 truncate">
                <span className="mr-1.5 font-mono text-xs font-semibold text-ink">S{i + 1}</span>
                {s.title || "Untitled story"}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
