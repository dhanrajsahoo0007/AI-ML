"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCanonicalPathname } from "@/lib/use-canonical-pathname";
import { ArrowRight, ChevronDown, ChevronRight, Gem, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/icons";
import { BrandMark } from "@/components/brand-mark";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/theme";
import { SearchButton } from "@/features/search/search-dialog.client";
import { GROUPS_ONLY_KINDS, SUBSCRIBE_KIND } from "@/features/sections/public";
import type { HeaderNavItems, HeaderNavSection } from "@/features/sections/public";

// Header: every visible section from content/sections.yaml is its own item in the top bar (in registry order),
// with its icon; the extra links (Pricing) are a button on the right, next to search and the profile. Hovering or
// focusing a section opens a two-pane panel: that section's
// first-level groups stacked on the left, and the hovered group's articles on the right. The header is on every page,
// so its props are only the slim group list (HeaderNavSection); the article lists come from /nav-items.json, fetched
// the first time a panel opens. The profile menu is passed in from
// app/layout.tsx (it lives in features/account, which components/ can't import), once per slot: the desktop bar and
// the mobile bar each render their own element (one element in two places trips React's key warning).

// Company logos (about 33 kB of SVG paths) load only when the Companies panel opens.
const CompanyMenuItems = dynamic(() => import("@/components/company-menu-items").then((m) => m.CompanyMenuItems), {
  ssr: false,
  loading: () => <div aria-hidden className="h-40 animate-pulse rounded-xl bg-paper-2" />,
});

const isUnder = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

// The desktop bar is sized by how many sections it shows, because every step below is a fixed width. Up to seven
// sections (`regular`): the phone menu below 1100px, small labels up to 1280px, icons from 1440px, Subscribe from
// 1800px, the arrows from 1900px. With eight or more (`crowded`) each step comes later, so the links never run under
// the logo or the buttons: 1280px, 1600px, 1760px, 2040px and 2200px, measured with nine sections.
// The class names are written out in full so Tailwind can see them.
const BAR_SIZES = {
  regular: {
    show: "min-[1100px]:flex",
    phone: "min-[1100px]:hidden",
    item: "xl:text-sm",
    barGap: "xl:gap-6",
    linkGap: "xl:gap-4",
    toolGap: "xl:gap-3",
    pricing: "xl:px-4 xl:py-2 xl:text-sm",
    gem: "xl:block",
    icon: "min-[1440px]:block",
    subscribe: "min-[1800px]:inline-flex",
    arrow: "min-[1900px]:block",
  },
  crowded: {
    show: "min-[1280px]:flex",
    phone: "min-[1280px]:hidden",
    item: "min-[1600px]:text-sm",
    barGap: "min-[1600px]:gap-6",
    linkGap: "min-[1600px]:gap-4",
    toolGap: "min-[1600px]:gap-3",
    pricing: "min-[1600px]:px-4 min-[1600px]:py-2 min-[1600px]:text-sm",
    gem: "min-[1600px]:block",
    icon: "min-[1760px]:block",
    subscribe: "min-[2040px]:inline-flex",
    arrow: "min-[2200px]:block",
  },
} as const;
const REGULAR_BAR_MAX = 7;

export function SiteHeader({
  navTree,
  profileMenu,
  profileMenuMobile,
  defaultOpenKey,
  initialNavItems,
}: {
  navTree: HeaderNavSection[];
  profileMenu: ReactNode;
  profileMenuMobile: ReactNode;
  defaultOpenKey?: string;
  initialNavItems?: HeaderNavItems;
}) {
  const pathname = useCanonicalPathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(defaultOpenKey ?? null);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const extras = siteConfig.extraNav;
  const bar = navTree.length > REGULAR_BAR_MAX ? BAR_SIZES.crowded : BAR_SIZES.regular;
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
      "relative inline-flex items-center gap-1.5 whitespace-nowrap py-1 text-[12.5px] transition-colors",
      bar.item,
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
      <nav aria-label="Main" className={cn("flex h-16 w-full items-center gap-3 px-4 sm:px-6", bar.barGap)}>
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <BrandMark className="size-7 sm:size-8" />
          <span className="font-display text-xl whitespace-nowrap sm:text-2xl">{siteConfig.name}</span>
        </Link>

        <div
          className={cn(
            "relative hidden min-w-0 flex-1 items-center justify-center gap-2 self-stretch",
            bar.show,
            bar.linkGap
          )}
        >
          {navTree.map((section) => {
            const label = section.shortLabel ?? section.label;
            const active = isUnder(pathname, section.href) || openKey === section.key;
            // The underline of the current section takes that section's tint (data-tone on the link).
            const className = cn(itemClass(active), "after:bg-tint", section.comingSoon && "text-muted-foreground/70");
            // The section's icon, in its tint when the section is current or its menu is open (widths: BAR_SIZES).
            const SectionIcon = getIconComponent(section.icon);
            const icon = SectionIcon && (
              <SectionIcon
                aria-hidden
                className={cn(
                  "hidden size-3.5 shrink-0 transition-colors",
                  bar.icon,
                  active ? "text-tint" : "text-muted-foreground/80"
                )}
              />
            );
            const content = (
              <>
                {icon}
                {label}
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "hidden size-3 transition-transform duration-200",
                    bar.arrow,
                    openKey === section.key && "rotate-180"
                  )}
                />
              </>
            );
            // A section without subcategories (the newsletter) is a plain link, like Pricing: no arrow, no panel.
            if (section.groups.length === 0 && !section.comingSoon) {
              return (
                <Link
                  key={section.key}
                  href={section.href}
                  onMouseEnter={() => setOpenKey(null)}
                  aria-current={isUnder(pathname, section.href) ? "page" : undefined}
                  title={section.label}
                  data-tone={section.tone}
                  className={cn(itemClass(isUnder(pathname, section.href)), "after:bg-tint")}
                >
                  {icon}
                  {label}
                </Link>
              );
            }
            // A link to the section that also opens its subcategory panel on hover and keyboard focus.
            return section.comingSoon ? (
              <span
                key={section.key}
                data-tone={section.tone}
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
                data-tone={section.tone}
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

          {openSection && (
            <div
              data-tone={openSection.tone}
              className="fixed left-1/2 top-16 z-50 w-[60rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-hairline bg-paper shadow-[0_24px_48px_-24px_rgba(17,17,17,0.45)]"
            >
              <SectionPanel
                key={openSection.key}
                section={openSection}
                pathname={pathname}
                initialItems={initialNavItems}
                onNavigate={() => setOpenKey(null)}
              />
            </div>
          )}
        </div>

        <div
          className={cn("ml-auto hidden shrink-0 items-center gap-2", bar.show, bar.toolGap)}
          onMouseEnter={() => setOpenKey(null)}
        >
          <SearchButton />
          <ThemeToggle />
          {/* Pricing is an action, not a section: it sits with search and the profile, as the bar's one filled button. */}
          {extras.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              aria-current={isUnder(pathname, e.href) ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-paper transition-colors hover:bg-primary",
                bar.pricing
              )}
            >
              <Gem aria-hidden className={cn("hidden size-3.5", bar.gem)} />
              {e.label}
            </Link>
          ))}
          {subscribe && (
            <Link
              href={subscribe.href}
              className={cn(
                "hidden rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink",
                bar.subscribe
              )}
            >
              Subscribe
            </Link>
          )}
          {profileMenu}
        </div>

        <div className={cn("ml-auto flex items-center gap-1", bar.phone)}>
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

function useNavItems(initial?: HeaderNavItems) {
  const [items, setItems] = useState<HeaderNavItems | null | undefined>(initial ?? loadedItems);
  useEffect(() => {
    if (initial) return;
    let live = true;
    loadNavItems().then((v) => live && setItems(v));
    return () => {
      live = false;
    };
  }, [initial]);
  return items;
}

// Consecutive groups that share a heading (Interview Practice: the topics of one area), in order.
function runsByHeading<G extends { heading?: string }>(groups: G[]) {
  const runs: { heading?: string; groups: G[] }[] = [];
  for (const g of groups) {
    const last = runs.at(-1);
    if (last && last.heading === g.heading) last.groups.push(g);
    else runs.push({ heading: g.heading, groups: [g] });
  }
  return runs;
}

// Two panes: the section's groups stacked on the left, the hovered (or focused) group's articles on the right.
function SectionPanel({
  section,
  pathname,
  initialItems,
  onNavigate,
}: {
  section: HeaderNavSection;
  pathname: string;
  initialItems?: HeaderNavItems;
  /** Closes the menu: a company link only changes the query string, which the header does not see as navigation. */
  onNavigate: () => void;
}) {
  const items = useNavItems(initialItems);
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
  // Interview Practice lists its topics only; every other section shows a group's articles beside it.
  const groupsOnly = GROUPS_ONLY_KINDS.includes(section.kind);
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
      {section.groups.length > 0 && groupsOnly && (
        <div className="overflow-y-auto p-4">
          {runsByHeading(section.groups).map((run, r) => (
            <div key={run.heading ?? r} className="mt-5 first:mt-0">
              {run.heading && (
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {run.heading}
                </p>
              )}
              <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {run.groups.map((group) => {
                  const Icon = group.icon ? getIconComponent(group.icon) : undefined;
                  return (
                    <li key={group.slug}>
                      <Link
                        href={group.href}
                        aria-current={isUnder(pathname, group.href) ? "true" : undefined}
                        className={cn(
                          "group/card flex h-full items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:border-tint/60 hover:bg-paper-2/60",
                          isUnder(pathname, group.href) ? "border-ink/30 bg-paper-2" : "border-hairline"
                        )}
                      >
                        {Icon && (
                          <Icon
                            aria-hidden
                            className={cn(
                              "size-4 shrink-0 group-hover/card:text-tint",
                              isUnder(pathname, group.href) ? "text-tint" : "text-muted-foreground"
                            )}
                          />
                        )}
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
            </div>
          ))}
        </div>
      )}
      {section.groups.length > 0 && !groupsOnly && (
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
                        className={cn("size-4 shrink-0", isActive ? "text-tint" : "text-muted-foreground")}
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
                  <ul aria-hidden className={cn(active.count > 8 && "columns-2 gap-8")}>
                    {Array.from({ length: Math.min(active.count, 10) }, (_, i) => (
                      <li key={i} className="mb-2.5 h-4 w-4/5 animate-pulse rounded bg-paper-2" />
                    ))}
                  </ul>
                ) : blocks.length > 0 && section.kind === "directory" ? (
                  <CompanyMenuItems items={blocks.flatMap((b) => b.items)} onNavigate={onNavigate} />
                ) : blocks.length > 0 ? (
                  <div className={blocks.length > 1 ? "columns-2 gap-8" : "space-y-4"}>
                    {blocks.map((block, i) => {
                      const BlockIcon = block.icon ? getIconComponent(block.icon) : undefined;
                      return (
                        <div key={block.title ?? i} className="mb-4">
                          {block.title && (
                            <p className="mb-1.5 flex break-after-avoid items-center gap-2 text-[13px] font-semibold text-ink">
                              {BlockIcon && <BlockIcon aria-hidden className="size-3.5 shrink-0 text-tint" />}
                              {block.title}
                            </p>
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
                      );
                    })}
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
