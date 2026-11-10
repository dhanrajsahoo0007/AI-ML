"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useCanonicalPathname } from "@/lib/use-canonical-pathname";
import { ArrowRight, ChevronDown, ChevronRight, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/icons";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/theme";
import { SearchButton } from "@/features/search/search-dialog.client";
import { SUBSCRIBE_KIND } from "@/features/sections/public";
import type { HeaderNavItems, HeaderNavSection } from "@/features/sections/public";

// Header: every visible section from content/sections.yaml is its own item in the top bar (in registry order),
// followed by the extra links (Pricing). Hovering or focusing a section opens a two-pane panel: that section's
// first-level groups stacked on the left, and the hovered group's articles on the right. The header is on every page,
// so its props are only the slim group list (HeaderNavSection); the article lists come from /nav-items.json, fetched
// the first time a panel opens. The profile menu is passed in from
// app/layout.tsx (it lives in features/account, which components/ can't import), once per slot: the desktop bar and
// the mobile bar each render their own element (one element in two places trips React's key warning).

const isUnder = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function SiteHeader({
  navTree,
  profileMenu,
  profileMenuMobile,
}: {
  navTree: HeaderNavSection[];
  profileMenu: ReactNode;
  profileMenuMobile: ReactNode;
}) {
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
    void loadNavItems();
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
                  className={cn(
                    "hidden size-3 transition-transform duration-200 xl:block",
                    openKey === section.key && "rotate-180"
                  )}
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
            <div className="fixed left-1/2 top-16 z-50 w-[60rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-hairline bg-paper shadow-[0_24px_48px_-24px_rgba(17,17,17,0.45)]">
              <SectionPanel key={openSection.key} section={openSection} pathname={pathname} />
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
          {profileMenu}
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <SearchButton compact />
          <ThemeToggle />
          {profileMenuMobile}
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
      className={cn(
        "font-display text-2xl transition-colors",
        active ? "text-ink" : "text-muted-foreground hover:text-ink"
      )}
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

// Article lists for the open menu (public/nav-items.json, written by scripts/gen-runtime-data.ts), fetched once the
// first time any menu opens and shared by every panel after that.
let itemsPromise: Promise<HeaderNavItems | null> | undefined;
let loadedItems: HeaderNavItems | undefined;
function loadNavItems() {
  itemsPromise ??= fetch("/nav-items.json")
    .then((r) => (r.ok ? (r.json() as Promise<HeaderNavItems>) : null))
    .then((v) => (loadedItems = v ?? undefined) ?? null)
    .catch(() => {
      itemsPromise = undefined; // let the next open retry
      return null;
    });
  return itemsPromise;
}

function useNavItems() {
  const [items, setItems] = useState<HeaderNavItems | null | undefined>(loadedItems);
  useEffect(() => {
    let live = true;
    loadNavItems().then((v) => live && setItems(v));
    return () => {
      live = false;
    };
  }, []);
  return items;
}

// Two panes: the section's groups stacked on the left, the hovered (or focused) group's articles on the right.
function SectionPanel({ section, pathname }: { section: HeaderNavSection; pathname: string }) {
  const items = useNavItems();
  // Opens on the group that holds the current page (known once the article lists have loaded), else the first one.
  // A group's own href can be a hub page shared with other groups, so the article lists decide.
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const current = items
    ? section.groups.find((g) => items[section.key]?.[g.slug]?.some((b) => b.items.some((i) => i.href === pathname)))
    : undefined;
  const activeSlug = picked ?? (current ?? section.groups[0])?.slug;
  const setActiveSlug = setPicked;
  // A short hover intent so a diagonal move from a group towards its articles doesn't switch groups on the way.
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const hover = (slug: string) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setActiveSlug(slug), 90);
  };

  if (section.comingSoon) {
    return (
      <div className="px-6 py-5">
        <p className="font-display text-xl text-ink">{section.label}</p>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
      </div>
    );
  }

  const unit = section.kind === "directory" ? "listed" : "pages";
  const active = section.groups.find((g) => g.slug === activeSlug);
  const blocks = active && items ? (items[section.key]?.[active.slug] ?? []) : [];

  return (
    <div className="flex max-h-[calc(100vh-6rem)] flex-col">
      <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-6 py-4">
        <p className="font-display text-xl text-ink">{section.label}</p>
        <Link href={section.href} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          View all <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      {section.groups.length > 0 && (
        <div className="flex h-[30rem] max-h-full min-h-0">
          <ul className="w-64 shrink-0 overflow-y-auto border-r border-hairline p-2">
            {section.groups.map((group) => {
              const Icon = group.icon ? getIconComponent(group.icon) : undefined;
              const isActive = group.slug === activeSlug;
              return (
                <li key={group.slug}>
                  <Link
                    href={group.href}
                    onMouseEnter={() => hover(group.slug)}
                    onMouseLeave={() => clearTimeout(hoverTimer.current)}
                    onFocus={() => setActiveSlug(group.slug)}
                    aria-current={group.slug === current?.slug ? "true" : undefined}
                    className={cn(
                      "group/item flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      isActive ? "bg-paper-2 text-ink" : "text-muted-foreground hover:bg-paper-2/60 hover:text-ink"
                    )}
                  >
                    {Icon && (
                      <Icon
                        aria-hidden
                        className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{group.title}</span>
                      {group.count > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {group.count} {unit}
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className={cn("size-3.5 shrink-0 transition-opacity", isActive ? "opacity-100" : "opacity-0")}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div
            className="min-w-0 flex-1 overflow-y-auto px-6 py-4"
            onMouseEnter={() => clearTimeout(hoverTimer.current)}
          >
            {active && (
              <>
                <div className="mb-3 flex items-baseline justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {active.title}
                  </p>
                  <Link
                    href={active.href}
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {active.count > 0 ? `All ${active.count} ${unit}` : "Open"}{" "}
                    <ArrowRight aria-hidden className="size-3" />
                  </Link>
                </div>
                {items === undefined && active.count > 0 ? (
                  <ul aria-hidden className="columns-2 gap-8">
                    {Array.from({ length: Math.min(active.count, 10) }, (_, i) => (
                      <li key={i} className="mb-2.5 h-4 w-4/5 animate-pulse rounded bg-paper-2" />
                    ))}
                  </ul>
                ) : blocks.length > 0 ? (
                  <div className="columns-2 gap-8">
                    {blocks.map((block, i) => (
                      <div key={block.title ?? i} className="mb-4">
                        {block.title && (
                          <p className="mb-1.5 break-after-avoid text-[13px] font-semibold text-ink">{block.title}</p>
                        )}
                        <ul>
                          {block.items.map((item) => (
                            <li key={item.href} className="break-inside-avoid">
                              <Link
                                href={item.href}
                                aria-current={pathname === item.href ? "page" : undefined}
                                className={cn(
                                  "block py-1 text-sm leading-snug transition-colors hover:text-primary",
                                  pathname === item.href ? "font-medium text-ink" : "text-muted-foreground"
                                )}
                              >
                                {item.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <Link href={active.href} className="text-primary hover:underline">
                      Open {active.title}
                    </Link>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
