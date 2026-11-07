"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTurnstile } from "./turnstile.client";

// The sign-up form: a small client island on the archive and issue pages (static HTML around it).
// - Signed out: posts JSON to the subscribe API; the API answers the same for every address, so the form always
//   says "check your inbox". With a Turnstile site key the widget loads on first interaction.
// - Signed in: after load it asks the account API (no database work for signed-out visitors) and offers
//   "Subscribe with your account": one click, no confirmation email (Google verified the address).

type State = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

type AccountStatus = "none" | "pending" | "active" | "unsubscribed" | "suppressed";
type Account = { signedIn: false } | { signedIn: true; email: string; status: AccountStatus };

interface SignupFormProps {
  endpoint: string;
  accountEndpoint: string;
  preferencesHref: string;
  consentText: string;
  consentVersion: string;
  privacyHref: string;
  source: "archive" | "issue";
  /** NEXT_PUBLIC_TURNSTILE_SITE_KEY at build; no widget without it. */
  turnstileSiteKey?: string;
}

const MESSAGES: Record<number, string> = {
  400: "That doesn't look like an email address.",
  429: "Too many sign-ups from this network. Please try again in an hour.",
};

const CAPTCHA_FAILED = "Please complete the bot check below the email field, then try again.";

const panel = "rounded-xl border border-hairline bg-paper-2/60 p-4 text-[15px] text-ink";
const button =
  "rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-primary disabled:opacity-60";

async function errorCode(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
  return body.error?.code ?? "";
}

export function SignupForm(props: SignupFormProps) {
  const { endpoint, accountEndpoint, preferencesHref, consentText, consentVersion, privacyHref, source } = props;
  const [state, setState] = useState<State>({ kind: "idle" });
  const [account, setAccount] = useState<Account | null>(null);
  const [useOtherEmail, setUseOtherEmail] = useState(false);
  const turnstile = useTurnstile(props.turnstileSiteKey);

  useEffect(() => {
    let live = true;
    fetch(accountEndpoint, { credentials: "same-origin", cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Account>) : null))
      .then((data) => live && data && setAccount(data))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [accountEndpoint]);

  async function subscribeWithAccount() {
    setState({ kind: "sending" });
    try {
      const res = await fetch(accountEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", source }),
      });
      if (res.ok) {
        setAccount((await res.json()) as Account);
        setState({ kind: "idle" });
      } else setState({ kind: "error", message: "Something went wrong. Please try again later." });
    } catch {
      setState({ kind: "error", message: "We couldn't reach the server. Check your connection and try again." });
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (turnstile.enabled && !turnstile.token) {
      turnstile.activate();
      setState({ kind: "error", message: CAPTCHA_FAILED });
      return;
    }
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
          ...(turnstile.enabled ? { turnstileToken: turnstile.token } : {}),
        }),
      });
      if (res.ok) {
        setState({ kind: "sent" });
        return;
      }
      const code = await errorCode(res);
      turnstile.reset();
      setState({
        kind: "error",
        message: code.startsWith("captcha_")
          ? CAPTCHA_FAILED
          : (MESSAGES[res.status] ?? "Something went wrong. Please try again later."),
      });
    } catch {
      setState({ kind: "error", message: "We couldn't reach the server. Check your connection and try again." });
    }
  }

  if (state.kind === "sent") {
    return (
      <p role="status" className={panel}>
        Check your inbox: we sent you a link to confirm your subscription. It works for 48 hours.
      </p>
    );
  }

  const manage = (
    <a href={preferencesHref} className="underline hover:text-primary">
      Manage email preferences
    </a>
  );

  if (account?.signedIn && account.status === "active") {
    return (
      <p role="status" className={panel} data-testid="newsletter-account-status">
        You&apos;re subscribed as <strong>{account.email}</strong>. {manage}.
      </p>
    );
  }

  if (account?.signedIn && !useOtherEmail) {
    return (
      <div className="space-y-3" data-testid="newsletter-account-signup">
        {account.status === "suppressed" ? (
          <p className={panel}>
            We can&apos;t send email to <strong>{account.email}</strong>: it bounced or was reported as spam. {manage}.
          </p>
        ) : (
          <>
            <button type="button" onClick={subscribeWithAccount} disabled={state.kind === "sending"} className={button}>
              {state.kind === "sending" ? "Subscribing…" : "Subscribe with your account"}
            </button>
            <p className="text-sm text-muted-foreground">
              As <strong className="text-ink">{account.email}</strong>, with no confirmation email.{" "}
              <button
                type="button"
                onClick={() => setUseOtherEmail(true)}
                className="underline hover:text-ink"
              >
                Use a different email
              </button>
            </p>
          </>
        )}
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
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      onFocusCapture={turnstile.activate}
      onPointerEnter={turnstile.activate}
      className="space-y-3"
      noValidate={false}
    >
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
        <button type="submit" disabled={state.kind === "sending"} className={button}>
          {state.kind === "sending" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      {turnstile.enabled && <div ref={turnstile.container} data-testid="turnstile" />}
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
