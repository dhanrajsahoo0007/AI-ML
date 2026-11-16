// Pure helpers for per-section, per-group and per-category completion counts and percentages. Shared by
// client islands (through lib/completed.client.ts) and server pages (/account, /account/progress).

export interface ProgressStats {
  completed: number;
  total: number;
  /** Integer percentage in [0, 100]. Partial progress clamps to [1, 99] so 0% means untouched and 100% means done. */
  percent: number;
  /** First uncompleted href in reading order, or null when all are complete (or total is 0). */
  nextHref: string | null;
}

export interface ProgressNavItem {
  title: string;
  href: string;
  slug?: string;
}

export interface ProgressNavGroup {
  items?: readonly ProgressNavItem[];
  categories?: readonly { items: readonly ProgressNavItem[] }[];
}

export interface ProgressNavSection {
  groups: readonly ProgressNavGroup[];
}

/** Whether the page at `href` ("/system-design/caching/cdn" or "system-design/caching/cdn") is in `done`. */
export function isCompleted(done: ReadonlySet<string>, href: string): boolean {
  const clean = href.split("#")[0] ?? href;
  return done.has(clean.startsWith("/") ? clean.slice(1) : clean);
}

/** Computes completed count, total, clamped percentage, and next uncompleted href for an ordered list of page hrefs. */
export function computeProgressStats(done: ReadonlySet<string>, hrefs: readonly string[]): ProgressStats {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const h of hrefs) {
    const clean = h.split("#")[0] ?? h;
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    unique.push(clean);
  }
  const total = unique.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0, nextHref: null };

  let completed = 0;
  let nextHref: string | null = null;
  for (const h of unique) {
    if (isCompleted(done, h)) {
      completed += 1;
    } else if (nextHref === null) {
      nextHref = h;
    }
  }

  const percent =
    completed === 0 ? 0 : completed >= total ? 100 : Math.min(99, Math.max(1, Math.round((completed / total) * 100)));

  return { completed, total, percent, nextHref };
}

/** Ordered leaf items of one nav group (categories first, then direct items), deduplicated by href. */
export function groupLeafItems(group: ProgressNavGroup): ProgressNavItem[] {
  const out: ProgressNavItem[] = [];
  const seen = new Set<string>();
  const push = (item: ProgressNavItem) => {
    if (seen.has(item.href)) return;
    seen.add(item.href);
    out.push(item);
  };
  for (const cat of group.categories ?? []) {
    for (const item of cat.items) push(item);
  }
  for (const item of group.items ?? []) push(item);
  return out;
}

/** Ordered leaf items across every group of a section, deduplicated by href. */
export function sectionLeafItems(section: ProgressNavSection): ProgressNavItem[] {
  const out: ProgressNavItem[] = [];
  const seen = new Set<string>();
  for (const group of section.groups) {
    for (const item of groupLeafItems(group)) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      out.push(item);
    }
  }
  return out;
}

/** Ordered leaf page hrefs of one nav group. */
export function groupHrefs(group: ProgressNavGroup): string[] {
  return groupLeafItems(group).map((i) => i.href);
}

/** Ordered leaf page hrefs across an entire section tab. */
export function sectionHrefs(section: ProgressNavSection): string[] {
  return sectionLeafItems(section).map((i) => i.href);
}
