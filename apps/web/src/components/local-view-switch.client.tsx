"use client";

import { useEffect, useState } from "react";

// `next dev` only (the root layout renders it when APP_ENV=local): a small switch in the bottom-right corner that
// runs the site with the paid or the unpaid view of premium pages, without signing in or out.
//   Real   → follows who is signed in (signed out or a free user sees the paywall; Pro sees everything)
//   Paid   → every premium page opens in full, as for a paying user
//   Unpaid → every premium page shows the preview and the paywall, as for a non-paying visitor
// It sets the `tts_local_view` cookie, which src/middleware.ts honours only in local builds. The startup default
// is LOCAL_VIEW_AS in .env.local (read when `npm run dev` starts).

const LOCAL_VIEW_COOKIE = "tts_local_view";
const OPTIONS = [
  { value: "real", label: "Real" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
] as const;
type View = (typeof OPTIONS)[number]["value"];

function readCookie(): View | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCAL_VIEW_COOKIE}=([^;]*)`));
  return m && OPTIONS.some((o) => o.value === m[1]) ? (m[1] as View) : null;
}

function LocalViewSwitchImpl({ envDefault }: { envDefault?: string }) {
  const [view, setView] = useState<View | null>(null);
  useEffect(() => {
    const fallback: View = envDefault === "paid" || envDefault === "unpaid" ? envDefault : "real";
    setView(readCookie() ?? fallback);
  }, [envDefault]);
  if (!view) return null;

  function choose(next: View) {
    document.cookie = `${LOCAL_VIEW_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div
      role="group"
      aria-label="Local view of premium pages"
      data-copy-ok="page"
      data-testid="local-view-switch"
      className="fixed bottom-4 right-4 z-[70] flex items-center gap-1 rounded-full border border-hairline bg-paper/95 p-1 text-xs shadow-[0_8px_24px_-12px_rgba(17,17,17,0.45)] backdrop-blur print:hidden"
    >
      <span className="px-2 font-medium text-muted-foreground">Local view</span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={view === o.value}
          onClick={() => choose(o.value)}
          className={
            view === o.value
              ? "rounded-full bg-ink px-2.5 py-1 font-medium text-paper"
              : "rounded-full px-2.5 py-1 text-ink hover:bg-paper-2"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// APP_ENV is inlined at build: every non-local build exports an empty stub and the minifier drops the code above.
export const LocalViewSwitch: (props: { envDefault?: string }) => React.ReactNode =
  process.env.APP_ENV === "local" ? LocalViewSwitchImpl : () => null;
