"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-[1.8]">
      <nav className="mx-auto grid h-16 max-w-screen-2xl grid-cols-[1fr_auto_1fr] items-center px-6 lg:px-8">
        {/* Left — nav links */}
        <div className="hidden items-center gap-1 sm:flex">
          {siteConfig.nav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-md px-3.5 py-2 text-[15px] font-medium transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute inset-x-1 -bottom-[calc(0.5rem+1px)] h-0.5 rounded-full bg-primary"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
        <div className="sm:hidden" />

        {/* Center — logo */}
        <Link href="/" className="group flex items-center justify-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <motion.span
            className="hidden text-lg font-bold tracking-tight text-foreground sm:inline-block"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {siteConfig.name}
          </motion.span>
          <motion.span
            className="text-lg font-bold tracking-tight text-foreground sm:hidden"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            Origins AI
          </motion.span>
        </Link>

        {/* Right — theme toggle + mobile menu */}
        <div className="flex items-center justify-end gap-1">
          <ThemeToggle />

          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="text-left text-base">
                    Navigate
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-1">
                  <Link
                    className="rounded-md px-3 py-2.5 text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
                    href="/"
                  >
                    Home
                  </Link>
                  {siteConfig.nav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-md px-3 py-2.5 text-[15px] font-medium transition-colors hover:bg-muted ${
                        pathname.startsWith(item.href)
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
