"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronRight, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/icons";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/theme";
import { ProfileMenu } from "@/components/profile-menu";
import { CompanyLogo } from "@/components/company-logo";
import { NAV_GROUP_LABELS, SUBSCRIBE_KIND } from "@/features/sections/public";
import type { NavGroupName } from "@/features/sections/schema";
import type { NavGroup, NavSection } from "@/lib/nav-tree";

// Header mega-menu: one trigger per nav group (Learn, Practice, More) from content/sections.yaml.
// A group's panel lists its sections on the left; hovering one shows that section's groups and pages.

const GROUP_ORDER: NavGroupName[] = ["learn", "practice", "more"];

interface MenuGroup {
  name: NavGroupName;
  label: string;
  sections: NavSection[];
  extras: { href: string; label: string }[];
}

const isUnder = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function menuGroups(navTree: NavSection[]): MenuGroup[] {
  return GROUP_ORDER.map((name) => ({
    name,
    label: NAV_GROUP_LABELS[name],
    sections: navTree.filter((s) => s.navGroup === name),
    extras: siteConfig.extraNav.filter((e) => e.navGroup === name),
  })).filter((g) => g.sections.length + g.extras.length > 0);
}

export function SiteHeader({ navTree }: { navTree: NavSection[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openName, setOpenName] = useState<NavGroupName | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const groups = menuGroups(navTree);
  const openGroup = groups.find((g) => g.name === openName);
  const subscribe = navTree.find((s) => s.kind === SUBSCRIBE_KIND && !s.comingSoon);

  const open = (name: NavGroupName) => {
    clearTimeout(closeTimer.current);
    if (name === openName) return;
    const group = groups.find((g) => g.name === name);
    const current = group?.sections.find((s) => isUnder(pathname, s.href));
    setOpenName(name);
    setActiveSection((current ?? group?.sections.find((s) => !s.comingSoon) ?? group?.sections[0])?.key ?? null);
  };
  // A short delay on leave stops the panel flickering while the pointer crosses gaps.
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenName(null), 150);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Close the panel on navigation, Escape, or a click outside the header.
  useEffect(() => setOpenName(null), [pathname]);
  useEffect(() => {
    if (!openName) return;
    const onPointer = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpenName(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenName(null);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openName]);

  return (
    <header
      ref={headerRef}
      onMouseLeave={closeSoon}
      onMouseEnter={() => clearTimeout(closeTimer.current)}
      className="sticky top-0 z-40 w-full border-b border-hairline/80 bg-paper"
    >
      <nav className="flex h-16 w-full items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-3">
          <span className="font-display text-xl whitespace-nowrap sm:text-2xl">{siteConfig.name}</span>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground 2xl:inline">
            {siteConfig.tagline}
          </span>
        </Link>

        <div className="relative hidden flex-1 items-center justify-center gap-6 self-stretch lg:flex xl:gap-9">
          {groups.map((group) => {
            const isActive =
              group.sections.some((s) => isUnder(pathname, s.href)) ||
              group.extras.some((e) => isUnder(pathname, e.href));
            const itemClass = cn(
              "relative inline-flex items-center gap-1 whitespace-nowrap py-1 text-sm transition-colors",
              isActive || openName === group.name
                ? "text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-ink"
                : "text-muted-foreground hover:text-ink"
            );
            // A group that is only one plain link (e.g. More → Pricing) needs no panel.
            if (group.sections.length === 0 && group.extras.length === 1) {
              const only = group.extras[0];
              return (
                <Link
                  key={group.name}
                  href={only.href}
                  aria-current={isActive ? "page" : undefined}
                  onMouseEnter={() => setOpenName(null)}
                  className={itemClass}
                >
                  {only.label}
                </Link>
              );
            }
            return (
              <button
                key={group.name}
                onMouseEnter={() => open(group.name)}
                onFocus={() => open(group.name)}
                // Hover already opened it, so a pointer click keeps it open; Enter/Space (detail 0) toggles.
                onClick={(e) => (e.detail === 0 && openName === group.name ? setOpenName(null) : open(group.name))}
                aria-expanded={openName === group.name}
                aria-haspopup="true"
                className={itemClass}
              >
                {group.label}
                <ChevronDown
                  className={cn("size-3.5 transition-transform duration-200", openName === group.name && "rotate-180")}
                />
              </button>
            );
          })}

          {openGroup && (
            <MegaPanel
              group={openGroup}
              activeKey={activeSection}
              onActivate={setActiveSection}
              pathname={pathname}
            />
          )}
        </div>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          {subscribe && (
            <Link
              href={subscribe.href}
              className="hidden rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink xl:inline-flex"
            >
              Subscribe
            </Link>
          )}
          <Link
            href={siteConfig.hero.primaryCta.href}
            className="hidden rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-primary xl:inline-flex"
          >
            Start learning
          </Link>
          <ProfileMenu />
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <ProfileMenu />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-paper-2"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto bg-paper">
              <SheetHeader>
                <SheetTitle className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Menu
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-4 pb-8">
                <MobileLink href="/" label="Home" active={pathname === "/"} onNavigate={() => setMenuOpen(false)} />
                {groups.map((group) => (
                  <div key={group.name}>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      {group.sections.map((s) =>
                        s.comingSoon ? (
                          <span key={s.key} className="font-display text-2xl text-muted-foreground/70">
                            {s.label} <SoonBadge />
                          </span>
                        ) : (
                          <MobileLink
                            key={s.key}
                            href={s.href}
                            label={s.label}
                            active={isUnder(pathname, s.href)}
                            onNavigate={() => setMenuOpen(false)}
                          />
                        )
                      )}
                      {group.extras.map((e) => (
                        <MobileLink
                          key={e.href}
                          href={e.href}
                          label={e.label}
                          active={isUnder(pathname, e.href)}
                          onNavigate={() => setMenuOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {subscribe && (
                  <Link
                    href={subscribe.href}
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex w-fit rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper"
                  >
                    Subscribe
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

function MobileLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn("font-display text-2xl transition-colors", active ? "text-ink" : "text-muted-foreground hover:text-ink")}
    >
      {label}
    </Link>
  );
}

function SoonBadge() {
  return (
    <span className="ml-1 rounded-full border border-hairline px-2 py-0.5 align-middle font-sans text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
      Soon
    </span>
  );
}

function MegaPanel({
  group,
  activeKey,
  onActivate,
  pathname,
}: {
  group: MenuGroup;
  activeKey: string | null;
  onActivate: (key: string) => void;
  pathname: string;
}) {
  const section = group.sections.find((s) => s.key === activeKey) ?? group.sections[0];
  return (
    <div className="absolute left-1/2 top-full z-50 w-[64rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-hairline bg-paper shadow-[0_24px_48px_-24px_rgba(17,17,17,0.45)]">
      <div className="grid max-h-[calc(100vh-6rem)] grid-cols-[14rem_1fr]">
        <ul className="space-y-0.5 overflow-y-auto border-r border-hairline bg-paper-2/60 p-3">
          {group.sections.map((s) => {
            const Icon = getIconComponent(s.icon);
            const active = s.key === section?.key;
            const className = cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
              active ? "bg-paper font-medium text-ink shadow-sm" : "text-ink-2 hover:text-ink",
              s.comingSoon && "text-muted-foreground"
            );
            const content = (
              <>
                {Icon && <Icon aria-hidden className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />}
                <span className="flex-1 truncate">{s.label}</span>
                {s.comingSoon ? <SoonBadge /> : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
              </>
            );
            return (
              <li key={s.key}>
                {s.comingSoon ? (
                  <span
                    tabIndex={0}
                    onMouseEnter={() => onActivate(s.key)}
                    onFocus={() => onActivate(s.key)}
                    className={className}
                  >
                    {content}
                  </span>
                ) : (
                  <Link
                    href={s.href}
                    aria-current={isUnder(pathname, s.href) ? "page" : undefined}
                    onMouseEnter={() => onActivate(s.key)}
                    onFocus={() => onActivate(s.key)}
                    className={className}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
          {group.extras.length > 0 && (
            <li className="mt-2 border-t border-hairline pt-2">
              {group.extras.map((e) => (
                <Link key={e.href} href={e.href} className="block rounded-md px-3 py-2 text-sm text-ink-2 hover:text-ink">
                  {e.label}
                </Link>
              ))}
            </li>
          )}
        </ul>
        <div className="min-w-0 overflow-y-auto px-6 py-5">{section && <SectionPanel key={section.key} section={section} />}</div>
      </div>
    </div>
  );
}

function SectionPanel({ section }: { section: NavSection }) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const shownGroup = section.groups.find((g) => g.slug === activeGroup) ?? section.groups[0];

  if (section.comingSoon) {
    return (
      <div>
        <p className="font-display text-xl text-ink">{section.label}</p>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-hairline pb-3">
        <p className="font-display text-xl text-ink">{section.label}</p>
        <Link href={section.href} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          View all <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      {section.kind === "directory" ? (
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {section.groups
            .flatMap((g) => g.items ?? [])
            .map((c) => (
              <li key={c.slug}>
                <Link
                  href={c.href}
                  className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2.5 text-sm text-ink-2 transition-colors hover:border-ink hover:bg-paper-2 hover:text-ink"
                >
                  <CompanyLogo company={{ slug: c.slug, name: c.title }} className="size-6 shrink-0 text-[9px]" />
                  <span className="truncate">{c.title}</span>
                </Link>
              </li>
            ))}
        </ul>
      ) : section.groups.length > 0 ? (
        <div className="grid grid-cols-[13rem_1fr] gap-8">
          <ul className="space-y-0.5 border-r border-hairline pr-4">
            {section.groups.map((group) => {
              const active = group.slug === shownGroup?.slug;
              return (
                <li key={group.slug}>
                  <Link
                    href={group.href}
                    onMouseEnter={() => setActiveGroup(group.slug)}
                    onFocus={() => setActiveGroup(group.slug)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      active ? "bg-paper-2 font-medium text-ink" : "text-ink-2 hover:text-ink"
                    )}
                  >
                    <span className="truncate">{group.title}</span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {shownGroup && <MegaGroup key={shownGroup.slug} group={shownGroup} />}
        </div>
      ) : null}
    </div>
  );
}

function MegaGroup({ group }: { group: NavGroup }) {
  const sections = group.categories ?? (group.items ? [{ title: "", items: group.items }] : []);
  return (
    <div className="min-w-0">
      <Link href={group.href} className="mb-3 block truncate text-sm font-semibold text-ink hover:text-primary">
        {group.title} &rarr;
      </Link>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        {sections.map((cat) => (
          <div key={cat.title}>
            {cat.title && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{cat.title}</p>
            )}
            <ul className="mt-1 space-y-0.5">
              {cat.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block truncate py-0.5 text-sm text-ink-2 transition-colors hover:text-primary"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
