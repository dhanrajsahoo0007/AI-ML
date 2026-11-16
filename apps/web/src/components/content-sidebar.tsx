"use client";

import * as React from "react";
import Link from "next/link";
import { useCanonicalPathname } from "@/lib/use-canonical-pathname";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/icons";
import { groupHrefs, isCompleted, sectionHrefs, useCompletedPages, useProgressStats } from "@/lib/completed.client";
import type { NavSection, NavGroup, NavCategory } from "@/lib/nav-tree";

interface ContentSidebarProps {
  navTree: NavSection[];
  onNavigate?: () => void;
}

export function ContentSidebar({ navTree, onNavigate }: ContentSidebarProps) {
  const pathname = useCanonicalPathname();
  // Show only the section being read; fall back to every section on pages outside them.
  const current = navTree.filter((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  const sections = current.length ? current : navTree;

  return (
    <nav className="flex h-full flex-col overflow-y-auto pb-8">
      <div className="space-y-4 px-3 pt-3">
        {sections.map((section) => (
          <SidebarSection
            key={section.key}
            section={section}
            pathname={pathname}
            onNavigate={onNavigate}
            pinnedOpen={sections.length === 1}
          />
        ))}
      </div>
    </nav>
  );
}

function SidebarSection({
  section,
  pathname,
  onNavigate,
  pinnedOpen,
}: {
  section: NavSection;
  pathname: string;
  onNavigate?: () => void;
  pinnedOpen?: boolean;
}) {
  const isActive = pathname.startsWith(section.href);
  const [openState, setOpen] = React.useState(isActive);
  const open = pinnedOpen || openState;

  React.useEffect(() => {
    if (isActive && !open) setOpen(true);
    // Runs only when the path becomes active: depending on `open` would reopen a section the reader just closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const SectionIcon = getIconComponent(section.icon);
  const allHrefs = React.useMemo(() => sectionHrefs(section), [section]);
  const stats = useProgressStats(allHrefs);

  return (
    <div>
      <button
        onClick={() => !pinnedOpen && setOpen(!open)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 border-b px-2 py-2.5 text-left font-display text-base transition-colors",
          pinnedOpen && "cursor-default",
          isActive ? "border-ink text-ink" : "border-hairline text-ink-2 hover:text-ink"
        )}
      >
        {SectionIcon && (
          <SectionIcon className={cn("size-4 shrink-0", isActive ? "text-tint" : "text-muted-foreground")} />
        )}
        <span className="flex-1">{section.label}</span>
        {stats.completed > 0 && (
          <span
            className="shrink-0 font-sans text-xs font-medium tabular-nums text-muted-foreground"
            data-testid={`sidebar-section-percent-${section.key}`}
          >
            {stats.percent}%
          </span>
        )}
        {!pinnedOpen && (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              !open && "-rotate-90"
            )}
          />
        )}
      </button>

      {open && stats.completed > 0 && (
        <div className="mt-2.5 mb-2 rounded-lg bg-paper px-2.5 py-2" data-testid={`sidebar-progress-${section.key}`}>
          <div className="flex items-baseline justify-between gap-2 text-[11px] tabular-nums">
            <span className="font-semibold text-ink">{stats.percent}% completed</span>
            <span className="text-muted-foreground">
              {stats.completed} / {stats.total} read
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${section.label} progress`}
            aria-valuenow={stats.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-2"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                stats.percent === 100 ? "bg-success" : "bg-tint"
              )}
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      )}

      {open && (
        <div className="mt-2">
          {section.groups.map((group, groupIndex) => {
            const isSoleGroup = section.groups.length === 1;
            // An area label (Interview Practice: LLM, GenAI, System Design) above the first group that carries it.
            const heading =
              group.heading && group.heading !== section.groups[groupIndex - 1]?.heading ? group.heading : undefined;
            const hasChildren =
              (group.categories && group.categories.length > 0) || (group.items && group.items.length > 0);

            if (isSoleGroup && hasChildren) {
              return (
                <div key={group.slug} className="ml-1 mt-0.5">
                  {group.categories?.map((cat) => (
                    <SidebarCategory key={cat.title} category={cat} pathname={pathname} onNavigate={onNavigate} />
                  ))}
                  {group.items?.map((item) => (
                    <NavLink
                      key={item.slug}
                      href={item.href}
                      label={item.title}
                      active={pathname === item.href}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              );
            }

            return (
              <React.Fragment key={group.slug}>
                {heading && (
                  <p className="mt-4 mb-1 border-t border-hairline px-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground first:mt-0 first:border-t-0 first:pt-1">
                    {heading}
                  </p>
                )}
                <SidebarGroup group={group} pathname={pathname} onNavigate={onNavigate} />
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupContainsPath(group: NavGroup, pathname: string): boolean {
  if (group.categories) {
    for (const cat of group.categories) {
      if (cat.items.some((i) => pathname === i.href)) return true;
    }
  }
  if (group.items) {
    if (group.items.some((i) => pathname === i.href)) return true;
  }
  return false;
}

function SidebarGroup({ group, pathname, onNavigate }: { group: NavGroup; pathname: string; onNavigate?: () => void }) {
  const hasChildren = (group.categories && group.categories.length > 0) || (group.items && group.items.length > 0);
  const isGroupActive = hasChildren ? groupContainsPath(group, pathname) : pathname === group.href;
  const [open, setOpen] = React.useState(hasChildren ? true : isGroupActive);

  React.useEffect(() => {
    if (isGroupActive && !open) setOpen(true);
    // Runs only when the path becomes active: depending on `open` would reopen a section the reader just closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGroupActive]);

  const GroupIcon = group.icon ? getIconComponent(group.icon) : null;
  const leafHrefs = React.useMemo(() => groupHrefs(group), [group]);
  const stats = useProgressStats(leafHrefs);

  if (!hasChildren) {
    return (
      <NavLink
        href={group.href}
        label={group.title}
        icon={GroupIcon}
        active={pathname === group.href}
        onNavigate={onNavigate}
        size="group"
      />
    );
  }

  return (
    <div className="my-1">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
          isGroupActive ? "text-ink" : "text-ink-2 hover:text-ink"
        )}
      >
        {GroupIcon && (
          <GroupIcon className={cn("size-4 shrink-0", isGroupActive ? "text-tint" : "text-muted-foreground")} />
        )}
        <span className="flex-1 truncate text-sm font-semibold">{group.title}</span>
        {stats.completed > 0 && (
          <span
            className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
            aria-label={`${stats.completed} of ${stats.total} read`}
          >
            {stats.completed}/{stats.total}
          </span>
        )}
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>

      {open && (
        <div className="ml-4 border-l border-hairline">
          {group.categories?.map((cat) => (
            <SidebarCategory key={cat.title} category={cat} pathname={pathname} onNavigate={onNavigate} />
          ))}
          {group.items?.map((item) => (
            <NavLink
              key={item.slug}
              href={item.href}
              label={item.title}
              active={pathname === item.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarCategory({
  category,
  pathname,
  onNavigate,
}: {
  category: NavCategory;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasActive = category.items.some((i) => pathname === i.href);
  const [open, setOpen] = React.useState(hasActive);
  const done = useCompletedPages();
  const read = category.items.filter((i) => isCompleted(done, i.href)).length;
  const CategoryIcon = category.icon ? getIconComponent(category.icon) : null;

  React.useEffect(() => {
    if (hasActive && !open) setOpen(true);
    // Runs only when the path becomes active: depending on `open` would reopen a section the reader just closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActive]);

  return (
    <div className="mt-2 first:mt-0.5">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
      >
        <ChevronRight
          className={cn("size-3 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-90")}
        />
        {CategoryIcon && (
          <CategoryIcon
            aria-hidden
            className={cn("size-3.5 shrink-0", hasActive ? "text-tint" : "text-muted-foreground/80")}
          />
        )}
        <span
          className={cn(
            "flex-1 text-xs font-semibold uppercase tracking-[0.08em]",
            hasActive ? "text-ink" : "text-muted-foreground hover:text-ink"
          )}
        >
          {category.title}
        </span>
        {read > 0 && (
          <span
            className="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground"
            aria-label={`${read} of ${category.items.length} read`}
          >
            {read === category.items.length && <Check aria-hidden className="size-3 text-success" />}
            {read}/{category.items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="ml-4 border-l border-hairline">
          {category.items.map((item) => (
            <NavLink
              key={item.slug}
              href={item.href}
              label={item.title}
              active={pathname === item.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  size = "item",
}: {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }> | null;
  active: boolean;
  onNavigate?: () => void;
  size?: "group" | "item";
}) {
  const done = isCompleted(useCompletedPages(), href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-ml-px flex items-center gap-2.5 border-l-2 transition-colors",
        size === "group" ? "px-2 py-2 text-sm" : "px-3 py-1.5 text-sm",
        active
          ? "border-tint bg-tint-soft/70 font-medium text-ink"
          : "border-transparent text-muted-foreground hover:border-ink/30 hover:text-ink"
      )}
    >
      {Icon && <Icon className={cn("size-4 shrink-0", active ? "text-tint" : "text-muted-foreground")} />}
      <span className="truncate">{label}</span>
      {done && (
        <>
          <Check aria-hidden className="ml-auto size-3.5 shrink-0 text-success" />
          <span className="sr-only">(read)</span>
        </>
      )}
    </Link>
  );
}
