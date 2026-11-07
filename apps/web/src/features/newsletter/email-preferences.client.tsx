"use client";

import { useState } from "react";

// The controls on /account/email-preferences: the newsletter status and one button that flips it. Posts to the
// account API (signed-in only, Origin-checked); the server answers with the new status.

type AccountStatus = "none" | "pending" | "active" | "unsubscribed" | "suppressed";

const LABELS: Record<AccountStatus, { title: string; detail: string }> = {
  none: { title: "Not subscribed", detail: "Subscribe with one click: your Google sign-in already verified this address." },
  pending: {
    title: "Waiting for confirmation",
    detail: "A confirmation email was sent earlier. You can skip it and subscribe here with one click.",
  },
  active: { title: "Subscribed", detail: "You get one short email per issue. Every email has a one-click unsubscribe link." },
  unsubscribed: { title: "Unsubscribed", detail: "You won't get the newsletter. Subscribe again any time." },
  suppressed: {
    title: "Paused",
    detail:
      "Emails to this address bounced or were reported as spam, so we stopped sending. Contact us if you want it back.",
  },
};

interface Props {
  endpoint: string;
  email: string;
  initialStatus: AccountStatus;
  contactHref: string;
}

export function EmailPreferences({ endpoint, email, initialStatus, contactHref }: Props) {
  const [status, setStatus] = useState<AccountStatus>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = LABELS[status];
  const action = status === "active" || status === "pending" ? "unsubscribe" : "subscribe";

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, source: "account" }),
      });
      if (res.ok) setStatus(((await res.json()) as { status: AccountStatus }).status);
      else setError("Something went wrong. Please try again.");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <dl className="grid gap-4 text-[15px] sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Address</dt>
          <dd className="mt-1 text-ink">{email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Newsletter</dt>
          <dd className="mt-1 text-ink" data-testid="newsletter-status" data-status={status} aria-live="polite">
            {label.title}
          </dd>
        </div>
      </dl>
      <p className="text-[14px] text-muted-foreground">{label.detail}</p>
      {status === "suppressed" ? (
        <a href={contactHref} className="text-sm underline underline-offset-2">
          Contact us
        </a>
      ) : (
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-primary disabled:opacity-60"
        >
          {busy ? "Saving…" : action === "subscribe" ? "Subscribe with one click" : "Unsubscribe"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
