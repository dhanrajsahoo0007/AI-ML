// The subscriber store port (plan §15.2 "Data"). The data layer (stream K, Neon) implements NewsletterStore over
// the `newsletter_subscriber` table; until then MemoryNewsletterStore serves local runs, previews and tests.
//
// Status transitions (anything not listed leaves the subscriber unchanged):
//
//   (new)          ─upsertPending─►  pending
//   unsubscribed   ─upsertPending─►  pending            (a new sign-up is new consent)
//   pending        ─confirm──────►   active
//   pending|active ─unsubscribe──►   unsubscribed
//   any            ─suppress─────►   bounced | complained   (from Resend webhooks; never mailed again)
//
// bounced and complained are terminal: upsertPending reports them as suppressed and sends nothing.

export const SUBSCRIBER_STATUSES = ["pending", "active", "unsubscribed", "bounced", "complained"] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];
export type SuppressReason = "bounced" | "complained";

export interface Subscriber {
  id: string;
  /** Trimmed and lower-cased; unique. */
  email: string;
  status: SubscriberStatus;
  /** Where the sign-up came from, e.g. "archive" or "issue". */
  source: string;
  /** Version of the consent text the subscriber agreed to (consent.ts). */
  consentVersion: string;
  createdAt: Date;
  confirmedAt?: Date;
  unsubscribedAt?: Date;
}

export interface PendingInput {
  email: string;
  source: string;
  consentVersion: string;
}

/** The subscriber after a transition, and whether its status changed. */
export interface Transition {
  subscriber: Subscriber;
  changed: boolean;
}

/** What the caller should do after upsertPending. */
export type UpsertOutcome = "send-confirmation" | "already-active" | "suppressed";

export interface NewsletterStore {
  /** Creates or re-arms a pending subscriber. Never downgrades an active one or revives a suppressed one. */
  upsertPending(input: PendingInput): Promise<{ subscriber: Subscriber; outcome: UpsertOutcome }>;
  /** pending → active. `changed` is false when it was not pending; null for an unknown ID. */
  confirm(id: string): Promise<Transition | null>;
  /** pending | active → unsubscribed. `changed` is false when it already was not subscribed; null for an unknown ID. */
  unsubscribe(id: string): Promise<Transition | null>;
  /** Marks an address as never to be mailed again (bounce or complaint), creating it if needed. */
  suppress(email: string, reason: SuppressReason): Promise<Subscriber>;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isSuppressed = (s: Subscriber) => s.status === "bounced" || s.status === "complained";

/** In-memory store for local runs, previews and tests. State lives as long as the process. */
export class MemoryNewsletterStore implements NewsletterStore {
  private readonly byId = new Map<string, Subscriber>();
  private readonly idByEmail = new Map<string, string>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  private byEmail(email: string) {
    const id = this.idByEmail.get(email);
    return id ? this.byId.get(id) : undefined;
  }

  private create(email: string, fields: Omit<Subscriber, "id" | "email" | "createdAt">): Subscriber {
    const subscriber: Subscriber = { id: crypto.randomUUID(), email, createdAt: this.now(), ...fields };
    this.byId.set(subscriber.id, subscriber);
    this.idByEmail.set(email, subscriber.id);
    return subscriber;
  }

  async upsertPending(input: PendingInput) {
    const email = normalizeEmail(input.email);
    const existing = this.byEmail(email);
    if (!existing) {
      const subscriber = this.create(email, {
        status: "pending",
        source: input.source,
        consentVersion: input.consentVersion,
      });
      return { subscriber: { ...subscriber }, outcome: "send-confirmation" as const };
    }
    if (isSuppressed(existing)) return { subscriber: { ...existing }, outcome: "suppressed" as const };
    if (existing.status === "active") return { subscriber: { ...existing }, outcome: "already-active" as const };
    existing.status = "pending";
    existing.source = input.source;
    existing.consentVersion = input.consentVersion;
    existing.unsubscribedAt = undefined;
    return { subscriber: { ...existing }, outcome: "send-confirmation" as const };
  }

  async confirm(id: string) {
    const s = this.byId.get(id);
    if (!s) return null;
    const changed = s.status === "pending";
    if (changed) {
      s.status = "active";
      s.confirmedAt = this.now();
    }
    return { subscriber: { ...s }, changed };
  }

  async unsubscribe(id: string) {
    const s = this.byId.get(id);
    if (!s) return null;
    const changed = s.status === "pending" || s.status === "active";
    if (changed) {
      s.status = "unsubscribed";
      s.unsubscribedAt = this.now();
    }
    return { subscriber: { ...s }, changed };
  }

  async suppress(email: string, reason: SuppressReason) {
    const normalized = normalizeEmail(email);
    const existing = this.byEmail(normalized);
    if (!existing) return { ...this.create(normalized, { status: reason, source: "suppression", consentVersion: "" }) };
    existing.status = reason;
    return { ...existing };
  }
}
