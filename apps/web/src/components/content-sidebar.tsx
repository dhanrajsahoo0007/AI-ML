"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/icons";
import type {
  NavSection,
  NavGroup,
  NavCategory,
  NavItem,
} from "@/lib/nav-tree";

interface ContentSidebarProps {
  navTree: NavSection[];
  onNavigate?: () => void;
}

export function ContentSidebar({ navTree, onNavigate }: ContentSidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col overflow-y-auto pb-8">
      <div className="space-y-1 px-2 pt-2">
        {navTree.map((section) => (
          <SidebarSection
            key={section.key}
            section={section}
            pathname={pathname}
            onNavigate={onNavigate}
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
}: {
  section: NavSection;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = pathname.startsWith(section.href);
  const [open, setOpen] = React.useState(isActive);

  React.useEffect(() => {
    if (isActive && !open) setOpen(true);
  }, [isActive]);

  const SectionIcon = getIconComponent(section.icon);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-bold tracking-tight transition-all",
          isActive
            ? "bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-md dark:from-gray-100 dark:to-gray-200 dark:text-gray-900"
            : "bg-gradient-to-r from-gray-800/80 to-gray-700/70 text-gray-200 shadow-sm hover:from-gray-800 hover:to-gray-700 hover:text-white dark:from-gray-200/80 dark:to-gray-300/70 dark:text-gray-700 dark:hover:from-gray-200 dark:hover:to-gray-300 dark:hover:text-gray-900"
        )}
      >
        {SectionIcon && (
          <SectionIcon
            className={cn(
              "h-5 w-5 shrink-0",
              isActive
                ? "text-emerald-400 dark:text-emerald-600"
                : "text-gray-400 dark:text-gray-500"
            )}
          />
        )}
        <span className="flex-1 text-left">{section.label}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
        )}
      </button>

      {open && (
        <div className="ml-3 mt-1.5 border-l-2 border-border/40 pl-1">
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
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all",
          isGroupActive
            ? "bg-gradient-to-r from-gray-800/60 to-gray-700/40 text-white shadow-sm dark:from-gray-200/60 dark:to-gray-300/40 dark:text-gray-900"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        {GroupIcon && (
          <GroupIcon
            className={cn(
              "h-[18px] w-[18px] shrink-0",
              isGroupActive ? "text-emerald-400 dark:text-emerald-600" : "text-primary/60"
            )}
          />
        )}
        <span className="flex-1 truncate text-[15px] font-semibold">
          {group.title}
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
        )}
      </button>

      {open && (
        <div className="ml-3 mt-0.5 border-l border-border/30 pl-1.5">
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
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
          hasActive
            ? "bg-primary/5"
            : "hover:bg-muted/40"
        )}
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-200",
            open && "rotate-90",
            hasActive ? "text-primary/70" : "text-muted-foreground/40"
          )}
        />
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-wider",
            hasActive
              ? "text-primary"
              : "text-muted-foreground/70"
          )}
        >
          {category.title}
        </span>
      </button>

      {open && (
        <div className="ml-3 border-l border-border/30 pl-2">
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
      className={cn(
        "group flex items-center gap-2 rounded-md transition-colors",
        size === "group"
          ? "px-2.5 py-2 text-sm"
          : "px-2.5 py-1.5 text-[13px]",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "shrink-0",
            size === "group" ? "h-4 w-4" : "h-3.5 w-3.5",
            active ? "text-primary" : "text-primary/60"
          )}
        />
      ) : (
        <Circle
          className={cn(
            "h-1.5 w-1.5 shrink-0",
            active
              ? "fill-primary text-primary"
              : "fill-muted-foreground/30 text-muted-foreground/30"
          )}
        />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}
