"use client";

import { useState } from "react";

// The pre-checkout consent form (plan §9.7). Every box is required; the server re-checks the text versions and
// logs them in consent_log before it asks the provider for a checkout. On success the browser goes to the
// provider's hosted checkout.

export interface ConsentItem {
  key: string;
  version: string;
  text: string;
}

export function CheckoutForm({ plan, consents }: { plan: string; consents: ConsentItem[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const all = consents.every((c) => checked[c.key]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!all || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, consents: Object.fromEntries(consents.map((c) => [c.key, c.version])) }),
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
      if (res.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      setError(body.error?.message ?? "Checkout couldn't start. Please try again in a moment.");
    } catch {
      setError("Checkout couldn't start. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" data-testid="checkout-form">
      <fieldset className="space-y-4">
        <legend className="sr-only">Before you pay</legend>
        {consents.map((c) => (
          <label key={c.key} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink">
            <input
              type="checkbox"
              name={c.key}
              required
              checked={Boolean(checked[c.key])}
              onChange={(e) => setChecked((prev) => ({ ...prev, [c.key]: e.target.checked }))}
              className="mt-1 size-4 shrink-0 accent-[var(--ink)]"
            />
            <span>{c.text}</span>
          </label>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="rounded-xl border border-hairline bg-paper-2 p-4 text-[15px] text-ink">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!all || busy}
        className="inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Opening secure checkout…" : "Continue to secure checkout"}
      </button>
    </form>
  );
}
