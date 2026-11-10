"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocHeading } from "@/lib/doc-headings";

// Offset from the top of the viewport at which a heading counts as "current" (below the 4rem site header).
const ACTIVE_OFFSET = 120;

// The heading the reader is in: the last one whose top has scrolled above the offset line.
function useActiveHeading(headings: DocHeading[]) {
  const [active, setActive] = React.useState<string | undefined>(headings[0]?.id);

  React.useEffect(() => {
    if (headings.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) return setActive(headings[headings.length - 1].id);
      let current = headings[0].id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET) current = h.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headings]);

  return [active, setActive] as const;
}

function useJump(setActive: (id: string) => void, onJump?: () => void) {
  return (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
    onJump?.();
  };
}

function TocList({
  headings,
  active,
  onJump,
}: {
  headings: DocHeading[];
  active?: string;
  onJump: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  return (
    <ol className="space-y-0.5 border-l border-hairline">
      {headings.map((h) => {
        const isActive = h.id === active;
        return (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => onJump(e, h.id)}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "-ml-px block border-l py-1 text-[13px] leading-snug transition-colors",
                h.level === 3 ? "pl-6" : "pl-3",
                isActive
                  ? "border-tint font-medium text-ink"
                  : "border-transparent text-muted-foreground hover:border-ink/30 hover:text-ink"
              )}
            >
              {h.text}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

// Right-hand "On this page" rail for wide screens. It follows the reader as they scroll.
export function OnThisPage({ headings }: { headings: DocHeading[] }) {
  const [active, setActive] = useActiveHeading(headings);
  const jump = useJump(setActive);
  if (headings.length < 2) return null;
  return (
    <nav aria-label="On this page" className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-6">
      <div className="mb-3 text-sm font-semibold text-ink">On this page</div>
      <TocList headings={headings} active={active} onJump={jump} />
    </nav>
  );
}

// The same outline as a collapsible box above the article, for screens without room for the rail.
export function OnThisPageMobile({ headings }: { headings: DocHeading[] }) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = useActiveHeading(headings);
  const jump = useJump(setActive, () => setOpen(false));
  if (headings.length < 2) return null;
  return (
    <nav aria-label="On this page" className="mb-10 rounded-xl border border-hairline bg-paper-2/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-ink"
      >
        On this page
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <TocList headings={headings} active={active} onJump={jump} />
        </div>
      )}
    </nav>
  );
}
