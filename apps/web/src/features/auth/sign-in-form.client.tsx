"use client";

import { useId, useState } from "react";

// The whole sign-in UI (plan §8.3): one "Continue with Google" button behind the age / parental-consent box.
// No auth client library: two same-origin fetches keep this page's JavaScript tiny.

export function SignInForm({ googleEnabled, next }: { googleEnabled: boolean; next: string }) {
  const id = useId();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueWithGoogle() {
    setBusy(true);
    setError(null);
    try {
      const consent = await fetch("/api/account/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ageConfirmed: true }),
      });
      if (!consent.ok) throw new Error("consent");
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: `/sign-in/complete?next=${encodeURIComponent(next)}`,
          errorCallbackURL: "/sign-in?error=google",
        }),
      });
      const data = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!res.ok || !data?.url) throw new Error("sign-in");
      window.location.assign(data.url);
    } catch {
      setError("Sign-in couldn't start. Please try again.");
      setBusy(false);
    }
  }

  const disabled = !googleEnabled || !confirmed || busy;

  return (
    <div className="mt-10 space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-hairline bg-paper-2 p-4">
        <input
          id={`${id}-age`}
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          aria-describedby={`${id}-age-note`}
          className="mt-1 size-4 shrink-0 accent-[var(--ink)]"
        />
        <div>
          <label htmlFor={`${id}-age`} className="text-[15px] font-medium text-ink">
            I&apos;m 18 or older, or my parent or guardian has given permission for me to use TokensToScale.
          </label>
          <p id={`${id}-age-note`} className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Under 13? Ask a parent or guardian to create the account and supervise how it&apos;s used.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={disabled}
        aria-describedby={googleEnabled ? undefined : `${id}-google-off`}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:bg-ink/50"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-4">
          <path
            fill="currentColor"
            d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.7 3.73 14.56 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.99 0-.6-.07-1.06-.15-1.51Z"
          />
        </svg>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>

      {!googleEnabled && (
        <p id={`${id}-google-off`} className="text-center text-[13px] text-muted-foreground">
          Google sign-in isn&apos;t set up in this environment yet.
        </p>
      )}
      {error && (
        <p role="alert" className="text-center text-[13px] text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
