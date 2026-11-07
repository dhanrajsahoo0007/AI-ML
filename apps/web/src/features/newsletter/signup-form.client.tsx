"use client";

import { useState, type FormEvent } from "react";

// The sign-up form: a small client island on the archive and issue pages (static HTML around it). Posts JSON to
// the subscribe API; the API answers the same for every address, so the form always says "check your inbox".

type State = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

export interface SignupFormProps {
  endpoint: string;
  consentText: string;
  consentVersion: string;
  privacyHref: string;
  source: "archive" | "issue";
}

const MESSAGES: Record<number, string> = {
  400: "That doesn't look like an email address.",
  429: "Too many sign-ups from this network. Please try again in an hour.",
};

export function SignupForm({ endpoint, consentText, consentVersion, privacyHref, source }: SignupFormProps) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setState({ kind: "sending" });
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? ""),
          website: String(data.get("website") ?? ""),
          consentVersion,
          source,
        }),
      });
      if (res.ok) setState({ kind: "sent" });
      else
        setState({ kind: "error", message: MESSAGES[res.status] ?? "Something went wrong. Please try again later." });
    } catch {
      setState({ kind: "error", message: "We couldn't reach the server. Check your connection and try again." });
    }
  }

  if (state.kind === "sent") {
    return (
      <p role="status" className="rounded-xl border border-hairline bg-paper-2/60 p-4 text-[15px] text-ink">
        Check your inbox: we sent you a link to confirm your subscription. It works for 48 hours.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate={false}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`newsletter-email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`newsletter-email-${source}`}
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-full border border-ink/20 bg-paper px-4 py-2.5 text-[15px] text-ink placeholder:text-muted-foreground focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-primary disabled:opacity-60"
        >
          {state.kind === "sending" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      {/* Honeypot: off-screen and skipped by keyboard and screen readers; bots that fill every field get ignored. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor={`newsletter-website-${source}`}>Leave this field empty</label>
        <input id={`newsletter-website-${source}`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {state.kind === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {consentText}{" "}
        <a href={privacyHref} className="underline hover:text-ink">
          Privacy policy
        </a>
        .
      </p>
    </form>
  );
}
