"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCanonicalPathname } from "@/features/paywall/use-canonical-pathname";
import { ArrowRight, ChevronDown, Menu } from "lucide-react";
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
import { SearchButton } from "@/features/search/search-dialog.client";
import { SUBSCRIBE_KIND } from "@/features/sections/public";
import type { HeaderNavSection } from "@/features/sections/public";

// Header: every visible section from content/sections.yaml is its own item in the top bar (in registry order),
// followed by the extra links (Pricing). Hovering or focusing a section opens a panel with that section's
// subcategories (its first-level groups). The header is on every page, so it gets only that slim list
// (HeaderNavSection); each article list lives in its own section's sidebar.

const isUnder = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function SiteHeader({ navTree }: { navTree: HeaderNavSection[] }) {
  const pathname = useCanonicalPathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const extras = siteConfig.extraNav;
  const openSection = navTree.find((s) => s.key === openKey);
  const subscribe = navTree.find((s) => s.kind === SUBSCRIBE_KIND && !s.comingSoon);

  const open = (key: string) => {
    clearTimeout(closeTimer.current);
    setOpenKey(key);
  };
  // A short delay on leave stops the panel flickering while the pointer crosses gaps.
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 150);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Close the panel on navigation, Escape, or a click outside the header.
  useEffect(() => setOpenKey(null), [pathname]);
  useEffect(() => {
    if (!openKey) return;
    const onPointer = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpenKey(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenKey(null);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openKey]);

  const itemClass = (active: boolean) =>
    cn(
      "relative inline-flex items-center gap-1 whitespace-nowrap py-1 text-[13px] transition-colors xl:text-sm",
      active
        ? "text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-ink"
        : "text-muted-foreground hover:text-ink"
    );

  return (
    <header
      ref={headerRef}
      onMouseLeave={closeSoon}
      onMouseEnter={() => clearTimeout(closeTimer.current)}
      className="sticky top-0 z-40 w-full border-b border-hairline/80 bg-paper"
    >
      <nav aria-label="Main" className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 xl:gap-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-3">
          <span className="font-display text-xl whitespace-nowrap sm:text-2xl">{siteConfig.name}</span>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground 2xl:inline">
            {siteConfig.tagline}
          </span>
        </Link>

        <div className="relative hidden min-w-0 flex-1 items-center justify-center gap-3 self-stretch lg:flex xl:gap-5 2xl:gap-6">
          {navTree.map((section) => {
            const label = section.shortLabel ?? section.label;
            const active = isUnder(pathname, section.href) || openKey === section.key;
            const className = cn(itemClass(active), section.comingSoon && "text-muted-foreground/70");
            const content = (
              <>
                {label}
                <ChevronDown
                  aria-hidden
                  className={cn("hidden size-3 transition-transform duration-200 xl:block", openKey === section.key && "rotate-180")}
                />
              </>
            );
            // A link to the section that also opens its subcategory panel on hover and keyboard focus.
            return section.comingSoon ? (
              <span
                key={section.key}
                tabIndex={0}
                onMouseEnter={() => open(section.key)}
                onFocus={() => open(section.key)}
                title={section.label}
                className={className}
              >
                {content}
              </span>
            ) : (
              <Link
                key={section.key}
                href={section.href}
                onMouseEnter={() => open(section.key)}
                onFocus={() => open(section.key)}
                aria-current={isUnder(pathname, section.href) ? "page" : undefined}
                aria-expanded={openKey === section.key}
                aria-haspopup="true"
                title={section.label}
                className={className}
              >
                {content}
              </Link>
            );
          })}
          {extras.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              aria-current={isUnder(pathname, e.href) ? "page" : undefined}
              onMouseEnter={() => setOpenKey(null)}
              className={itemClass(isUnder(pathname, e.href))}
            >
              {e.label}
            </Link>
          ))}

          {openSection && (
            <div className="fixed left-1/2 top-16 z-50 w-[52rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-hairline bg-paper shadow-[0_24px_48px_-24px_rgba(17,17,17,0.45)]">
              <div className="max-h-[calc(100vh-6rem)] overflow-y-auto px-6 py-5">
                <SectionPanel key={openSection.key} section={openSection} />
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto hidden shrink-0 items-center gap-3 lg:flex" onMouseEnter={() => setOpenKey(null)}>
          <SearchButton />
          <ThemeToggle />
          {subscribe && (
            <Link
              href={subscribe.href}
              className="hidden rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink 2xl:inline-flex"
            >
              Subscribe
            </Link>
          )}
          <ProfileMenu />
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <SearchButton compact />
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
              <div className="flex flex-col gap-5 px-4 pb-8">
                <MobileLink href="/" label="Home" active={pathname === "/"} onNavigate={() => setMenuOpen(false)} />
                {navTree.map((s) =>
                  s.comingSoon ? (
                    <span key={s.key} className="font-display text-2xl text-muted-foreground/70">
                      {s.label} <SoonBadge />
                    </span>
                  ) : (
                    <div key={s.key}>
                      <MobileLink
                        href={s.href}
                        label={s.label}
                        active={isUnder(pathname, s.href)}
                        onNavigate={() => setMenuOpen(false)}
                      />
                      {s.groups.length > 0 && (
                        <ul className="mt-1.5 flex flex-col gap-1 border-l border-hairline pl-3">
                          {s.groups.map((g) => (
                            <li key={g.slug}>
                              <Link
                                href={g.href}
                                onClick={() => setMenuOpen(false)}
                                className="text-sm text-muted-foreground transition-colors hover:text-ink"
                              >
                                {g.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                )}
                {extras.map((e) => (
                  <MobileLink
                    key={e.href}
                    href={e.href}
                    label={e.label}
                    active={isUnder(pathname, e.href)}
                    onNavigate={() => setMenuOpen(false)}
                  />
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

function SectionPanel({ section }: { section: HeaderNavSection }) {
  if (section.comingSoon) {
    return (
      <div>
        <p className="font-display text-xl text-ink">{section.label}</p>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
      </div>
    );
  }

  const unit = section.kind === "directory" ? "listed" : "pages";
  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-hairline pb-3">
        <p className="font-display text-xl text-ink">{section.label}</p>
        <Link href={section.href} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          View all <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      {section.groups.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 xl:grid-cols-3">
          {section.groups.map((group) => {
            const Icon = group.icon ? getIconComponent(group.icon) : undefined;
            return (
              <li key={group.slug}>
                <Link
                  href={group.href}
                  className="group/card flex h-full items-start gap-3 rounded-lg border border-hairline px-3 py-2.5 transition-colors hover:border-ink hover:bg-paper-2"
                >
                  {Icon && <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover/card:text-primary" />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{group.title}</span>
                    {group.count > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {group.count} {unit}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
