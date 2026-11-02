"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-hairline/80 bg-paper/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-8">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-display text-xl whitespace-nowrap sm:text-2xl">
            {siteConfig.name}
          </span>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground xl:inline">
            {siteConfig.tagline}
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {siteConfig.nav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative py-1 text-sm transition-colors",
                  isActive
                    ? "text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-ink"
                    : "text-muted-foreground hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href={siteConfig.hero.primaryCta.href}
            className="hidden rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-primary xl:inline-flex"
          >
            Start learning
          </Link>
        </div>

        <div className="lg:hidden">
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
