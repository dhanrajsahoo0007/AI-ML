"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchEntries, type SearchEntry } from "./search";

// Header search: a pill in the header (an icon on narrow screens) that opens a dialog searching article headlines.
// The index (/search-index.json, titles only) is fetched the first time the dialog opens, so pages load no extra
// data. ⌘K / Ctrl+K opens it from anywhere; ↑ ↓ move, Enter opens, Escape closes.

let indexPromise: Promise<SearchEntry[]> | null = null;
function loadIndex(): Promise<SearchEntry[]> {
  indexPromise ??= fetch("/search-index.json")
    .then((res) => (res.ok ? (res.json() as Promise<SearchEntry[]>) : []))
    .catch(() => {
      indexPromise = null;
      return [];
    });
  return indexPromise;
}

export function SearchButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseEnter={() => void loadIndex()}
        aria-label={compact ? "Search articles" : undefined}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-hairline text-muted-foreground transition-colors hover:border-ink hover:text-ink",
          compact ? "size-9 justify-center" : "h-9 px-3 text-[13px]"
        )}
      >
        <Search aria-hidden className="size-4" />
        {!compact && (
          <>
            <span className="sr-only 2xl:not-sr-only">Search articles</span>
            <kbd aria-hidden className="hidden rounded border border-hairline px-1.5 font-sans text-[11px] xl:inline">
              ⌘K
            </kbd>
          </>
        )}
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let live = true;
    loadIndex().then((entries) => live && setIndex(entries));
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      live = false;
      document.body.style.overflow = prev;
    };
  }, []);

  const results = useMemo(() => (index ? searchEntries(index, query, 30) : []), [index, query]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = useCallback(
    (entry: SearchEntry | undefined) => {
      if (!entry) return;
      onClose();
      router.push(entry.h);
    },
    [onClose, router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search articles"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/30 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={onKeyDown}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-hairline bg-paper shadow-[0_24px_48px_-24px_rgba(17,17,17,0.55)]">
        <div className="flex items-center gap-3 border-b border-hairline px-4">
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search article titles…"
            aria-label="Search article titles"
            aria-controls="search-results"
            aria-activedescendant={results[active] ? `search-result-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-paper-2 hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {index === null ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
          ) : query.trim() === "" ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Type to search {index.length} articles and pages by title.
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No titles match “{query}”.</p>
          ) : (
            <ul id="search-results" ref={listRef} role="listbox" aria-label="Results" className="py-2">
              {results.map((r, i) => (
                <li
                  key={r.h}
                  id={`search-result-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={cn(
                    "mx-2 flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5",
                    i === active ? "bg-paper-2" : "hover:bg-paper-2/60"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{r.t}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.s}
                      {r.d ? ` · ${r.d}` : ""}
                    </span>
                  </span>
                  {i === active && (
                    <CornerDownLeft aria-hidden className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
