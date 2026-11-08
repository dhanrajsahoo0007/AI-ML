"use client";

import { useState } from "react";

// Local test accounts on /sign-in, `next dev` only (the page renders this when APP_ENV=local and the test-login
// provider is on). Google sign-in needs a real OAuth client, so locally you sign in as a seeded user instead:
// start with "Free user" to see the site exactly as a non-paying visitor does, then try Go Pro.

const ACCOUNTS: { key: string; label: string; note: string }[] = [
  { key: "free", label: "Free user", note: "Signed in, not paying: premium articles show the paywall" },
  { key: "pro_monthly", label: "Pro (monthly)", note: "Paying: every article opens in full" },
  { key: "on_hold", label: "Pro, payment failed", note: "Renewal failed: in the 7-day grace period" },
  { key: "pro_expired", label: "Pro, expired", note: "Was paying: back to the paywall" },
  { key: "admin", label: "Admin", note: "Admin dashboards and hidden sections" },
];

function LocalSignInImpl({ next }: { next: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInAs(key: string) {
    setBusy(key);
    setError(null);
    const res = await fetch("/api/dev/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userKey: key }),
    }).catch(() => null);
    if (!res?.ok) {
      setError("Couldn't sign in. Run `npm run setup:local -w web` (it creates the test users), then try again.");
      setBusy(null);
      return;
    }
    window.location.assign(`/sign-in/complete?next=${encodeURIComponent(next)}`);
  }

  return (
    <section
      aria-labelledby="local-sign-in"
      className="mt-10 rounded-xl border border-dashed border-hairline bg-paper-2 p-5"
      data-testid="local-sign-in"
    >
      <h2 id="local-sign-in" className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Local development · test accounts
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        Only on your machine (`npm run dev`); deployed sites never show this.
      </p>
      <ul className="mt-4 space-y-2">
        {ACCOUNTS.map((a) => (
          <li key={a.key}>
            <button
              type="button"
              onClick={() => signInAs(a.key)}
              disabled={busy !== null}
              className="flex w-full items-baseline justify-between gap-3 rounded-lg border border-hairline bg-paper px-3 py-2.5 text-left transition-colors hover:border-ink disabled:opacity-60"
            >
              <span className="text-[15px] font-medium text-ink">{busy === a.key ? "Signing in…" : a.label}</span>
              <span className="text-xs text-muted-foreground">{a.note}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-ink">
          {error}
        </p>
      )}
    </section>
  );
}

// APP_ENV is inlined at build: every non-local build exports an empty stub and the minifier drops the code above.
export const LocalSignIn: (props: { next: string }) => React.ReactNode =
  process.env.APP_ENV === "local" ? LocalSignInImpl : () => null;
