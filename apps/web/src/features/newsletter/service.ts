import type { EmailSender } from "../email/sender";
import { confirmationEmail, welcomeEmail, type SubscriberLinks } from "./emails";
import type { RateLimiter } from "./rate-limit";
import type { NewsletterStore } from "./store";
import { signToken, verifyToken } from "./token";

// The sign-up flow (plan §15.2), independent of HTTP: the route handlers in app/api/newsletter parse the request
// and call these. Every dependency is a port, so the same code runs on the in-memory dev implementations now and
// on Neon + Resend (+ Queue) later.

export interface NewsletterDeps {
  store: NewsletterStore;
  sender: EmailSender;
  limiter: RateLimiter;
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
}

type SubscribeResult = { kind: "accepted" } | { kind: "rate-limited"; retryAfterSeconds: number };

async function tokensFor(deps: NewsletterDeps, subscriberId: string) {
  const [confirm, unsubscribe] = await Promise.all([
    signToken(deps.secret, { subscriberId, purpose: "confirm" }),
    signToken(deps.secret, { subscriberId, purpose: "unsubscribe" }),
  ]);
  return deps.links({ confirm, unsubscribe });
}

/**
 * Stores a pending subscriber and sends the double opt-in email. The answer is the same whether the address is
 * new, already subscribed, suppressed or a bot's (honeypot), so the endpoint can't be used to test addresses.
 */
export async function subscribe(deps: NewsletterDeps, input: SubscribeInput): Promise<SubscribeResult> {
  const limit = await deps.limiter.hit(`subscribe:${input.ip}`);
  if (!limit.allowed) return { kind: "rate-limited", retryAfterSeconds: limit.retryAfterSeconds };
  if (input.website.trim() !== "") return { kind: "accepted" };

  const { subscriber, outcome } = await deps.store.upsertPending({
    email: input.email,
    source: input.source,
    consentVersion: input.consentVersion,
  });
  if (outcome === "send-confirmation") {
    await deps.sender.send(await confirmationEmail(subscriber.email, await tokensFor(deps, subscriber.id)));
  }
  return { kind: "accepted" };
}

type ConfirmResult = { kind: "active" } | { kind: "invalid" } | { kind: "expired" } | { kind: "not-pending" };

/** Confirms a subscription from a confirm token and sends the welcome email the first time. */
export async function confirmSubscription(deps: NewsletterDeps, token: string): Promise<ConfirmResult> {
  const verified = await verifyToken(deps.secret, token, "confirm");
  if (!verified.ok) return { kind: verified.reason === "expired" ? "expired" : "invalid" };
  const result = await deps.store.confirm(verified.subscriberId);
  if (!result) return { kind: "invalid" };
  if (result.subscriber.status !== "active") return { kind: "not-pending" };
  // TODO(data layer): write consent_log (kind newsletter, result.subscriber.consentVersion) when result.changed.
  if (result.changed) {
    try {
      await deps.sender.send(await welcomeEmail(result.subscriber.email, await tokensFor(deps, result.subscriber.id)));
    } catch (e) {
      // The subscription is confirmed either way; a missing welcome email is not worth failing it for.
      console.error(`[newsletter] welcome email failed: ${(e as Error).message}`);
    }
  }
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
