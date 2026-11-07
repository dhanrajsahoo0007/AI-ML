import { log } from "@/server/log";
import type { EmailSender } from "../email/sender";
import { CURRENT_CONSENT_VERSION, FIRST_CONSENT_VERSION, isConsentVersion } from "./consent";
import { confirmationEmail, welcomeEmail, type SubscriberLinks } from "./emails";
import { emailKey, type RateLimiter } from "./rate-limit";
import { isSuppressed, type NewsletterStore, type Subscriber } from "./store";
import type { CaptchaVerifier } from "./turnstile";
import { signToken, verifyToken } from "./token";

// The sign-up flow (plan §15.2), independent of HTTP: the route handlers in app/api/newsletter parse the request
// and call these. Every dependency is a port, so the same code runs on the in-memory dev implementations and on
// Postgres + Resend (+ Queue later).

export interface NewsletterDeps {
  store: NewsletterStore;
  sender: EmailSender;
  limiter: RateLimiter;
  /** Turnstile (TURNSTILE_SECRET_KEY); null or absent means no check. */
  captcha?: CaptchaVerifier | null;
  /** HMAC secret for the tokens (NEWSLETTER_TOKEN_SECRET). */
  secret: string;
  /** Absolute URLs for a subscriber's links, given their tokens. */
  links(tokens: { confirm: string; unsubscribe: string }): SubscriberLinks;
}

interface SubscribeInput {
  email: string;
  source: string;
  consentVersion: string;
  /** Honeypot field; people never fill it. */
  website: string;
  ip: string;
  turnstileToken?: string;
  country?: string | null;
}

type SubscribeResult =
  | { kind: "accepted" }
  | { kind: "rate-limited"; retryAfterSeconds: number }
  | { kind: "captcha-failed"; reason: "missing" | "rejected" | "unavailable" };

async function tokensFor(deps: NewsletterDeps, subscriberId: string, consentVersion?: string) {
  const [confirm, unsubscribe] = await Promise.all([
    signToken(deps.secret, { subscriberId, purpose: "confirm", consentVersion }),
    signToken(deps.secret, { subscriberId, purpose: "unsubscribe" }),
  ]);
  return deps.links({ confirm, unsubscribe });
}

async function sendWelcome(deps: NewsletterDeps, subscriber: Subscriber) {
  try {
    await deps.sender.send(await welcomeEmail(subscriber.email, await tokensFor(deps, subscriber.id)));
  } catch (e) {
    // The subscription stands either way; a missing welcome email is not worth failing it for.
    // Through log.ts: provider errors can repeat the address, which redact() masks.
    log.error("newsletter_welcome_failed", { error: e });
  }
}

/**
 * Stores a pending subscriber and sends the double opt-in email. The answer is the same whether the address is
 * new, already subscribed, suppressed, in its cool-down, over its per-address limit or a bot's (honeypot), so the
 * endpoint can't be used to test addresses, nor to flood one inbox (security review H2): per IP and per address
 * limits, Turnstile when configured, and the store's per-address cool-down.
 */
export async function subscribe(deps: NewsletterDeps, input: SubscribeInput): Promise<SubscribeResult> {
  const limit = await deps.limiter.hit("ip", input.ip);
  if (!limit.allowed) return { kind: "rate-limited", retryAfterSeconds: limit.retryAfterSeconds };
  if (deps.captcha) {
    const check = await deps.captcha.verify(input.turnstileToken, input.ip);
    if (!check.ok) return { kind: "captcha-failed", reason: check.reason };
  }
  if (input.website.trim() !== "") return { kind: "accepted" };
  // Over the per-address limit: answer as usual and send nothing.
  if (!(await deps.limiter.hit("email", await emailKey(input.email))).allowed) return { kind: "accepted" };

  const { subscriber, outcome } = await deps.store.upsertPending({
    email: input.email,
    source: input.source,
    country: input.country,
  });
  if (outcome === "send-confirmation") {
    await deps.sender.send(
      await confirmationEmail(subscriber.email, await tokensFor(deps, subscriber.id, input.consentVersion))
    );
  }
  return { kind: "accepted" };
}

type ConfirmResult = { kind: "active" } | { kind: "invalid" } | { kind: "expired" } | { kind: "not-pending" };

/**
 * Confirms a subscription from a confirm token: records the opt-in in consent_log with the consent text version
 * the person agreed to (carried in the signed token), and sends the welcome email the first time.
 */
export async function confirmSubscription(deps: NewsletterDeps, token: string): Promise<ConfirmResult> {
  const verified = await verifyToken(deps.secret, token, "confirm");
  if (!verified.ok) return { kind: verified.reason === "expired" ? "expired" : "invalid" };
  // Tokens issued before the version was put in the token were all for the first consent text.
  const consentVersion = verified.consentVersion ?? FIRST_CONSENT_VERSION;
  if (!isConsentVersion(consentVersion)) return { kind: "invalid" };
  const result = await deps.store.confirm(verified.subscriberId, { consentVersion });
  if (!result) return { kind: "invalid" };
  if (result.subscriber.status !== "active") return { kind: "not-pending" };
  if (result.changed) await sendWelcome(deps, result.subscriber);
  return { kind: "active" };
}

type UnsubscribeResult = { kind: "unsubscribed" } | { kind: "invalid" };

/** Unsubscribes from an unsubscribe token. Idempotent: a second request also answers "unsubscribed". */
export async function unsubscribeWithToken(deps: NewsletterDeps, token: string): Promise<UnsubscribeResult> {
  const verified = await verifyToken(deps.secret, token, "unsubscribe");
  if (!verified.ok) return { kind: "invalid" };
  await deps.store.unsubscribe(verified.subscriberId);
  return { kind: "unsubscribed" };
}

// ── Signed-in users (/account/email-preferences, the sign-up form's "Subscribe with your account") ──────────────

/** What a signed-in user sees. `suppressed` = the address bounced or was reported as spam: we can't mail it. */
type AccountNewsletterStatus = "none" | "pending" | "active" | "unsubscribed" | "suppressed";

interface AccountUser {
  id: string;
  /** The account's email, verified by Google at sign-in. */
  email: string;
}

const accountStatusOf = (s: Subscriber | null): AccountNewsletterStatus =>
  !s ? "none" : isSuppressed(s) ? "suppressed" : (s.status as AccountNewsletterStatus);

export async function accountStatus(store: NewsletterStore, user: AccountUser) {
  const subscriber = await store.findForUser(user.id, user.email);
  return { status: accountStatusOf(subscriber), email: subscriber?.email ?? user.email.toLowerCase() };
}

/**
 * One-click subscribe for a signed-in user: no double opt-in (the address is verified), the opt-in goes to
 * consent_log with the current consent text, and the welcome email (with one-click unsubscribe) goes out once.
 */
export async function subscribeWithAccount(
  deps: NewsletterDeps,
  user: AccountUser,
  input: { source: string; country?: string | null }
) {
  const { subscriber, changed } = await deps.store.subscribeVerified({
    email: user.email,
    userId: user.id,
    source: input.source,
    consentVersion: CURRENT_CONSENT_VERSION,
    country: input.country,
  });
  if (changed) await sendWelcome(deps, subscriber);
  return { status: accountStatusOf(subscriber), email: subscriber.email };
}

export async function unsubscribeAccount(store: NewsletterStore, user: AccountUser) {
  const subscriber = await store.findForUser(user.id, user.email);
  if (!subscriber) return { status: "none" as const, email: user.email.toLowerCase() };
  const result = await store.unsubscribe(subscriber.id);
  return { status: accountStatusOf(result?.subscriber ?? subscriber), email: subscriber.email };
}
