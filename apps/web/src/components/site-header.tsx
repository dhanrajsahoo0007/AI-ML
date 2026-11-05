"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/theme";
import { ProfileMenu } from "@/components/profile-menu";
import { CompanyLogo } from "@/components/company-logo";
import type { NavGroup, NavSection } from "@/lib/nav-tree";

export function SiteHeader({ navTree }: { navTree: NavSection[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openHref, setOpenHref] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const openSection = navTree.find((s) => s.href === openHref);
  const shownGroup =
    openSection?.groups.find((g) => g.slug === activeGroup) ?? openSection?.groups[0];

  // Hover opens a section's panel; a short delay on leave stops it flickering while the pointer crosses gaps.
  const openOnHover = (href: string) => {
    clearTimeout(closeTimer.current);
    if (href !== openHref) {
      setOpenHref(href);
      setActiveGroup(null);
    }
  };
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenHref(null), 150);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Close the panel on navigation, Escape, or a click outside the header.
  useEffect(() => setOpenHref(null), [pathname]);
  useEffect(() => {
    if (!openHref) return;
    const onPointer = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpenHref(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenHref(null);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openHref]);

  return (
    <header ref={headerRef} onMouseLeave={closeSoon} onMouseEnter={() => clearTimeout(closeTimer.current)} className="sticky top-0 z-40 w-full border-b border-hairline/80 bg-paper">
      <nav className="flex h-16 w-full items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-3">
          <span className="font-display text-xl whitespace-nowrap sm:text-2xl">
            {siteConfig.name}
          </span>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground 2xl:inline">
            {siteConfig.tagline}
          </span>
        </Link>

        <div className="relative hidden flex-1 items-center justify-center gap-3 self-stretch lg:flex xl:gap-7">
          {siteConfig.nav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const section = navTree.find((s) => s.href === item.href);
            const hasSub = !!section && section.groups.length > 0;
            const itemClass = cn(
              "relative inline-flex items-center gap-1 whitespace-nowrap py-1 text-[13px] transition-colors xl:text-sm",
              isActive || openHref === item.href
                ? "text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-ink"
                : "text-muted-foreground hover:text-ink"
            );
            if (!hasSub) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onMouseEnter={() => setOpenHref(null)}
                  className={itemClass}
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.href}
                onMouseEnter={() => openOnHover(item.href)}
                onClick={() => {
                  setActiveGroup(null);
                  setOpenHref(openHref === item.href ? null : item.href);
                }}
                aria-expanded={openHref === item.href}
                aria-haspopup="true"
                className={itemClass}
              >
                {item.label}
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    openHref === item.href && "rotate-180"
                  )}
                />
              </button>
            );
          })}

      {openSection && (
        <div className="absolute left-1/2 top-full z-50 w-[52rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-hairline bg-paper shadow-[0_24px_48px_-24px_rgba(17,17,17,0.45)]">
          <div className="max-h-[calc(100vh-6rem)] overflow-y-auto px-6 py-5">
            <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-hairline pb-3">
              <p className="font-display text-xl text-ink">{openSection.label}</p>
              <Link
                href={openSection.href}
                className="text-sm text-primary hover:underline"
              >
                View all {openSection.label} &rarr;
              </Link>
            </div>
            {openSection.key === "companies" ? (
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                {openSection.groups
                  .flatMap((g) => g.items ?? [])
                  .map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={c.href}
                        className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2.5 text-sm text-ink-2 transition-colors hover:border-ink hover:bg-paper-2 hover:text-ink"
                      >
                        <CompanyLogo
                          company={{ slug: c.slug, name: c.title }}
                          className="size-6 shrink-0 text-[9px]"
                        />
                        <span className="truncate">{c.title}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            ) : (
            <div className="grid grid-cols-[14rem_1fr] gap-8">
              <ul className="space-y-0.5 border-r border-hairline pr-4">
                {openSection.groups.map((group) => {
                  const active = group.slug === shownGroup?.slug;
                  return (
                    <li key={group.slug}>
                      <Link
                        href={group.href}
                        onMouseEnter={() => setActiveGroup(group.slug)}
                        onFocus={() => setActiveGroup(group.slug)}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-paper-2 font-medium text-ink"
                            : "text-ink-2 hover:text-ink"
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
            )}
          </div>
        </div>
      )}
        </div>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <ThemeToggle />
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
            <SheetContent side="right" className="w-80 bg-paper">
              <SheetHeader>
                <SheetTitle className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Menu
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4">
                {[{ href: "/", label: "Home" }, ...siteConfig.nav].map(
                  (item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "font-display text-3xl transition-colors",
                          isActive
                            ? "text-ink"
                            : "text-muted-foreground hover:text-ink"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  }
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

    </header>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {cat.title}
            </p>
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
