"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Github, User } from "lucide-react";
import { siteConfig } from "@/config/site";

// There are no accounts yet: progress belongs to an anonymous per-browser learner (see lib/learner.ts),
// so the menu presents a guest. When sign-in lands, swap `name` and add the sign-in / sign-out actions here.
const guest = { name: "Guest learner", note: "Progress is saved in this browser" };

export function ProfileMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        className="inline-flex size-9 items-center justify-center rounded-full border border-hairline bg-paper-2 text-ink transition-colors hover:border-ink"
      >
        <User className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-hairline bg-paper shadow-[0_18px_40px_-24px_rgba(17,17,17,0.45)]"
        >
          <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-paper-2 text-ink">
              <User className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{guest.name}</p>
              <p className="text-xs text-muted-foreground">{guest.note}</p>
            </div>
          </div>
          <div className="py-1.5">
            <MenuLink href="/interviews" icon={BookOpen} onClick={() => setOpen(false)}>
              Interview practice
            </MenuLink>
            <MenuLink href={siteConfig.github} icon={Github} external onClick={() => setOpen(false)}>
              GitHub
            </MenuLink>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  external,
  onClick,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="flex items-center gap-3 px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </Link>
  );
}
