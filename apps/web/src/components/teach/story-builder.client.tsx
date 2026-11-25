"use client";

import * as React from "react";
import { Check, CircleAlert, Plus, Trash2 } from "lucide-react";
import { PART_TONE, buttonClass } from "@/components/practice/answer-timer.client";
import { ANSWER_PARTS, clock } from "@/lib/practice";
import { pushStory, pushStoryDelete, syncPractice, type SyncState } from "@/lib/practice-sync";
import {
  STORIES_EVENT,
  STORY_LIMITS,
  STORY_PARTS,
  emptyStory,
  newStoryId,
  readStories,
  storyChecks,
  storyTiming,
  withStory,
  writeStories,
  type Story,
  type StoryPart,
} from "@/lib/stories";
import { cn } from "@/lib/utils";

// The story builder: the reader writes an interview story in four boxes (situation and task, action, result,
// learning) and sees, as they type, how long it takes to say, how the time is split against the STAR+L budget,
// and what a listener would notice. Stories are kept in this browser (lib/stories.ts) and, signed in, in the
// account (lib/practice-sync.ts). Rendered by the server wrapper in ./story-builder.tsx.

interface Signal {
  slug: string;
  title: string;
}

const PART_HELP: Record<StoryPart, { label: string; placeholder: string }> = {
  situation: {
    label: "Situation and task",
    placeholder: "The system, what was at risk, and what you were responsible for. Two or three sentences.",
  },
  action: {
    label: "Action",
    placeholder: "What you did, step by step, and why you chose it. Say I, not we.",
  },
  result: { label: "Result", placeholder: "What changed, with a number. What stayed safe." },
  learning: { label: "Learning", placeholder: "What you learned, and what you do differently now." },
};

const SAVE_DELAY_MS = 500;
const SYNC_DELAY_MS = 2500;
const inputClass =
  "block w-full rounded-md border border-hairline bg-paper px-3 py-2 text-[15px] leading-relaxed text-ink placeholder:text-muted-foreground/70 focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-ring";

export function StoryBuilderClient({ competencies }: { competencies: Signal[] }) {
  const [stories, setStories] = React.useState<Story[] | null>(null);
  const [draft, setDraft] = React.useState<Story | null>(null);
  const [where, setWhere] = React.useState<SyncState>("browser");
  const [stored, setStored] = React.useState(true);
  const dirty = React.useRef(false);
  const latest = React.useRef<Story | null>(null);
  latest.current = draft;

  // Writes the open story to the browser now (if it changed) and schedules its copy to the account.
  const syncTimer = React.useRef<number | undefined>(undefined);
  const flush = React.useCallback(() => {
    const story = latest.current;
    if (!story || !dirty.current) return;
    dirty.current = false;
    setStored(writeStories(withStory(readStories(), story)));
    window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => void pushStory(story).then(setWhere), SYNC_DELAY_MS);
  }, []);

  // Load this browser's stories, then merge with the account's (a no-op signed out).
  React.useEffect(() => {
    const load = (keepDraft: boolean) => {
      const list = readStories();
      setStories(list);
      setDraft((current) => {
        if (keepDraft && current && (dirty.current || list.some((s) => s.id === current.id))) {
          return dirty.current ? current : (list.find((s) => s.id === current.id) ?? current);
        }
        return list[0] ?? null;
      });
    };
    load(false);
    const changed = () => load(true);
    window.addEventListener(STORIES_EVENT, changed);
    window.addEventListener("storage", changed);
    window.addEventListener("pagehide", flush);
    void syncPractice().then(setWhere);
    return () => {
      window.removeEventListener(STORIES_EVENT, changed);
      window.removeEventListener("storage", changed);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  // Save a little after the reader stops typing.
  React.useEffect(() => {
    if (!dirty.current) return;
    const timer = window.setTimeout(flush, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, flush]);

  const edit = (change: Partial<Story>) => {
    dirty.current = true;
    setDraft((s) => (s ? { ...s, ...change, updatedAt: new Date().toISOString(), synced: undefined } : s));
  };

  const start = () => {
    flush();
    // A link from an article can name what the story is for: /…/story-builder?for=conflict
    const wanted = new URLSearchParams(window.location.search).get("for");
    const story = emptyStory(newStoryId(Math.random), new Date());
    if (wanted && competencies.some((c) => c.slug === wanted)) story.covers = [wanted];
    dirty.current = true;
    setDraft(story);
    setStories((list) => withStory(list ?? [], story));
  };

  const open = (id: string) => {
    flush();
    setDraft(readStories().find((s) => s.id === id) ?? null);
  };

  const remove = () => {
    if (!draft) return;
    if (!window.confirm(`Delete "${draft.title || "Untitled story"}"? This cannot be undone.`)) return;
    dirty.current = false;
    window.clearTimeout(syncTimer.current);
    const rest = readStories().filter((s) => s.id !== draft.id);
    writeStories(rest);
    void pushStoryDelete(draft.id);
    setDraft(rest[0] ?? null);
  };

  const full = (stories?.length ?? 0) >= STORY_LIMITS.stories;
  const timing = draft ? storyTiming(draft) : null;
  const checks = draft ? storyChecks(draft) : [];

  return (
    <div className="not-prose my-8 overflow-hidden rounded-xl border border-hairline bg-paper" data-story-builder>
      <div className="flex flex-wrap items-end gap-3 border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1 basis-56">
          <label
            htmlFor="story-pick"
            className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
          >
            Your stories{stories ? ` · ${stories.length} of ${STORY_LIMITS.stories}` : ""}
          </label>
          <select
            id="story-pick"
            className={cn(inputClass, "mt-1 py-1.5")}
            value={draft?.id ?? ""}
            onChange={(e) => open(e.target.value)}
            disabled={!stories?.length}
          >
            {!stories?.length && <option value="">No stories yet</option>}
            {stories?.map((s) => (
              <option key={s.id} value={s.id}>
                {(s.id === draft?.id ? draft.title : s.title) || "Untitled story"}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className={buttonClass} onClick={start} disabled={!stories || full}>
          <Plus aria-hidden className="size-3.5" /> New story
        </button>
      </div>

      {!draft ? (
        <p className="px-4 py-6 text-[15px] text-ink-2 sm:px-5">
          {stories
            ? "Start with the project you would most like to be asked about. Press New story."
            : "Loading your stories."}
        </p>
      ) : (
        <div className="space-y-5 px-4 py-4 sm:px-5">
          <div>
            <label htmlFor="story-title" className="text-sm font-semibold text-ink">
              Title
            </label>
            <input
              id="story-title"
              className={cn(inputClass, "mt-1")}
              value={draft.title}
              maxLength={STORY_LIMITS.title}
              placeholder="A short name you will recognise, e.g. Checkout latency migration"
              onChange={(e) => edit({ title: e.target.value })}
              onBlur={flush}
            />
          </div>

          {STORY_PARTS.map((part) => {
            const t = timing!.parts.find((p) => p.part === part)!;
            return (
              <div key={part}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <label htmlFor={`story-${part}`} className="text-sm font-semibold text-ink">
                    <span
                      aria-hidden
                      className="mr-2 inline-block size-2.5 rounded-full align-baseline"
                      style={{ backgroundColor: PART_TONE[part] }}
                    />
                    {PART_HELP[part].label}
                  </label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t.words} words · {clock(t.seconds)}
                    {timing!.words > 0 && ` · ${Math.round(t.share * 100)}% (aim for ${Math.round(t.target * 100)}%)`}
                  </span>
                </div>
                <textarea
                  id={`story-${part}`}
                  className={cn(inputClass, "mt-1 resize-y")}
                  rows={part === "action" ? 7 : 3}
                  value={draft[part]}
                  maxLength={STORY_LIMITS.part[part]}
                  placeholder={PART_HELP[part].placeholder}
                  onChange={(e) => edit({ [part]: e.target.value })}
                  onBlur={flush}
                />
              </div>
            );
          })}

          <div aria-label="How your speaking time is split">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-semibold text-ink">Speaking time</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {timing!.words} words · about {clock(timing!.seconds)} at a steady pace
              </p>
            </div>
            <div className="mt-2 grid grid-cols-[3.5rem_1fr] items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span>Yours</span>
              <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-hairline" aria-hidden>
                {timing!.parts.map((p) => (
                  <div key={p.part} style={{ flexGrow: p.share, flexBasis: 0, backgroundColor: PART_TONE[p.part] }} />
                ))}
              </div>
              <span>Target</span>
              <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                {ANSWER_PARTS.map((p) => (
                  <div
                    key={p.key}
                    className="opacity-50"
                    style={{ flexGrow: p.share, flexBasis: 0, backgroundColor: PART_TONE[p.key] }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink">What a listener would notice</p>
            {checks.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Write about 40 words and the checks appear here.</p>
            ) : (
              <ul className="mt-2 space-y-1.5" aria-live="polite">
                {checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm text-ink-2">
                    {c.ok ? (
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0" style={{ color: "var(--dg-green)" }} />
                    ) : (
                      <CircleAlert
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0"
                        style={{ color: "var(--dg-orange)" }}
                      />
                    )}
                    <span>
                      <span className="sr-only">{c.ok ? "Good: " : "To fix: "}</span>
                      {c.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Questions this story can answer</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {competencies.map((c) => {
                const on = draft.covers.includes(c.slug);
                return (
                  <label
                    key={c.slug}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1 text-[13px] transition-colors",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                      on ? "border-ink bg-ink text-paper" : "border-hairline bg-paper text-ink-2 hover:border-ink/40"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => {
                        edit({ covers: on ? draft.covers.filter((s) => s !== c.slug) : [...draft.covers, c.slug] });
                      }}
                    />
                    {c.title}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline bg-paper-2/40 px-4 py-3 sm:px-5">
        <p className="min-w-0 flex-1 basis-56 text-xs text-muted-foreground" role="status">
          {!stored
            ? "This browser refused to store the story. Keep the tab open, or free some site storage."
            : where === "account"
              ? "Saved as you type, in this browser and in your account."
              : "Saved as you type, in this browser only."}
        </p>
        {draft && (
          <button type="button" className={buttonClass} onClick={remove}>
            <Trash2 aria-hidden className="size-3.5" /> Delete story
          </button>
        )}
      </div>
    </div>
  );
}
