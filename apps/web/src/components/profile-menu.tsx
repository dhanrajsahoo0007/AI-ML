"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Github, LogIn, LogOut, User } from "lucide-react";
import { siteConfig } from "@/config/site";

// Sign-in state is fetched only when the menu is opened (never on page load), so content pages stay static
// and make no auth or database requests. Better Auth's 5-minute cookie cache answers most of these without
// touching the database. No auth client library: one GET and one POST.
type Me = { name: string; email: string } | null;
const guest = { name: "Guest learner", note: "Sign in to save progress across devices" };

export function ProfileMenu() {
  const [open, setOpen] = React.useState(false);
  const [me, setMe] = React.useState<Me | undefined>(undefined);
  const ref = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    if (!open) return;
    let live = true;
    fetch("/api/auth/get-session", { credentials: "same-origin", cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ user?: { name: string; email: string } } | null>) : null))
      .then((data) => live && setMe(data?.user ? { name: data.user.name, email: data.user.email } : null))
      .catch(() => live && setMe(null));
    return () => {
      live = false;
    };
  }, [open]);

  const signOut = async () => {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }).catch(() => {});
    window.location.reload();
  };

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
            <div className="min-w-0" aria-live="polite">
              <p className="truncate text-sm font-medium text-ink" data-testid="profile-name">
                {me === undefined ? "…" : me ? me.name : guest.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">{me ? me.email : guest.note}</p>
            </div>
          </div>
          <div className="py-1.5">
            {me ? (
              <MenuLink href="/account" icon={User} onClick={() => setOpen(false)}>
                Your account
              </MenuLink>
            ) : (
              me === null && (
                <MenuLink
                  href={`/sign-in?callbackURL=${encodeURIComponent(pathname || "/")}`}
                  icon={LogIn}
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </MenuLink>
              )
            )}
            <MenuLink href="/interviews" icon={BookOpen} onClick={() => setOpen(false)}>
              Interview practice
            </MenuLink>
            <MenuLink href={siteConfig.github} icon={Github} external onClick={() => setOpen(false)}>
              GitHub
            </MenuLink>
            {me && (
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
              >
                <LogOut className="size-4 text-muted-foreground" />
                Sign out
              </button>
            )}
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
