"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/icons";
import type { NavSection, NavGroup, NavCategory } from "@/lib/nav-tree";

interface ContentSidebarProps {
  navTree: NavSection[];
  onNavigate?: () => void;
}

export function ContentSidebar({ navTree, onNavigate }: ContentSidebarProps) {
  const pathname = usePathname();
  // Show only the section being read; fall back to every section on pages outside them.
  const current = navTree.filter(
    (s) => pathname === s.href || pathname.startsWith(`${s.href}/`)
  );
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
  }, [isActive]);

  const SectionIcon = getIconComponent(section.icon);

  return (
    <div>
      <button
        onClick={() => !pinnedOpen && setOpen(!open)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 border-b px-2 py-2.5 text-left font-display text-base transition-colors",
          pinnedOpen && "cursor-default",
          isActive
            ? "border-ink text-ink"
            : "border-hairline text-ink-2 hover:text-ink"
        )}
      >
        {SectionIcon && (
          <SectionIcon
            className={cn(
              "size-4 shrink-0",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        )}
        <span className="flex-1">{section.label}</span>
        {!pinnedOpen && (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              !open && "-rotate-90"
            )}
          />
        )}
      </button>

      {open && (
        <div className="mt-2">
          {section.groups.map((group) => {
            const isSoleGroup = section.groups.length === 1;
            const hasChildren =
              (group.categories && group.categories.length > 0) ||
              (group.items && group.items.length > 0);

            if (isSoleGroup && hasChildren) {
              return (
                <div key={group.slug} className="ml-1 mt-0.5">
                  {group.categories?.map((cat) => (
                    <SidebarCategory
                      key={cat.title}
                      category={cat}
                      pathname={pathname}
                      onNavigate={onNavigate}
                    />
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
              <SidebarGroup
                key={group.slug}
                group={group}
                pathname={pathname}
                onNavigate={onNavigate}
              />
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

function SidebarGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasChildren =
    (group.categories && group.categories.length > 0) ||
    (group.items && group.items.length > 0);
  const isGroupActive = hasChildren
    ? groupContainsPath(group, pathname)
    : pathname === group.href;
  const [open, setOpen] = React.useState(hasChildren ? true : isGroupActive);

  React.useEffect(() => {
    if (isGroupActive && !open) setOpen(true);
  }, [isGroupActive]);

  const GroupIcon = group.icon ? getIconComponent(group.icon) : null;

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
          <GroupIcon
            className={cn(
              "size-4 shrink-0",
              isGroupActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        )}
        <span className="flex-1 truncate text-sm font-semibold">
          {group.title}
        </span>
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
            <SidebarCategory
              key={cat.title}
              category={cat}
              pathname={pathname}
              onNavigate={onNavigate}
            />
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

  React.useEffect(() => {
    if (hasActive && !open) setOpen(true);
  }, [hasActive]);

  return (
    <div className="mt-2 first:mt-0.5">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-90"
          )}
        />
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.08em]",
            hasActive ? "text-primary" : "text-muted-foreground hover:text-ink"
          )}
        >
          {category.title}
        </span>
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
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-ml-px flex items-center gap-2.5 border-l-2 transition-colors",
        size === "group" ? "px-2 py-2 text-sm" : "px-3 py-1.5 text-sm",
        active
          ? "border-primary bg-accent-soft/60 font-medium text-ink"
          : "border-transparent text-muted-foreground hover:border-ink/30 hover:text-ink"
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "size-4 shrink-0",
            active ? "text-primary" : "text-muted-foreground"
          )}
        />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}
