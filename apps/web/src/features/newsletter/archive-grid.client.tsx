"use client";

import { useState, type ReactNode } from "react";
import { Chip } from "@/components/ui/editorial";

// The archive's tag filter and list (plan §3): the filter sits on top, then one large card per issue. Every card is
// rendered on the server; this island only hides the ones that don't match. Without JavaScript all issues show.

export interface ArchiveItem {
  slug: string;
  tags: string[];
  card: ReactNode;
}

export function ArchiveGrid({ items, tags }: { items: ArchiveItem[]; tags: { key: string; label: string }[] }) {
  const [tag, setTag] = useState<string | null>(null);
  const shown = tag ? items.filter((i) => i.tags.includes(tag)) : items;
  return (
    <div>
      {tags.length > 1 && (
        <div role="group" aria-label="Filter by topic" className="mb-8 flex flex-wrap gap-2">
          <Chip active={tag === null} onClick={() => setTag(null)} aria-pressed={tag === null}>
            All
          </Chip>
          {tags.map((t) => (
            <Chip key={t.key} active={tag === t.key} onClick={() => setTag(t.key)} aria-pressed={tag === t.key}>
              {t.label}
            </Chip>
          ))}
        </div>
      )}
      <ul className="grid gap-8">
        {shown.map((i) => (
          <li key={i.slug}>{i.card}</li>
        ))}
      </ul>
      <p aria-live="polite" className="sr-only">
        {shown.length === 1 ? "1 issue shown" : `${shown.length} issues shown`}
      </p>
    </div>
  );
}
